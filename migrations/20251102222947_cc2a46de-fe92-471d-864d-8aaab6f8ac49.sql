-- Add email notification setting to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_via_email BOOLEAN DEFAULT true;