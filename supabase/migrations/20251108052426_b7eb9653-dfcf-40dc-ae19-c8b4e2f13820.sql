-- Create function to set admin role securely
CREATE OR REPLACE FUNCTION public.setup_admin_user(admin_email TEXT, admin_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin code matches
  IF admin_code != '6741YEW' THEN
    RETURN FALSE;
  END IF;
  
  -- Find user by email
  DECLARE
    user_uuid UUID;
  BEGIN
    SELECT id INTO user_uuid FROM auth.users WHERE email = admin_email;
    
    IF user_uuid IS NULL THEN
      RETURN FALSE;
    END IF;
    
    -- Remove any existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = user_uuid;
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also add professional role so admin has full access
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'professional')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN TRUE;
  END;
END;
$$;

-- Create table for admin access codes (for the 7-digit code verification)
CREATE TABLE IF NOT EXISTS public.admin_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on admin_access_codes
ALTER TABLE public.admin_access_codes ENABLE ROW LEVEL SECURITY;

-- Admin codes are verified server-side, no read access needed
CREATE POLICY "No direct access to admin codes"
  ON public.admin_access_codes
  FOR ALL
  USING (false);

-- Insert the admin access code
INSERT INTO public.admin_access_codes (code, description)
VALUES ('6741YEW', 'Main admin access code')
ON CONFLICT (code) DO NOTHING;

-- Create function to verify admin access code
CREATE OR REPLACE FUNCTION public.verify_admin_access_code(input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_access_codes
    WHERE code = input_code AND active = true
  );
END;
$$;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.setup_admin_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_access_code(TEXT) TO anon, authenticated;