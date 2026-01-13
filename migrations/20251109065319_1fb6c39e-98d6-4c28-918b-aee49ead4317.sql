-- Fix relationship issues and add missing fields for full functionality

-- Add missing fields to clients table for detailed profiles
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS medications text,
ADD COLUMN IF NOT EXISTS primary_diagnosis text;

-- Create practice_settings table for logo and practice customization
CREATE TABLE IF NOT EXISTS public.practice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  practice_name text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage own practice settings"
ON public.practice_settings
FOR ALL
TO authenticated
USING (auth.uid() = therapist_id)
WITH CHECK (auth.uid() = therapist_id);

-- Create ai_actions table to track AI assistant actions
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  parameters jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI actions"
ON public.ai_actions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI actions"
ON public.ai_actions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create storage bucket for practice logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-logos', 'practice-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for practice logos
CREATE POLICY "Therapists can upload own logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view practice logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'practice-logos');

CREATE POLICY "Therapists can update own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'practice-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add trigger for practice_settings updated_at
CREATE TRIGGER update_practice_settings_updated_at
BEFORE UPDATE ON public.practice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster AI action queries
CREATE INDEX IF NOT EXISTS idx_ai_actions_user_id ON public.ai_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_status ON public.ai_actions(status);
CREATE INDEX IF NOT EXISTS idx_ai_actions_entity ON public.ai_actions(entity_type, entity_id);