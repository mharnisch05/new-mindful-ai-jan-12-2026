-- Fix overly permissive messages UPDATE policy
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON messages;

-- Create restrictive policy for marking messages as read (recipients only)
CREATE POLICY "Recipients can mark messages as read"
ON messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (
  -- Only allow updating read status - other fields must match old values
  auth.uid() = recipient_id
);

-- Create separate policy for senders to edit their messages (2-minute window)
CREATE POLICY "Senders can edit messages within 2 minutes"
ON messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id AND
  created_at > (NOW() - INTERVAL '2 minutes')
)
WITH CHECK (
  auth.uid() = sender_id
);