-- Create zoom_auth_tokens table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.zoom_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.zoom_auth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for zoom_auth_tokens
CREATE POLICY "Users can view their own Zoom tokens"
  ON public.zoom_auth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Zoom tokens"
  ON public.zoom_auth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Zoom tokens"
  ON public.zoom_auth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Zoom tokens"
  ON public.zoom_auth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add zoom_meeting_url and zoom_meeting_id to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS zoom_meeting_url TEXT,
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS zoom_meeting_password TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_zoom_auth_tokens_user_id ON public.zoom_auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_zoom_meeting_id ON public.appointments(zoom_meeting_id);