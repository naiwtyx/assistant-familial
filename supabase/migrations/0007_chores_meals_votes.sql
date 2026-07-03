-- =============================================================================
-- Étape 15 — Corvées, planificateur de repas, votes d'idées, jour de courses
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tâches / corvées
-- ---------------------------------------------------------------------------
create table if not exists public.chores (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  assigned_to uuid references auth.users (id) on delete set null,
  due_date    date,
  done        boolean not null default false,
  done_at     timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_chores_family on public.chores (family_id, done, created_at desc);

alter table public.chores enable row level security;

drop policy if exists "chores_select" on public.chores;
create policy "chores_select" on public.chores for select
  using (public.is_family_member(family_id));

drop policy if exists "chores_insert" on public.chores;
create policy "chores_insert" on public.chores for insert
  with check (public.is_family_member(family_id) and auth.uid() = created_by);

drop policy if exists "chores_update" on public.chores;
create policy "chores_update" on public.chores for update
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists "chores_delete" on public.chores;
create policy "chores_delete" on public.chores for delete
  using (auth.uid() = created_by or public.is_family_authorized(family_id));

-- ---------------------------------------------------------------------------
-- 2) Planificateur de repas
-- ---------------------------------------------------------------------------
create table if not exists public.meal_plans (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  date       date not null,
  slot       text not null check (slot in ('midi', 'soir')),
  recipe_id  uuid references public.recipes (id) on delete set null,
  note       text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, date, slot)
);
create index if not exists idx_meal_plans_family on public.meal_plans (family_id, date);

alter table public.meal_plans enable row level security;

drop policy if exists "meal_plans_select" on public.meal_plans;
create policy "meal_plans_select" on public.meal_plans for select
  using (public.is_family_member(family_id));

drop policy if exists "meal_plans_insert" on public.meal_plans;
create policy "meal_plans_insert" on public.meal_plans for insert
  with check (public.is_family_member(family_id) and auth.uid() = created_by);

drop policy if exists "meal_plans_update" on public.meal_plans;
create policy "meal_plans_update" on public.meal_plans for update
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists "meal_plans_delete" on public.meal_plans;
create policy "meal_plans_delete" on public.meal_plans for delete
  using (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- 3) Votes sur les idées (boîte à idées)
-- ---------------------------------------------------------------------------
create table if not exists public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  family_id     uuid not null references public.families (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
create index if not exists idx_suggestion_votes_family on public.suggestion_votes (family_id);

alter table public.suggestion_votes enable row level security;

drop policy if exists "suggestion_votes_select" on public.suggestion_votes;
create policy "suggestion_votes_select" on public.suggestion_votes for select
  using (public.is_family_member(family_id));

drop policy if exists "suggestion_votes_insert" on public.suggestion_votes;
create policy "suggestion_votes_insert" on public.suggestion_votes for insert
  with check (public.is_family_member(family_id) and auth.uid() = user_id);

drop policy if exists "suggestion_votes_delete" on public.suggestion_votes;
create policy "suggestion_votes_delete" on public.suggestion_votes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) Jour de courses (pour le rappel automatique)
--    Convention : 0 = dimanche … 6 = samedi (comme JS getDay). null = désactivé.
-- ---------------------------------------------------------------------------
alter table public.families add column if not exists shopping_reminder_day smallint;

create or replace function public.set_family_shopping_day(
  p_family_id uuid,
  p_day smallint
)
returns public.families
language plpgsql
security definer
set search_path = public
as $set_shopping_day$
declare
  v_family public.families;
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.families
  set shopping_reminder_day = p_day
  where id = p_family_id
  returning * into v_family;

  return v_family;
end;
$set_shopping_day$;

-- ---------------------------------------------------------------------------
-- 5) Temps réel pour les nouvelles tables
-- ---------------------------------------------------------------------------
alter table public.chores           replica identity full;
alter table public.meal_plans       replica identity full;
alter table public.suggestion_votes replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.chores;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.meal_plans;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.suggestion_votes;
exception when duplicate_object then null; end $$;
