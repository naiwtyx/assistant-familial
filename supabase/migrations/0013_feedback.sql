-- =============================================================================
-- Bêta — Feedback & signalement de bug.
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
--
-- Les retours sont écrits UNIQUEMENT via la RPC `submit_feedback` (security
-- definer) : la table n'a aucune policy SELECT/INSERT publique, donc personne
-- ne peut lire les retours via l'API. Toi (admin) les consultes directement
-- dans le Table Editor de Supabase (service role, hors RLS).
-- =============================================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  family_id uuid references public.families (id) on delete set null,
  kind text not null default 'other' check (kind in ('bug', 'idea', 'other')),
  message text not null,
  context jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- Aucune policy : tout accès passe par la RPC ci-dessous (ou le service role).

create or replace function public.submit_feedback(
  p_kind text,
  p_message text,
  p_context jsonb default null,
  p_family_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $submit_feedback$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if coalesce(trim(p_message), '') = '' then
    raise exception 'Message vide';
  end if;

  insert into public.feedback (user_id, family_id, kind, message, context)
  values (
    auth.uid(),
    p_family_id,
    case when p_kind in ('bug', 'idea', 'other') then p_kind else 'other' end,
    left(p_message, 2000),
    p_context
  );
end;
$submit_feedback$;

grant execute on function public.submit_feedback(text, text, jsonb, uuid) to authenticated;
