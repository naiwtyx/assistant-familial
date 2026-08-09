-- =============================================================================
-- Premium « sur invitation » : défaut FALSE + octroi réservé à l'administrateur.
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- (Nécessite 0011_premium.sql au préalable.)
-- =============================================================================

-- Les nouveaux foyers démarrent en Gratuit.
alter table public.families alter column is_premium set default false;

-- Base propre : tout le monde en Gratuit...
update public.families set is_premium = false;

-- ...sauf le foyer de l'administrateur (garde le Premium immédiatement).
update public.families set is_premium = true
where id in (
  select fm.family_id
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  where lower(u.email) = 'naiwtyx@gmail.com'
);

-- Seul l'administrateur peut accorder/retirer le Premium à un foyer donné.
create or replace function public.set_family_premium(
  p_family_id uuid,
  p_premium boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $set_family_premium$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if lower(coalesce(v_email, '')) <> 'naiwtyx@gmail.com' then
    raise exception 'Action réservée à l''administrateur';
  end if;

  update public.families
  set is_premium = coalesce(p_premium, false)
  where id = p_family_id;
end;
$set_family_premium$;

-- Accorder/retirer le Premium par email d'un membre (admin uniquement).
-- Retourne le nombre de foyers modifiés.
create or replace function public.set_premium_by_email(
  p_email text,
  p_premium boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $set_premium_by_email$
declare
  v_email text;
  v_count integer;
begin
  select email into v_email from auth.users where id = auth.uid();
  if lower(coalesce(v_email, '')) <> 'naiwtyx@gmail.com' then
    raise exception 'Action réservée à l''administrateur';
  end if;

  update public.families
  set is_premium = coalesce(p_premium, false)
  where id in (
    select fm.family_id
    from public.family_members fm
    join auth.users u on u.id = fm.user_id
    where lower(u.email) = lower(trim(p_email))
  );

  get diagnostics v_count = row_count;
  return v_count;
end;
$set_premium_by_email$;
