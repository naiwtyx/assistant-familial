-- =============================================================================
-- Étape 14 — Limitation IA par âge + rappels courses
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Limitation de l'assistant IA en fonction de l'âge
-- ---------------------------------------------------------------------------
-- Date de naissance d'un membre (pour calculer son âge). Renseignée par un parent.
alter table public.family_members add column if not exists birth_date date;

-- Âge minimum requis pour parler à l'assistant IA (au niveau de la famille).
-- null = aucune restriction d'âge.
alter table public.families add column if not exists ai_min_age smallint;

-- Renseigner la date de naissance d'un membre : réservé aux parents.
create or replace function public.set_member_birth_date(
  p_family_id uuid,
  p_user_id uuid,
  p_birth_date date
)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $set_birth_date$
declare
  v_member public.family_members;
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.family_members
  set birth_date = p_birth_date
  where family_id = p_family_id and user_id = p_user_id
  returning * into v_member;

  return v_member;
end;
$set_birth_date$;

-- Définir l'âge minimum pour l'IA : réservé aux parents.
create or replace function public.set_family_ai_min_age(
  p_family_id uuid,
  p_min_age smallint
)
returns public.families
language plpgsql
security definer
set search_path = public
as $set_min_age$
declare
  v_family public.families;
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.families
  set ai_min_age = p_min_age
  where id = p_family_id
  returning * into v_family;

  return v_family;
end;
$set_min_age$;
