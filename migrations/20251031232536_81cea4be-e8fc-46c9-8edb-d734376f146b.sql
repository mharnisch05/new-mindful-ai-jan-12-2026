-- Add DELETE policy for profiles table to support GDPR/CCPA compliance
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);

-- Update user_settings table default values to be privacy-first
-- Change dashboard_widgets_visible default to hide PHI by default
ALTER TABLE user_settings 
ALTER COLUMN dashboard_widgets_visible 
SET DEFAULT '{"charts": false, "reminders": false, "appointments": false, "quick_actions": true, "recent_notes": false}'::jsonb;