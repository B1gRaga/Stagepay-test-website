-- Migration 005: Add 2FA columns to profiles
-- Run in Supabase SQL Editor → paste & run
--
-- Adds two_fa_enabled and totp_secret so that 2FA state is
-- persisted across sessions.  logo_url already exists (002).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_secret    TEXT;
