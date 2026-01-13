-- Fix INFO_LEAKAGE: Remove public access to sensitive validation tables

-- 1. Fix exposed_access_codes
-- Drop the overly permissive policy that allows anyone to view active codes
DROP POLICY IF EXISTS "Anyone can check if code exists (for validation)" ON public.client_access_codes;

-- The validate-client-code edge function already uses service role key, 
-- so no public access is needed. Service role bypasses RLS automatically.

-- 2. Fix exposed_reset_codes  
-- Drop the overly permissive policy that allows anyone to view valid reset codes
DROP POLICY IF EXISTS "Anyone can check reset code validity" ON public.password_reset_codes;

-- The reset-password-with-code edge function already uses service role key,
-- so no public access is needed. Service role bypasses RLS automatically.

-- Note: Both edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so these public policies were unnecessary security holes.