-- Add release_of_information field to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS release_of_information BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS medication_details TEXT;