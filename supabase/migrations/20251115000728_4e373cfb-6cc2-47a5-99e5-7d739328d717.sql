-- Additional RLS hardening for critical tables
-- Ensure no public access to sensitive data

-- Add stricter policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Ensure clients can NEVER access other clients' data
DROP POLICY IF EXISTS "Therapists can view own clients" ON public.clients;
CREATE POLICY "Therapists can view own clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = therapist_id);

-- Lock down SOAP notes to only therapist who created them
DROP POLICY IF EXISTS "Therapists can view own soap notes" ON public.soap_notes;
CREATE POLICY "Therapists can view own soap notes" 
ON public.soap_notes 
FOR SELECT 
USING (auth.uid() = therapist_id);

-- Restrict message access to sender/recipient only
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
CREATE POLICY "Users can read their own messages" 
ON public.messages 
FOR SELECT 
USING (
  (auth.uid() = sender_id) OR 
  (auth.uid() = recipient_id) OR
  (EXISTS (
    SELECT 1 FROM clients WHERE id = messages.client_id AND therapist_id = auth.uid()
  ))
);

-- Secure shared documents
DROP POLICY IF EXISTS "Therapists can view own shared documents" ON public.shared_documents;
CREATE POLICY "Therapists can view own shared documents" 
ON public.shared_documents 
FOR SELECT 
USING (auth.uid() = therapist_id);

-- Add policy for clients to view their own documents
CREATE POLICY "Clients can view their own documents" 
ON public.shared_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_users 
    WHERE client_users.client_id = shared_documents.client_id 
    AND client_users.user_id = auth.uid()
  )
);

-- Secure progress paths
DROP POLICY IF EXISTS "Therapists can view own progress paths" ON public.progress_paths;
CREATE POLICY "Therapists can view own progress paths" 
ON public.progress_paths 
FOR SELECT 
USING (auth.uid() = therapist_id);

-- Add audit trigger for all sensitive table access
CREATE OR REPLACE FUNCTION audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    success
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    true
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to all PHI tables
DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_soap_notes ON public.soap_notes;
CREATE TRIGGER audit_soap_notes
AFTER INSERT OR UPDATE OR DELETE ON public.soap_notes
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_messages ON public.messages;
CREATE TRIGGER audit_messages
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();