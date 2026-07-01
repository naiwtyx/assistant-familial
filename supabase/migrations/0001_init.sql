-- =============================================================================
-- Assistant Familial — Schéma initial (Étape 2)
-- À appliquer dans Supabase : Dashboard -> SQL Editor -> coller -> Run.
-- Idempotent autant que possible (IF NOT EXISTS / CREATE OR REPLACE).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utilitaire : maintien automatique de updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Profils (1-1 avec auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Familles
create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Appartenance à une famille
create table if not exists public.family_members (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- Invitations (par code)
create table if not exists public.family_invites (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  code       text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Liste de courses
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  quantity   numeric not null default 1 check (quantity > 0),
  unit       text,
  category   text,
  is_checked boolean not null default false,
  checked_by uuid references auth.users (id) on delete set null,
  checked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventaire
create table if not exists public.inventory_items (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  category    text,
  quantity    numeric not null default 1 check (quantity >= 0),
  unit        text,
  location    text,
  expiry_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Recettes
create table if not exists public.recipes (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  photo_url  text,
  servings   integer not null default 1 check (servings > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ingrédients d'une recette (accès contrôlé via la recette parente)
create table if not exists public.recipe_ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  quantity   numeric not null check (quantity > 0),
  unit       text,
  sort_order integer not null default 0
);

-- Journal d'activité (historique)
create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Index (toutes les requêtes filtrent par famille)
-- -----------------------------------------------------------------------------
create index if not exists idx_family_members_user    on public.family_members (user_id);
create index if not exists idx_family_members_family   on public.family_members (family_id);
create index if not exists idx_shopping_items_family   on public.shopping_items (family_id);
create index if not exists idx_inventory_items_family  on public.inventory_items (family_id);
create index if not exists idx_recipes_family          on public.recipes (family_id);
create index if not exists idx_recipe_ingredients_recipe on public.recipe_ingredients (recipe_id);
create index if not exists idx_activity_log_family     on public.activity_log (family_id);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_families_updated_at on public.families;
create trigger set_families_updated_at before update on public.families
  for each row execute function public.set_updated_at();

drop trigger if exists set_shopping_items_updated_at on public.shopping_items;
create trigger set_shopping_items_updated_at before update on public.shopping_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

-- =============================================================================
-- FONCTIONS DE SÉCURITÉ (SECURITY DEFINER pour éviter la récursion RLS)
-- =============================================================================

-- L'utilisateur courant est-il membre de cette famille ?
create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = auth.uid()
  );
$$;

-- L'utilisateur courant est-il propriétaire de cette famille ?
create or replace function public.is_family_owner(p_family_id uuid)
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
      and fm.role = 'owner'
  );
$$;

-- L'utilisateur courant partage-t-il une famille avec p_user_id ?
create or replace function public.shares_family_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members a
    join public.family_members b on a.family_id = b.family_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

-- =============================================================================
-- RLS — activation
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.families          enable row level security;
alter table public.family_members    enable row level security;
alter table public.family_invites    enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.inventory_items   enable row level security;
alter table public.recipes           enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.activity_log      enable row level security;

-- ---- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or public.shares_family_with(id));

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ---- families ---------------------------------------------------------------
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families for select
  using (public.is_family_member(id));

drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families for insert
  with check (auth.uid() = created_by);

drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families for update
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));

drop policy if exists "families_delete" on public.families;
create policy "families_delete" on public.families for delete
  using (public.is_family_owner(id));

-- ---- family_members ---------------------------------------------------------
-- Lecture : les membres voient la composition de leur famille.
-- Écriture : passe par les RPC SECURITY DEFINER (create_family / join_family_with_code),
-- donc PAS de policy d'insert directe. Un membre peut quitter (delete self),
-- le propriétaire peut retirer un membre.
drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select" on public.family_members for select
  using (public.is_family_member(family_id));

drop policy if exists "family_members_delete" on public.family_members;
create policy "family_members_delete" on public.family_members for delete
  using (user_id = auth.uid() or public.is_family_owner(family_id));

-- ---- family_invites ---------------------------------------------------------
drop policy if exists "family_invites_select" on public.family_invites;
create policy "family_invites_select" on public.family_invites for select
  using (public.is_family_member(family_id));

drop policy if exists "family_invites_insert" on public.family_invites;
create policy "family_invites_insert" on public.family_invites for insert
  with check (public.is_family_member(family_id) and auth.uid() = created_by);

drop policy if exists "family_invites_delete" on public.family_invites;
create policy "family_invites_delete" on public.family_invites for delete
  using (public.is_family_member(family_id));

-- ---- shopping_items ---------------------------------------------------------
drop policy if exists "shopping_items_all" on public.shopping_items;
create policy "shopping_items_all" on public.shopping_items for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---- inventory_items --------------------------------------------------------
drop policy if exists "inventory_items_all" on public.inventory_items;
create policy "inventory_items_all" on public.inventory_items for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---- recipes ----------------------------------------------------------------
drop policy if exists "recipes_all" on public.recipes;
create policy "recipes_all" on public.recipes for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---- recipe_ingredients (via la recette parente) ----------------------------
drop policy if exists "recipe_ingredients_all" on public.recipe_ingredients;
create policy "recipe_ingredients_all" on public.recipe_ingredients for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and public.is_family_member(r.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and public.is_family_member(r.family_id)
    )
  );

-- ---- activity_log -----------------------------------------------------------
drop policy if exists "activity_log_select" on public.activity_log;
create policy "activity_log_select" on public.activity_log for select
  using (public.is_family_member(family_id));

drop policy if exists "activity_log_insert" on public.activity_log;
create policy "activity_log_insert" on public.activity_log for insert
  with check (public.is_family_member(family_id) and auth.uid() = user_id);

-- =============================================================================
-- TRIGGER : création automatique du profil à l'inscription
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- RPC : créer une famille (transaction atomique famille + membre owner)
-- =============================================================================
create or replace function public.create_family(p_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family public.families;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  insert into public.families (name, created_by)
  values (p_name, auth.uid())
  returning * into v_family;

  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, auth.uid(), 'owner');

  return v_family;
end;
$$;

-- =============================================================================
-- RPC : rejoindre une famille via un code d'invitation
-- =============================================================================
create or replace function public.join_family_with_code(p_code text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
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
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_invite.id is null then
    raise exception 'Code d''invitation invalide ou expiré';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_invite.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  select * into v_family from public.families where id = v_invite.family_id;
  return v_family;
end;
$$;

-- =============================================================================
-- REALTIME : diffuser les changements aux autres téléphones
-- replica identity full -> payloads complets sur UPDATE/DELETE
-- =============================================================================
alter table public.shopping_items    replica identity full;
alter table public.inventory_items   replica identity full;
alter table public.recipes           replica identity full;
alter table public.recipe_ingredients replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.inventory_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.recipes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.recipe_ingredients;
exception when duplicate_object then null;
end $$;
