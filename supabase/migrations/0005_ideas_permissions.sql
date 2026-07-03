-- =============================================================================
-- Étape 13 — Boîte à idées, approbation des invitations, droits par membre
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Boîte à idées
-- ---------------------------------------------------------------------------
create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  content    text not null check (char_length(content) between 1 and 500),
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_suggestions_family on public.suggestions (family_id, created_at desc);

alter table public.suggestions enable row level security;

drop policy if exists "suggestions_select" on public.suggestions;
create policy "suggestions_select" on public.suggestions for select
  using (public.is_family_member(family_id));

drop policy if exists "suggestions_insert" on public.suggestions;
create policy "suggestions_insert" on public.suggestions for insert
  with check (public.is_family_member(family_id) and auth.uid() = created_by);

-- Marquer "fait" : réservé aux parents.
drop policy if exists "suggestions_update" on public.suggestions;
create policy "suggestions_update" on public.suggestions for update
  using (public.is_family_authorized(family_id))
  with check (public.is_family_authorized(family_id));

-- Suppression : l'auteur ou un parent.
drop policy if exists "suggestions_delete" on public.suggestions;
create policy "suggestions_delete" on public.suggestions for delete
  using (auth.uid() = created_by or public.is_family_authorized(family_id));

-- ---------------------------------------------------------------------------
-- 2) Approbation des invitations
-- ---------------------------------------------------------------------------
alter table public.family_invites add column if not exists approved boolean not null default true;

-- L'insertion directe est désormais interdite : tout passe par la RPC create_invite
-- (qui décide de l'approbation selon le rôle). Empêche un membre de contourner l'approbation.
drop policy if exists "family_invites_insert" on public.family_invites;

-- Créer une invitation : approuvée d'office si parent/propriétaire, sinon EN ATTENTE.
create or replace function public.create_invite(
  p_family_id uuid,
  p_code text,
  p_expires_at timestamptz
)
returns public.family_invites
language plpgsql
security definer
set search_path = public
as $create_invite$
declare
  v_invite public.family_invites;
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'Action réservée à la famille';
  end if;

  insert into public.family_invites (family_id, code, created_by, expires_at, approved)
  values (p_family_id, p_code, auth.uid(), p_expires_at, public.is_family_authorized(p_family_id))
  returning * into v_invite;

  return v_invite;
end;
$create_invite$;

-- Approuver une invitation en attente : réservé aux parents.
create or replace function public.approve_invite(p_invite_id uuid)
returns public.family_invites
language plpgsql
security definer
set search_path = public
as $approve_invite$
declare
  v_invite public.family_invites;
begin
  select * into v_invite from public.family_invites where id = p_invite_id;
  if v_invite.id is null then
    raise exception 'Invitation introuvable';
  end if;
  if not public.is_family_authorized(v_invite.family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.family_invites set approved = true where id = p_invite_id returning * into v_invite;
  return v_invite;
end;
$approve_invite$;

-- Rejoindre : le code doit exister, ne pas être expiré, ET être approuvé.
create or replace function public.join_family_with_code(p_code text)
returns public.families
language plpgsql
security definer
set search_path = public
as $join_family$
declare
  v_invite public.family_invites;
  v_family public.families;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select * into v_invite
  from public.family_invites
  where code = p_code
    and approved = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_invite.id is null then
    raise exception 'Code invalide, expiré ou en attente d''approbation';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_invite.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  select * into v_family from public.families where id = v_invite.family_id;
  return v_family;
end;
$join_family$;

-- ---------------------------------------------------------------------------
-- 3) Droits par membre (à ce stade : accès à l'assistant IA)
-- ---------------------------------------------------------------------------
alter table public.family_members add column if not exists can_use_ai boolean not null default true;

-- Modifier un droit d'un membre : réservé aux parents, s'applique aux 'member'.
create or replace function public.set_member_permission(
  p_family_id uuid,
  p_user_id uuid,
  p_can_use_ai boolean
)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $set_perm$
declare
  v_member public.family_members;
begin
  if not public.is_family_authorized(p_family_id) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.family_members
  set can_use_ai = p_can_use_ai
  where family_id = p_family_id and user_id = p_user_id and role = 'member'
  returning * into v_member;

  return v_member;
end;
$set_perm$;
