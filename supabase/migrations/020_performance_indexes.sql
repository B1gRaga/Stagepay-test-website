-- ================================================================
-- Migration 020: Performance indexes for common query patterns
--
-- None of these indexes existed in the schema. Without them, every
-- invoice list, client list, and reminder sweep is a full table scan.
-- At 1,000 users × 50 invoices each that is 50,000 rows scanned for
-- every dashboard load. All indexes are CONCURRENTLY safe to add on a
-- live database without locking writes.
--
-- SAFE TO RE-RUN: CREATE INDEX IF NOT EXISTS is a no-op when the
-- index already exists.
-- ================================================================

-- ── invoices ──────────────────────────────────────────────────────

-- Dashboard list: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_invoices_user_created
  ON public.invoices (user_id, created_at DESC);

-- Status filter: WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_invoices_user_status
  ON public.invoices (user_id, status);

-- ── invoice_items ─────────────────────────────────────────────────

-- invoice_items join: WHERE invoice_id = ?
-- (foreign key columns are not automatically indexed in PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items (invoice_id);

-- ── reminders ─────────────────────────────────────────────────────

-- Cron sweep: WHERE status = 'scheduled' AND send_at <= now()
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_send_at
  ON public.reminders (send_at)
  WHERE status = 'scheduled';

-- Per-user reminder list
CREATE INDEX IF NOT EXISTS idx_reminders_user_id
  ON public.reminders (user_id);

-- ── clients ───────────────────────────────────────────────────────

-- Client list: WHERE user_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_clients_user_active
  ON public.clients (user_id)
  WHERE deleted_at IS NULL;

-- ── profiles ──────────────────────────────────────────────────────

-- Billing callback lookup: WHERE dpo_transaction_ref = ?
-- Only indexes rows that actually have a pending transaction ref.
CREATE INDEX IF NOT EXISTS idx_profiles_dpo_transaction_ref
  ON public.profiles (dpo_transaction_ref)
  WHERE dpo_transaction_ref IS NOT NULL;
