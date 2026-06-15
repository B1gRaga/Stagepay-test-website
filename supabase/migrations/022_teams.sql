-- ================================================================
-- Migration 022: Multi-user teams (Business plan)
-- SAFE TO RE-RUN: drops and recreates tables + policies cleanly.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop in reverse dependency order so re-runs are safe
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Remove team_id from profiles if it exists (will re-add below)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS team_id;

-- ── TEAMS ─────────────────────────────────────────────────────────────────────
CREATE TABLE public.teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'My Team',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_owner_all" ON public.teams
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── TEAM MEMBERS ──────────────────────────────────────────────────────────────
CREATE TABLE public.team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at    TIMESTAMPTZ,
  UNIQUE (team_id, email)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_owner_all" ON public.team_members
  FOR ALL TO authenticated
  USING  (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()));

CREATE POLICY "team_members_self_read" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "team_members_token_lookup" ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (status = 'pending' AND invite_token IS NOT NULL);

-- Safe to add now — team_members exists
CREATE POLICY "teams_member_read" ON public.teams
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ── ADD team_id TO PROFILES ───────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
