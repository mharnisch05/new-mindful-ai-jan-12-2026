-- Create admin_overrides table for granting special access
CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('pro', 'pro_plus')),
  grant_client_portal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_overrides ENABLE ROW LEVEL SECURITY;

-- Allow reading admin overrides (used by check-subscription function)
CREATE POLICY "Allow read access to admin overrides"
ON public.admin_overrides
FOR SELECT
TO authenticated
USING (true);

-- Insert the admin user with full access
INSERT INTO public.admin_overrides (user_email, plan_tier, grant_client_portal)
VALUES ('matthewharnisch@icloud.com', 'pro_plus', true)
ON CONFLICT (user_email) DO UPDATE
SET plan_tier = 'pro_plus', grant_client_portal = true, updated_at = now();