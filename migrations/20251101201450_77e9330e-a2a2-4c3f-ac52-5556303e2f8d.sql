-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('professional', 'client');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add license verification fields to profiles (skip license_number as it exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMP WITH TIME ZONE;

-- Create client access codes table
CREATE TABLE public.client_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on client_access_codes
ALTER TABLE public.client_access_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_access_codes
CREATE POLICY "Professionals can view own codes"
  ON public.client_access_codes
  FOR SELECT
  USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can create codes"
  ON public.client_access_codes
  FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Anyone can check if code exists (for validation)"
  ON public.client_access_codes
  FOR SELECT
  USING (NOT used AND expires_at > now());

-- Create client_professional_links table
CREATE TABLE public.client_professional_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(client_user_id, professional_id)
);

-- Enable RLS on client_professional_links
ALTER TABLE public.client_professional_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_professional_links
CREATE POLICY "Clients can view own links"
  ON public.client_professional_links
  FOR SELECT
  USING (auth.uid() = client_user_id);

CREATE POLICY "Professionals can view own links"
  ON public.client_professional_links
  FOR SELECT
  USING (auth.uid() = professional_id);

-- Function to generate random 5-character access code
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    code := code || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$;