-- Create SMS logs table for Twilio integration
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'undelivered')),
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SMS logs
CREATE POLICY "Therapists can view own SMS logs"
  ON public.sms_logs FOR SELECT
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can insert own SMS logs"
  ON public.sms_logs FOR INSERT
  WITH CHECK (auth.uid() = therapist_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_therapist_id ON public.sms_logs(therapist_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_logs_updated_at
  BEFORE UPDATE ON public.sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_logs_updated_at();

