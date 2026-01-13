-- Add PHI access logging trigger for clients table
CREATE OR REPLACE FUNCTION log_client_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to phi_access_log
  INSERT INTO phi_access_log (
    user_id,
    entity_type,
    entity_id,
    client_id,
    access_type,
    accessed_fields
  ) VALUES (
    auth.uid(),
    'client',
    NEW.id,
    NEW.id,
    'SELECT',
    jsonb_build_object(
      'email', NEW.email IS NOT NULL,
      'phone', NEW.phone IS NOT NULL,
      'medications', NEW.medication_details IS NOT NULL,
      'diagnosis', NEW.primary_diagnosis IS NOT NULL
    )
  );
  
  RETURN TRUE;
END;
$$;

-- Update RLS policy to include access logging for client views
DROP POLICY IF EXISTS "Therapists can view own clients" ON clients;

CREATE POLICY "Therapists can view own clients"
ON clients
FOR SELECT
USING (
  auth.uid() = therapist_id 
  AND log_client_access()
);