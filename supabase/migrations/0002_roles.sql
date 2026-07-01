-- =============================================================================
-- Étape 8 — Hiérarchie des rôles : owner > parent > member
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

-- 1) Autoriser le rôle 'parent' (en plus de owner/member)
alter table public.family_members drop constraint if exists family_members_role_check;
alter table public.family_members
  add constraint family_members_role_check check (role in ('owner', 'parent', 'member'));

-- 2) L'utilisateur courant est-il "autorisé" (parent ou propriétaire) ?
create or replace function public.is_family_authorized(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.role in ('owner', 'parent')
  );
$$;

-- 3) Changer le rôle d'un membre (réservé aux parents/propriétaire)
--    - impossible de modifier le propriétaire
--    - impossible de nommer quelqu'un "owner" (un seul propriétaire : le créateur)
create or replace function public.set_member_role(
  p_family_id uuid,
  p_user_id uuid,
  p_role text
)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.family_members;
  v_target public.family_members;
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  if p_role not in ('parent', 'member') then
    raise exception 'Rôle invalide';
  end if;

  select * into v_target
  from public.family_members
  where family_id = p_family_id and user_id = p_user_id;

  if v_target.id is null then
    raise exception 'Membre introuvable';
  end if;

  if v_target.role = 'owner' then
    raise exception 'Le propriétaire ne peut pas être modifié';
  end if;

  update public.family_members
  set role = p_role
  where family_id = p_family_id and user_id = p_user_id
  returning * into v_member;

  return v_member;
end;
$$;
