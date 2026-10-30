-- Logo uploads have failed with "new row violates row-level security policy"
-- since 014 dropped the logos SELECT policy: the upload is an upsert, and
-- Storage needs to read the existing object to replace it.
-- This lets a signed-in user read only their own folder, so the bucket still
-- can't be listed. Public invoice pages keep loading logos through the bucket's
-- public URL, which doesn't go through these policies.
DROP POLICY IF EXISTS "Users can read own logo" ON storage.objects;
CREATE POLICY "Users can read own logo" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
