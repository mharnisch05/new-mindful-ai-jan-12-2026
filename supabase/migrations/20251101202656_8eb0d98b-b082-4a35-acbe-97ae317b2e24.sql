-- Add unread tracking to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- Create index for faster unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(client_id, read) WHERE read = false;