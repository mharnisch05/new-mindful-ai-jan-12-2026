-- Add columns for message editing and unsending
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_unsent BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_content TEXT;

-- Add table for appointment requests from clients
CREATE TABLE IF NOT EXISTS appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  requested_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, denied
  therapist_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on appointment_requests
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

-- Policies for appointment requests
CREATE POLICY "Clients can create appointment requests"
  ON appointment_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = appointment_requests.client_id
      AND client_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their requests"
  ON appointment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = appointment_requests.client_id
      AND client_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can view requests to them"
  ON appointment_requests FOR SELECT
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can update requests to them"
  ON appointment_requests FOR UPDATE
  USING (auth.uid() = therapist_id);

-- Add update trigger
CREATE TRIGGER update_appointment_requests_updated_at
BEFORE UPDATE ON appointment_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add columns to track progress path updates
ALTER TABLE progress_paths ADD COLUMN IF NOT EXISTS last_updated_by UUID;
ALTER TABLE progress_paths ADD COLUMN IF NOT EXISTS has_unread_updates BOOLEAN DEFAULT FALSE;

ALTER TABLE progress_goals ADD COLUMN IF NOT EXISTS last_updated_by UUID;
ALTER TABLE progress_goals ADD COLUMN IF NOT EXISTS has_unread_updates BOOLEAN DEFAULT FALSE;

ALTER TABLE progress_milestones ADD COLUMN IF NOT EXISTS last_updated_by UUID;
ALTER TABLE progress_milestones ADD COLUMN IF NOT EXISTS has_unread_updates BOOLEAN DEFAULT FALSE;

ALTER TABLE progress_tools ADD COLUMN IF NOT EXISTS last_updated_by UUID;
ALTER TABLE progress_tools ADD COLUMN IF NOT EXISTS has_unread_updates BOOLEAN DEFAULT FALSE;
ALTER TABLE progress_tools ADD COLUMN IF NOT EXISTS editable_data JSONB DEFAULT '{}'::jsonb;