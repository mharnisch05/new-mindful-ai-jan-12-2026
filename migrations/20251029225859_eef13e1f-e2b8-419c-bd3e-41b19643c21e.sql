-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add foreign key constraints for data integrity

-- Link profiles to auth.users
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_auth_users
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Link clients to therapists
ALTER TABLE public.clients
ADD CONSTRAINT fk_clients_therapist
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Link appointments to clients and therapists
ALTER TABLE public.appointments
ADD CONSTRAINT fk_appointments_client
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
ADD CONSTRAINT fk_appointments_therapist
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Link soap_notes to clients and therapists
ALTER TABLE public.soap_notes
ADD CONSTRAINT fk_soap_notes_client
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.soap_notes
ADD CONSTRAINT fk_soap_notes_therapist
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Link invoices to clients and therapists
ALTER TABLE public.invoices
ADD CONSTRAINT fk_invoices_client
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
ADD CONSTRAINT fk_invoices_therapist
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Link reminders to therapists
ALTER TABLE public.reminders
ADD CONSTRAINT fk_reminders_therapist
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;