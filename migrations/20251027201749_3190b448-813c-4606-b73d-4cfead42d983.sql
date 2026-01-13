-- Create profiles table for therapist information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create soap_notes table
CREATE TABLE public.soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for clients
CREATE POLICY "Therapists can view own clients" ON public.clients FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = therapist_id);

-- RLS Policies for appointments
CREATE POLICY "Therapists can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = therapist_id);

-- RLS Policies for soap_notes
CREATE POLICY "Therapists can view own notes" ON public.soap_notes FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create notes" ON public.soap_notes FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own notes" ON public.soap_notes FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own notes" ON public.soap_notes FOR DELETE USING (auth.uid() = therapist_id);

-- RLS Policies for invoices
CREATE POLICY "Therapists can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = therapist_id);

-- Create indexes for better performance
CREATE INDEX idx_clients_therapist_id ON public.clients(therapist_id);
CREATE INDEX idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_soap_notes_therapist_id ON public.soap_notes(therapist_id);
CREATE INDEX idx_soap_notes_client_id ON public.soap_notes(client_id);
CREATE INDEX idx_invoices_therapist_id ON public.invoices(therapist_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_soap_notes_updated_at BEFORE UPDATE ON public.soap_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();