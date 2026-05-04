-- Migration 003: Add email delivery tracking columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_to      TEXT;
