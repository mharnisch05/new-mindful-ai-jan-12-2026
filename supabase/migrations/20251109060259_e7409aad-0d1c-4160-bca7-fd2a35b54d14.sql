-- Add recurring appointment support
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS confirmed_by_client BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Create appointment conflicts table
CREATE TABLE IF NOT EXISTS public.appointment_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  conflict_with_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create calendar preferences table
CREATE TABLE IF NOT EXISTS public.calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL UNIQUE,
  working_hours JSONB NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"17:00"},"tuesday":{"start":"09:00","end":"17:00"},"wednesday":{"start":"09:00","end":"17:00"},"thursday":{"start":"09:00","end":"17:00"},"friday":{"start":"09:00","end":"17:00"}}'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  default_appointment_duration INTEGER NOT NULL DEFAULT 60,
  buffer_time INTEGER NOT NULL DEFAULT 15,
  allow_back_to_back BOOLEAN NOT NULL DEFAULT false,
  max_daily_appointments INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on appointment conflicts
ALTER TABLE public.appointment_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view own appointment conflicts"
  ON public.appointment_conflicts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_conflicts.appointment_id
    AND appointments.therapist_id = auth.uid()
  ));

CREATE POLICY "Service role can manage conflicts"
  ON public.appointment_conflicts FOR ALL
  USING (auth.role() = 'service_role');

-- Enable RLS on calendar preferences
ALTER TABLE public.calendar_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage own calendar preferences"
  ON public.calendar_preferences FOR ALL
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence ON public.appointments(parent_appointment_id) WHERE parent_appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointment_conflicts_appointment ON public.appointment_conflicts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_calendar_preferences_therapist ON public.calendar_preferences(therapist_id);

-- Add triggers
CREATE TRIGGER update_calendar_preferences_updated_at
  BEFORE UPDATE ON public.calendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to detect appointment conflicts
CREATE OR REPLACE FUNCTION public.detect_appointment_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  conflict_record RECORD;
BEGIN
  -- Check for overlapping appointments with same therapist
  FOR conflict_record IN
    SELECT a.id, a.appointment_date, a.duration_minutes
    FROM public.appointments a
    WHERE a.therapist_id = NEW.therapist_id
    AND a.id != NEW.id
    AND a.status != 'cancelled'
    AND (
      (NEW.appointment_date >= a.appointment_date 
       AND NEW.appointment_date < a.appointment_date + (a.duration_minutes || ' minutes')::interval)
      OR
      (NEW.appointment_date + (NEW.duration_minutes || ' minutes')::interval > a.appointment_date
       AND NEW.appointment_date + (NEW.duration_minutes || ' minutes')::interval <= a.appointment_date + (a.duration_minutes || ' minutes')::interval)
      OR
      (NEW.appointment_date <= a.appointment_date
       AND NEW.appointment_date + (NEW.duration_minutes || ' minutes')::interval >= a.appointment_date + (a.duration_minutes || ' minutes')::interval)
    )
  LOOP
    -- Insert conflict record
    INSERT INTO public.appointment_conflicts (appointment_id, conflict_with_id, conflict_type)
    VALUES (NEW.id, conflict_record.id, 'time_overlap')
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for conflict detection
DROP TRIGGER IF EXISTS check_appointment_conflicts ON public.appointments;
CREATE TRIGGER check_appointment_conflicts
  AFTER INSERT OR UPDATE OF appointment_date, duration_minutes, therapist_id, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_appointment_conflicts();