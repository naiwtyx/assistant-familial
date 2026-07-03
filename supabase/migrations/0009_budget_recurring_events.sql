-- =============================================================================
-- Étape 17 — Plafond de budget mensuel + événements récurrents
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Plafond de budget mensuel (au niveau de la famille)
-- ---------------------------------------------------------------------------
alter table public.families add column if not exists monthly_budget numeric;

create or replace function public.set_family_budget(
  p_family_id uuid,
  p_budget numeric
)
returns public.families
language plpgsql
security definer
set search_path = public
as $set_budget$
declare
  v_family public.families;
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.families
  set monthly_budget = p_budget
  where id = p_family_id
  returning * into v_family;

  return v_family;
end;
$set_budget$;

-- ---------------------------------------------------------------------------
-- 2) Événements récurrents (agenda)
-- ---------------------------------------------------------------------------
alter table public.events add column if not exists recurrence text
  check (recurrence is null or recurrence in ('weekly', 'monthly'));

-- ---------------------------------------------------------------------------
-- 3) Temps réel pour le journal d'activité (fil d'activité familial)
-- ---------------------------------------------------------------------------
alter table public.activity_log replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.activity_log;
exception when duplicate_object then null; end $$;
