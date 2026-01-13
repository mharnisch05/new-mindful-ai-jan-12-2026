-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- RLS policies for client documents bucket
-- Professionals can upload documents for their clients
CREATE POLICY "Professionals can upload documents for their clients"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id::text = (storage.foldername(name))[2]
    AND clients.therapist_id = auth.uid()
  )
);

-- Professionals can view documents for their clients
CREATE POLICY "Professionals can view their client documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id::text = (storage.foldername(name))[2]
    AND clients.therapist_id = auth.uid()
  )
);

-- Professionals can delete their client documents
CREATE POLICY "Professionals can delete their client documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id::text = (storage.foldername(name))[2]
    AND clients.therapist_id = auth.uid()
  )
);

-- Clients can view documents shared with them
CREATE POLICY "Clients can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' AND
  EXISTS (
    SELECT 1 
    FROM client_users cu
    JOIN clients c ON cu.client_id = c.id
    WHERE c.id::text = (storage.foldername(name))[2]
    AND cu.user_id = auth.uid()
  )
);