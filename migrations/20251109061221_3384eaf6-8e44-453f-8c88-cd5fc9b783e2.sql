-- Phase 8: Notes Enhancement - Add note templates and export functionality

-- Create note templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subjective_template TEXT,
  objective_template TEXT,
  assessment_template TEXT,
  plan_template TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note templates
CREATE POLICY "Therapists can view own templates"
  ON public.note_templates FOR SELECT
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can create templates"
  ON public.note_templates FOR INSERT
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Therapists can update own templates"
  ON public.note_templates FOR UPDATE
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can delete own templates"
  ON public.note_templates FOR DELETE
  USING (auth.uid() = therapist_id);

-- Add trigger for updated_at
CREATE TRIGGER update_note_templates_updated_at
  BEFORE UPDATE ON public.note_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 9: Practice Management - Enhance admin capabilities

-- Create system settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can manage system settings
CREATE POLICY "Service role can manage system settings"
  ON public.system_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Phase 10: Integrations - Add integration configurations

-- Create integration settings table
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('zoom', 'google_calendar', 'outlook', 'stripe', 'twilio')),
  is_enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  credentials_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(therapist_id, integration_type)
);

-- Enable RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration settings
CREATE POLICY "Therapists can view own integrations"
  ON public.integration_settings FOR SELECT
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can manage own integrations"
  ON public.integration_settings FOR ALL
  USING (auth.uid() = therapist_id);

-- Create zoom meetings table
CREATE TABLE IF NOT EXISTS public.zoom_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  meeting_id TEXT NOT NULL,
  join_url TEXT NOT NULL,
  start_url TEXT NOT NULL,
  password TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'started', 'ended', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zoom meetings
CREATE POLICY "Therapists can view own zoom meetings"
  ON public.zoom_meetings FOR SELECT
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can manage own zoom meetings"
  ON public.zoom_meetings FOR ALL
  USING (auth.uid() = therapist_id);

-- Clients can view their zoom meetings
CREATE POLICY "Clients can view their zoom meetings"
  ON public.zoom_meetings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = zoom_meetings.client_id
    AND client_users.user_id = auth.uid()
  ));

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  appointment_reminders BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  billing_notifications BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_templates_therapist ON public.note_templates(therapist_id);
CREATE INDEX IF NOT EXISTS idx_integration_settings_therapist ON public.integration_settings(therapist_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_appointment ON public.zoom_meetings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_therapist ON public.zoom_meetings(therapist_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);