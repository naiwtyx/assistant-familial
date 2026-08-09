-- =============================================================================
-- Étape — Premium : Assistant Budget avancé (flag au niveau du foyer).
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
--
-- Défaut à TRUE : les foyers existants gardent toutes leurs fonctionnalités.
-- Le passage gratuit/premium se fait via la RPC ci-dessous (réservée parents).
-- =============================================================================

alter table public.families
  add column if not exists is_premium boolean not null default true;

create or replace function public.set_family_premium(
  p_family_id uuid,
  p_premium boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $set_family_premium$
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.families
  set is_premium = coalesce(p_premium, true)
  where id = p_family_id;
end;
$set_family_premium$;
