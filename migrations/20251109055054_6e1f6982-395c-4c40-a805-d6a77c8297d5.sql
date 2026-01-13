-- Phase 4 & 5: Security, HIPAA, and Communication Features

-- Note Version History for audit compliance
CREATE TABLE public.soap_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.soap_notes(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_summary TEXT
);

ALTER TABLE public.soap_note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view note versions"
ON public.soap_note_versions FOR SELECT
TO authenticated
USING (auth.uid() = therapist_id);

CREATE POLICY "Service role can insert note versions"
ON public.soap_note_versions FOR INSERT
TO service_role
WITH CHECK (true);

-- Two-Factor Authentication Setup
CREATE TABLE public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  secret TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own 2FA"
ON public.user_2fa FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Session Management
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions"
ON public.user_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Telehealth Sessions
CREATE TABLE public.telehealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  client_id UUID NOT NULL,
  room_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage own telehealth sessions"
ON public.telehealth_sessions FOR ALL
TO authenticated
USING (auth.uid() = therapist_id)
WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Clients can view their telehealth sessions"
ON public.telehealth_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = telehealth_sessions.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Email Notification Queue
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  notification_type TEXT NOT NULL,
  related_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email queue"
ON public.email_queue FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_soap_note_versions_note_id ON public.soap_note_versions(note_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_telehealth_sessions_appointment ON public.telehealth_sessions(appointment_id);
CREATE INDEX idx_telehealth_sessions_therapist ON public.telehealth_sessions(therapist_id);
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON public.email_queue(scheduled_for);

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now();
END;
$$;

-- Function to create note version on update
CREATE OR REPLACE FUNCTION public.create_note_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_number INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM public.soap_note_versions
  WHERE note_id = OLD.id;
  
  -- Insert version record
  INSERT INTO public.soap_note_versions (
    note_id,
    therapist_id,
    version_number,
    subjective,
    objective,
    assessment,
    plan,
    edited_by
  ) VALUES (
    OLD.id,
    OLD.therapist_id,
    v_version_number,
    OLD.subjective,
    OLD.objective,
    OLD.assessment,
    OLD.plan,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create note versions
CREATE TRIGGER soap_notes_version_trigger
BEFORE UPDATE ON public.soap_notes
FOR EACH ROW
EXECUTE FUNCTION public.create_note_version();