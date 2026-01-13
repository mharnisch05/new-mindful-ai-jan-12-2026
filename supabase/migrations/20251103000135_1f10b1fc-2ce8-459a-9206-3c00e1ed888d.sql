-- Fix 1: Add recipient_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id);

-- Fix 2: Drop existing messages RLS policies and create proper ones
DROP POLICY IF EXISTS "Therapists can send messages" ON messages;
DROP POLICY IF EXISTS "Clients can send messages" ON messages;
DROP POLICY IF EXISTS "Therapists can view their messages" ON messages;
DROP POLICY IF EXISTS "Clients can view their messages" ON messages;
DROP POLICY IF EXISTS "Therapists can mark messages read" ON messages;
DROP POLICY IF EXISTS "Clients can mark messages read" ON messages;

-- New RLS policies for messages with proper sender validation
CREATE POLICY "Therapists can send to own clients"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND sender_type = 'therapist'
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = messages.client_id
    AND clients.therapist_id = auth.uid()
  )
);

CREATE POLICY "Clients can send to linked professionals"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND sender_type = 'client'
  AND EXISTS (
    SELECT 1 FROM client_professional_links
    WHERE client_professional_links.client_user_id = auth.uid()
    AND client_professional_links.professional_id = messages.therapist_id
  )
);

CREATE POLICY "Users can read their own messages"
ON messages FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

CREATE POLICY "Users can mark their received messages as read"
ON messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Fix 3: Fix admin_overrides RLS policy
DROP POLICY IF EXISTS "Allow read access to admin overrides" ON admin_overrides;

-- Only service role can read (for backend checks)
CREATE POLICY "Service role can read admin overrides"
ON admin_overrides FOR SELECT
USING (auth.role() = 'service_role');

-- Users can only see their own override
CREATE POLICY "Users can view own admin override"
ON admin_overrides FOR SELECT
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Fix 4: Create table for rate limiting code validation attempts
CREATE TABLE IF NOT EXISTS code_validation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  code_attempted text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_code_validation_attempts_ip_time 
ON code_validation_attempts(ip_address, created_at DESC);

-- Enable RLS on code_validation_attempts
ALTER TABLE code_validation_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage validation attempts
CREATE POLICY "Service role can insert validation attempts"
ON code_validation_attempts FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read validation attempts"
ON code_validation_attempts FOR SELECT
USING (auth.role() = 'service_role');