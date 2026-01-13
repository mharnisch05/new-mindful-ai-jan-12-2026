-- Drop the existing constraint
ALTER TABLE admin_overrides 
DROP CONSTRAINT IF EXISTS admin_overrides_plan_tier_check;

-- Update existing data to use 'solo'
UPDATE admin_overrides 
SET plan_tier = 'solo', 
    updated_at = now()
WHERE user_email = 'matthewharnisch@icloud.com';

-- Add new constraint that allows 'solo' and 'group'
ALTER TABLE admin_overrides 
ADD CONSTRAINT admin_overrides_plan_tier_check 
CHECK (plan_tier IN ('solo', 'group'));