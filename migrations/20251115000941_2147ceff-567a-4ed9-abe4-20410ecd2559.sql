-- Fix database function search path security issue
DROP FUNCTION IF EXISTS public.audit_sensitive_access() CASCADE;
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-apply audit triggers with fixed function
CREATE TRIGGER audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_soap_notes
AFTER INSERT OR UPDATE OR DELETE ON public.soap_notes
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

CREATE TRIGGER audit_messages
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();