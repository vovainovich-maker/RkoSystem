
-- Add image_url column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- Create storage bucket for lead attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-attachments', 'lead-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Lead attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-attachments');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload lead attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lead-attachments');

-- Authenticated users can update own files
CREATE POLICY "Authenticated users can update lead attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lead-attachments');

-- Authenticated users can delete own files
CREATE POLICY "Authenticated users can delete lead attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lead-attachments');
