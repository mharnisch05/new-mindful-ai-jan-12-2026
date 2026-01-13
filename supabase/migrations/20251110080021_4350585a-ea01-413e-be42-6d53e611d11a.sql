-- Remove license_number and add official_title to profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS license_number;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS license_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS license_verified_at;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS official_title text;

COMMENT ON COLUMN public.profiles.official_title IS 'Professional title: Doctor, Therapist, Counselor, etc.';