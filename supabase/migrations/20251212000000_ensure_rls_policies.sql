-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

--
-- PROFILES POLICIES
--
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

--
-- CLIENTS POLICIES
--
DROP POLICY IF EXISTS "Therapists can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can create clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view own record" ON public.clients;

CREATE POLICY "Therapists can view own clients" ON public.clients FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = therapist_id);

-- Allow clients to view their own profile via client_users lookup
CREATE POLICY "Clients can view own record" ON public.clients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE client_users.client_id = clients.id 
    AND client_users.user_id = auth.uid()
  )
);

--
-- APPOINTMENTS POLICIES
--
DROP POLICY IF EXISTS "Therapists can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Therapists can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Therapists can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Therapists can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view own appointments" ON public.appointments;

CREATE POLICY "Therapists can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = therapist_id);

-- Allow clients to view their own appointments
CREATE POLICY "Clients can view own appointments" ON public.appointments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE client_users.client_id = appointments.client_id 
    AND client_users.user_id = auth.uid()
  )
);

--
-- SOAP NOTES POLICIES (Therapist Only)
--
DROP POLICY IF EXISTS "Therapists can view own notes" ON public.soap_notes;
DROP POLICY IF EXISTS "Therapists can create notes" ON public.soap_notes;
DROP POLICY IF EXISTS "Therapists can update own notes" ON public.soap_notes;
DROP POLICY IF EXISTS "Therapists can delete own notes" ON public.soap_notes;

CREATE POLICY "Therapists can view own notes" ON public.soap_notes FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create notes" ON public.soap_notes FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own notes" ON public.soap_notes FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own notes" ON public.soap_notes FOR DELETE USING (auth.uid() = therapist_id);

--
-- INVOICES POLICIES
--
DROP POLICY IF EXISTS "Therapists can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Therapists can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Therapists can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Therapists can delete own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients can view own invoices" ON public.invoices;

CREATE POLICY "Therapists can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = therapist_id);

-- Allow clients to view their own invoices
CREATE POLICY "Clients can view own invoices" ON public.invoices FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE client_users.client_id = invoices.client_id 
    AND client_users.user_id = auth.uid()
  )
);

--
-- CLIENT USERS POLICIES
--
DROP POLICY IF EXISTS "Clients can view own record" ON public.client_users;
DROP POLICY IF EXISTS "Therapists can view their clients records" ON public.client_users;

CREATE POLICY "Clients can view own record" ON public.client_users FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Therapists can view their clients records" ON public.client_users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_users.client_id 
    AND clients.therapist_id = auth.uid()
  )
);
