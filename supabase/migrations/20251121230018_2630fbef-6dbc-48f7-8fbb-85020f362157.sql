-- Add new required fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS gender_pronouns TEXT,
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_group_number TEXT;

-- Create client_contacts table for related professionals/caregivers
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on client_contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_contacts
CREATE POLICY "Therapists can manage their clients' contacts"
ON public.client_contacts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_contacts.client_id
    AND clients.therapist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_contacts.client_id
    AND clients.therapist_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON public.client_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();