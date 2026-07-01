-- =============================================================================
-- Étape 11 — Notifications push : abonnements des appareils
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  family_id  uuid not null references public.families (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_family on public.push_subscriptions (family_id);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Un membre peut lire les abonnements de sa famille (pour lui envoyer des notifs)...
drop policy if exists "push_select" on public.push_subscriptions;
create policy "push_select" on public.push_subscriptions for select
  using (public.is_family_member(family_id));

-- ...mais ne gère (crée/supprime) que SES propres abonnements.
drop policy if exists "push_insert" on public.push_subscriptions;
create policy "push_insert" on public.push_subscriptions for insert
  with check (user_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists "push_delete" on public.push_subscriptions;
create policy "push_delete" on public.push_subscriptions for delete
  using (user_id = auth.uid());
