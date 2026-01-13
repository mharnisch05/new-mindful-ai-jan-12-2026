-- Make the client-documents bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'client-documents';

-- Add file_path column to shared_documents table
ALTER TABLE public.shared_documents 
ADD COLUMN IF NOT EXISTS file_path text;

-- Update existing records to extract file path from URL if needed
UPDATE public.shared_documents 
SET file_path = SUBSTRING(file_url FROM 'client-documents/(.+)$')
WHERE file_path IS NULL AND file_url IS NOT NULL;

-- Add RLS policies to storage.objects for client-documents bucket

-- Only therapists can upload to their own client folders
CREATE POLICY "Therapists can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Only therapist who uploaded or linked client can download
CREATE POLICY "Authorized users can download documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (
    -- Therapist who uploaded (first folder is their user_id)
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Client who is linked to this folder
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
      AND (storage.foldername(name))[2] = cu.client_id::text
    )
  )
);

-- Therapists can delete their own client documents
CREATE POLICY "Therapists can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);