-- Create telehealth_sessions table
CREATE TABLE public.telehealth_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  room_url TEXT NOT NULL,
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  recording_url TEXT,
  session_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;

-- Therapist can view their own sessions
CREATE POLICY "Therapists can view their own telehealth sessions"
ON public.telehealth_sessions
FOR SELECT
USING (auth.uid() = therapist_id);

-- Therapist can create sessions
CREATE POLICY "Therapists can create telehealth sessions"
ON public.telehealth_sessions
FOR INSERT
WITH CHECK (auth.uid() = therapist_id);

-- Therapist can update their own sessions
CREATE POLICY "Therapists can update their own telehealth sessions"
ON public.telehealth_sessions
FOR UPDATE
USING (auth.uid() = therapist_id);

-- Therapist can delete their own sessions
CREATE POLICY "Therapists can delete their own telehealth sessions"
ON public.telehealth_sessions
FOR DELETE
USING (auth.uid() = therapist_id);

-- Add updated_at trigger
CREATE TRIGGER update_telehealth_sessions_updated_at
BEFORE UPDATE ON public.telehealth_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add telehealth_enabled column to appointments
ALTER TABLE public.appointments
ADD COLUMN telehealth_enabled BOOLEAN DEFAULT false;

-- Add waiting_room table for client check-ins
CREATE TABLE public.telehealth_waiting_room (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for waiting room
ALTER TABLE public.telehealth_waiting_room ENABLE ROW LEVEL SECURITY;

-- Therapists can view waiting room for their sessions
CREATE POLICY "Therapists can view waiting room"
ON public.telehealth_waiting_room
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.telehealth_sessions
    WHERE id = session_id AND therapist_id = auth.uid()
  )
);

-- Therapists can update waiting room status
CREATE POLICY "Therapists can update waiting room"
ON public.telehealth_waiting_room
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.telehealth_sessions
    WHERE id = session_id AND therapist_id = auth.uid()
  )
);