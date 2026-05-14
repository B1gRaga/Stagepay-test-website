-- ================================================================
-- Migration 018: Storage RLS policies for invoice-pdfs bucket
--
-- The invoice-pdfs bucket was created in migration 004 with
-- public = true but zero storage RLS policies. Without policies,
-- any authenticated or even anon caller can:
--   - Upload files to any path in the bucket
--   - List all files via the Storage REST API (enumerating all PDFs)
--   - Delete any file regardless of ownership
--
-- This migration adds row-level policies on storage.objects so that:
--   - Only the owning user (folder prefix = auth.uid()) can
--     upload, list, update, or delete their own files
--   - Public CDN reads continue to work — Twilio's mediaUrl requires
--     a publicly accessible URL. Bucket-level public access (set at
--     bucket creation) is independent of storage RLS and is unaffected
--     by these policies.
--   - service_role bypasses RLS by default and continues to work
--     for server-side uploads in app/api/whatsapp/send/route.ts.
--
-- Storage path convention enforced here:
--   {user_id}/{filename}   e.g. "abc-123-uuid/INV-202505-001.pdf"
--   storage.foldername(name)[1] extracts the first path segment.
--
-- SAFE TO RE-RUN: DROP POLICY IF EXISTS is a no-op when the policy
-- does not exist.
-- ================================================================

-- ── Remove any pre-existing policies to ensure idempotency ────────
DROP POLICY IF EXISTS "invoice-pdfs: authenticated upload own folder" ON storage.objects;
DROP POLICY IF EXISTS "invoice-pdfs: authenticated select own"         ON storage.objects;
DROP POLICY IF EXISTS "invoice-pdfs: authenticated update own"         ON storage.objects;
DROP POLICY IF EXISTS "invoice-pdfs: authenticated delete own"         ON storage.objects;

-- ── INSERT: owners may upload only into their own folder ──────────
CREATE POLICY "invoice-pdfs: authenticated upload own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── SELECT: owners may list their own files via the Storage API ───
-- (Public CDN GET requests bypass this policy — they are served
--  directly by the storage CDN when bucket is public.)
CREATE POLICY "invoice-pdfs: authenticated select own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── UPDATE: owners may overwrite (upsert) their own files ─────────
CREATE POLICY "invoice-pdfs: authenticated update own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── DELETE: owners may delete their own files only ────────────────
CREATE POLICY "invoice-pdfs: authenticated delete own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
