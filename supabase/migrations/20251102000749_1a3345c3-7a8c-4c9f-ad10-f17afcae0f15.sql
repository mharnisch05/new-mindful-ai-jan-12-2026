-- Create table for storing Zoom OAuth tokens
CREATE TABLE IF NOT EXISTS public.zoom_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoom_auth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own Zoom tokens"
ON public.zoom_auth_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Zoom tokens"
ON public.zoom_auth_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Zoom tokens"
ON public.zoom_auth_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Zoom tokens"
ON public.zoom_auth_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Update trigger for zoom_auth_tokens
CREATE TRIGGER update_zoom_auth_tokens_updated_at
BEFORE UPDATE ON public.zoom_auth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add zoom_meeting_id to telehealth_sessions
ALTER TABLE public.telehealth_sessions
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS zoom_password TEXT;