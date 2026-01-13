-- Remove telehealth columns from appointments table
ALTER TABLE appointments DROP COLUMN IF EXISTS telehealth_enabled;

-- Drop telehealth tables
DROP TABLE IF EXISTS telehealth_waiting_room;
DROP TABLE IF EXISTS telehealth_sessions;

-- Remove telehealth from subscription features
-- (This is handled in code, not database)