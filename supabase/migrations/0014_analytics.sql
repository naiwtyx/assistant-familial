-- =============================================================================
-- Bêta — Analytics d'usage (minimal, respectueux).
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
--
-- On journalise UNIQUEMENT des événements produit anonymisables (nom + petit
-- contexte), jamais de contenu personnel. Écriture via la RPC `track_event`
-- (security definer) ; la table n'a aucune policy publique -> personne ne lit
-- les événements via l'API. Toi (admin) tu analyses dans le Table Editor /
-- SQL Editor de Supabase.
--
-- Événements produit dérivables ensuite (activation, rétention J1/J7/J30…) :
--   app_open, onboarding_completed, ai_message_sent, ai_action_confirmed,
--   receipt_scanned, shopping_item_added, …
-- =============================================================================

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  family_id uuid references public.families (id) on delete set null,
  name text not null,
  props jsonb,
  created_at timestamptz not null default now()
);

-- Index pour les analyses courantes (par événement dans le temps, par foyer).
create index if not exists analytics_events_name_created_idx
  on public.analytics_events (name, created_at);
create index if not exists analytics_events_family_idx
  on public.analytics_events (family_id, created_at);

alter table public.analytics_events enable row level security;
-- Aucune policy : tout accès passe par la RPC ci-dessous (ou le service role).

create or replace function public.track_event(
  p_name text,
  p_props jsonb default null,
  p_family_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $track_event$
begin
  -- Silencieux si non authentifié ou nom vide : l'analytics ne doit jamais
  -- provoquer d'erreur visible côté application.
  if auth.uid() is null then
    return;
  end if;
  if coalesce(trim(p_name), '') = '' then
    return;
  end if;

  insert into public.analytics_events (user_id, family_id, name, props)
  values (auth.uid(), p_family_id, left(p_name, 64), p_props);
end;
$track_event$;

grant execute on function public.track_event(text, jsonb, uuid) to authenticated;
