-- =============================================================================
-- Étape 19 — Tâches : multi-destinataires, anti-duplication récurrence, édition ;
--            édition des idées
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- (Assure-toi d'avoir aussi appliqué 0009 — sinon l'agenda récurrent échoue.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tâches assignables à plusieurs personnes
-- ---------------------------------------------------------------------------
alter table public.chores add column if not exists assignee_ids uuid[] not null default '{}';

-- Reprise des tâches existantes (assigned_to unique -> tableau).
update public.chores
set assignee_ids = array[assigned_to]
where assigned_to is not null and coalesce(array_length(assignee_ids, 1), 0) = 0;

-- Empêche la récurrence de recréer plusieurs fois la tâche suivante.
alter table public.chores add column if not exists spawned_next boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) Qui peut cocher « fait » : les destinataires ou un parent.
--    Une tâche sans destinataire reste cochable par tout membre.
-- ---------------------------------------------------------------------------
drop policy if exists "chores_update" on public.chores;
create policy "chores_update" on public.chores for update
  using (
    public.is_family_member(family_id) and (
      public.is_family_authorized(family_id)
      or auth.uid() = any (assignee_ids)
      or coalesce(array_length(assignee_ids, 1), 0) = 0
    )
  )
  with check (
    public.is_family_member(family_id) and (
      public.is_family_authorized(family_id)
      or auth.uid() = any (assignee_ids)
      or coalesce(array_length(assignee_ids, 1), 0) = 0
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Édition d'une tâche (créateur ou parent) via RPC — pour ne pas élargir la
--    policy ci-dessus (qui, elle, ne sert qu'à cocher « fait »).
-- ---------------------------------------------------------------------------
create or replace function public.update_chore(
  p_id uuid,
  p_title text,
  p_assignee_ids uuid[],
  p_due_date date,
  p_points smallint,
  p_recurrence text
)
returns public.chores
language plpgsql
security definer
set search_path = public
as $update_chore$
declare
  v_chore public.chores;
begin
  select * into v_chore from public.chores where id = p_id;
  if v_chore.id is null then
    raise exception 'Tâche introuvable';
  end if;
  if not (v_chore.created_by = auth.uid() or public.is_family_authorized(v_chore.family_id)) then
    raise exception 'Action réservée au créateur ou à un parent';
  end if;
  if p_recurrence is not null and p_recurrence not in ('daily', 'weekly') then
    raise exception 'Récurrence invalide';
  end if;

  update public.chores
  set title = p_title,
      assignee_ids = coalesce(p_assignee_ids, '{}'),
      due_date = p_due_date,
      points = p_points,
      recurrence = p_recurrence
  where id = p_id
  returning * into v_chore;

  return v_chore;
end;
$update_chore$;

-- ---------------------------------------------------------------------------
-- 4) Édition d'une idée par son auteur (ou un parent)
-- ---------------------------------------------------------------------------
drop policy if exists "suggestions_update" on public.suggestions;
create policy "suggestions_update" on public.suggestions for update
  using (auth.uid() = created_by or public.is_family_authorized(family_id))
  with check (auth.uid() = created_by or public.is_family_authorized(family_id));
