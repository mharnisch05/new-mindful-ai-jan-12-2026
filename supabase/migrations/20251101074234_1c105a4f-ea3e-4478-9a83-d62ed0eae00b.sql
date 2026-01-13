-- Create client_users table for client authentication
CREATE TABLE public.client_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Clients can view their own record
CREATE POLICY "Clients can view own record"
ON public.client_users
FOR SELECT
USING (auth.uid() = user_id);

-- Therapists can view their clients' records
CREATE POLICY "Therapists can view their clients records"
ON public.client_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_users.client_id 
    AND clients.therapist_id = auth.uid()
  )
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('therapist', 'client')),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Therapists can view messages for their clients
CREATE POLICY "Therapists can view their messages"
ON public.messages
FOR SELECT
USING (auth.uid() = therapist_id);

-- Clients can view their own messages
CREATE POLICY "Clients can view their messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = messages.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Therapists can send messages
CREATE POLICY "Therapists can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = therapist_id 
  AND sender_type = 'therapist'
);

-- Clients can send messages
CREATE POLICY "Clients can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = messages.client_id
    AND client_users.user_id = auth.uid()
  )
  AND sender_type = 'client'
);

-- Therapists can mark messages as read
CREATE POLICY "Therapists can mark messages read"
ON public.messages
FOR UPDATE
USING (auth.uid() = therapist_id);

-- Clients can mark messages as read
CREATE POLICY "Clients can mark messages read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = messages.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Create shared_documents table
CREATE TABLE public.shared_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('therapist', 'client')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

-- Therapists can view documents for their clients
CREATE POLICY "Therapists can view client documents"
ON public.shared_documents
FOR SELECT
USING (auth.uid() = therapist_id);

-- Clients can view their own documents
CREATE POLICY "Clients can view their documents"
ON public.shared_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = shared_documents.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Therapists can upload documents
CREATE POLICY "Therapists can upload documents"
ON public.shared_documents
FOR INSERT
WITH CHECK (auth.uid() = therapist_id AND uploaded_by = 'therapist');

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;