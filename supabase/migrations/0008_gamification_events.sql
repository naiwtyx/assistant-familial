-- =============================================================================
-- Étape 16 — Points de corvées, corvées récurrentes, calendrier familial
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Corvées : points + récurrence
-- ---------------------------------------------------------------------------
alter table public.chores add column if not exists points smallint not null default 1;
alter table public.chores add column if not exists recurrence text
  check (recurrence is null or recurrence in ('daily', 'weekly'));

-- ---------------------------------------------------------------------------
-- 2) Calendrier familial (événements)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  event_date date not null,
  event_time time,
  note       text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_family on public.events (family_id, event_date);

alter table public.events enable row level security;

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select
  using (public.is_family_member(family_id));

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert
  with check (public.is_family_member(family_id) and auth.uid() = created_by);

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events for update
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events for delete
  using (auth.uid() = created_by or public.is_family_authorized(family_id));

-- Temps réel
alter table public.events replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null; end $$;
