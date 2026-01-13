-- Add migration notification tracking and audit logging enhancements for HIPAA compliance

-- Add migration_dismissed tracking to user_onboarding
ALTER TABLE user_onboarding 
ADD COLUMN IF NOT EXISTS migration_dismissed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS migration_first_shown_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS migration_last_dismissed_at TIMESTAMP WITH TIME ZONE;

-- Create PHI access log table for HIPAA compliance
CREATE TABLE IF NOT EXISTS phi_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'read', 'write', 'delete', 'export'
  entity_type TEXT NOT NULL, -- 'client', 'soap_note', 'appointment', 'invoice', etc.
  entity_id UUID,
  client_id UUID, -- Always track which client's data was accessed
  justification TEXT, -- Required reason for access
  ip_address TEXT,
  user_agent TEXT,
  accessed_fields JSONB, -- Which specific fields were accessed for data minimization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on PHI access log
ALTER TABLE phi_access_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role and user themselves to view their PHI access logs
CREATE POLICY "Users can view own PHI access logs"
ON phi_access_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert PHI access logs"
ON phi_access_log FOR INSERT
TO service_role
WITH CHECK (TRUE);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_phi_access_log_user_id ON phi_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_client_id ON phi_access_log(client_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_created_at ON phi_access_log(created_at DESC);

-- Create audit log export function
CREATE OR REPLACE FUNCTION export_user_audit_logs(p_user_id UUID, p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS TABLE (
  log_timestamp TIMESTAMP WITH TIME ZONE,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  success BOOLEAN,
  details JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.timestamp AS log_timestamp,
    al.action,
    al.entity_type,
    al.entity_id,
    al.success,
    jsonb_build_object(
      'old_values', al.old_values,
      'new_values', al.new_values,
      'error_message', al.error_message,
      'ip_address', al.ip_address,
      'user_agent', al.user_agent
    ) as details
  FROM audit_logs al
  WHERE al.user_id = p_user_id
    AND (p_start_date IS NULL OR al.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR al.timestamp <= p_end_date)
  ORDER BY al.timestamp DESC;
END;
$$;

-- Create PHI access log export function
CREATE OR REPLACE FUNCTION export_phi_access_logs(p_user_id UUID, p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS TABLE (
  log_timestamp TIMESTAMP WITH TIME ZONE,
  access_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  client_id UUID,
  justification TEXT,
  accessed_fields JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pal.created_at AS log_timestamp,
    pal.access_type,
    pal.entity_type,
    pal.entity_id,
    pal.client_id,
    pal.justification,
    pal.accessed_fields
  FROM phi_access_log pal
  WHERE pal.user_id = p_user_id
    AND (p_start_date IS NULL OR pal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pal.created_at <= p_end_date)
  ORDER BY pal.created_at DESC;
END;
$$;

-- Add breach detection trigger
CREATE OR REPLACE FUNCTION detect_suspicious_phi_access()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  recent_access_count INTEGER;
BEGIN
  -- Check for rapid PHI access (more than 20 accesses in 5 minutes)
  SELECT COUNT(*) INTO recent_access_count
  FROM phi_access_log
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '5 minutes';
    
  IF recent_access_count > 20 THEN
    -- Log security event
    INSERT INTO audit_logs (user_id, action, entity_type, success, new_values)
    VALUES (
      NEW.user_id,
      'SUSPICIOUS_PHI_ACCESS',
      'security',
      FALSE,
      jsonb_build_object(
        'access_count', recent_access_count,
        'time_window', '5 minutes',
        'alert', 'Potential breach detected - excessive PHI access'
      )
    );
    
    -- Create notification for user
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Security Alert',
      'Unusual PHI access pattern detected. Please review your recent activity.',
      'warning'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_detect_suspicious_phi_access ON phi_access_log;
CREATE TRIGGER trigger_detect_suspicious_phi_access
AFTER INSERT ON phi_access_log
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_phi_access();