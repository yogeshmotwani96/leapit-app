-- 1. Create the Storage Bucket for Proof of Presence
-- Note: This requires 'storage' permissions. If you see an error, make sure you are in the SQL Editor.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proof-of-presence', 'proof-of-presence', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access (SELECT) to shots
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'proof-of-presence');

-- 3. Allow Service Role / Authenticated users to Upload
-- We use unique folders per user id for security.
CREATE POLICY "Users can upload snapshots" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'proof-of-presence');

-- 4. Allow Users to Update/Delete their own snapshots (Optional Management)
CREATE POLICY "Users can manage shots" 
ON storage.objects FOR ALL 
USING (bucket_id = 'proof-of-presence' AND auth.uid()::text = (storage.foldername(name))[1]);
