-- Fix shared_documents file_url to be nullable (use file_path for security)
ALTER TABLE public.shared_documents 
ALTER COLUMN file_url DROP NOT NULL;

-- Add index on file_path for better performance
CREATE INDEX IF NOT EXISTS idx_shared_documents_file_path ON public.shared_documents(file_path);