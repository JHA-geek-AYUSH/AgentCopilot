-- ============================================================
-- AgentOS — Persistent Agents + NANDA publishing
-- Migration: 0001_agents
-- Adds the `agents` table that backs /agent saved agents and the
-- self-hosted NANDA registry surface (/api/nanda/*).
-- Safe to run multiple times.
-- ============================================================

create extension if not exists pgcrypto;

-- --- Enums (idempotent) -------------------------------------
do $$ begin
  create type agent_run_mode as enum ('continuous', 'timed', 'interval');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_visibility as enum ('private', 'unlisted', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_nanda_status as enum ('draft', 'publishing', 'published', 'failed', 'unpublished');
exception when duplicate_object then null; end $$;

-- --- Table --------------------------------------------------
create table if not exists public.agents (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,                 -- Clerk user id (auth().userId)
  slug               text not null,                 -- URN-safe, unique per org
  name               text not null,
  description        text not null default '',
  task_template      text not null,                 -- the natural-language task
  run_mode           agent_run_mode not null default 'interval',
  run_config         jsonb not null default '{}',   -- { intervalSeconds | durationMinutes | intervalMinutes }
  required_apps      text[] not null default '{}',  -- Composio app slugs the agent needs (gmail, github, ...)
  capabilities       jsonb not null default '{}',   -- { streaming, memory, selfCorrect, ... }
  skills             jsonb not null default '[]',   -- A2A skills[]
  input_modes        text[] not null default '{text/plain}',
  output_modes       text[] not null default '{text/plain,application/json}',
  tags               text[] not null default '{}',
  version            text not null default '0.1.0',
  visibility         agent_visibility not null default 'private',
  nanda_status       agent_nanda_status not null default 'draft',
  nanda_identifier   text,                          -- == slug once published
  nanda_registry_url text,                          -- base it was published under
  card               jsonb,                         -- cached A2A card
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists agents_org_slug_uniq on public.agents (slug);  -- org-global slug
create index if not exists agents_user_idx   on public.agents (user_id);
create index if not exists agents_public_idx on public.agents (visibility) where visibility = 'public';

-- --- updated_at trigger -------------------------------------
create or replace function public.agents_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.agents_set_updated_at();

-- --- RLS ----------------------------------------------------
-- NOTE: this app authenticates with Clerk and serves all DB access through
-- service-role API routes (which enforce ownership in code). RLS stays enabled
-- so the table is never directly reachable by the anon key. The owner policy
-- below is the Supabase-Auth shape documented in the PRD; it is a no-op for the
-- service role (which bypasses RLS) but keeps the table locked down otherwise.
alter table public.agents enable row level security;

drop policy if exists agents_owner_all on public.agents;
create policy agents_owner_all on public.agents
  using (auth.jwt() ->> 'sub' = user_id)
  with check (auth.jwt() ->> 'sub' = user_id);
