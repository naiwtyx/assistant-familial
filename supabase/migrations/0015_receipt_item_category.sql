-- =============================================================================
-- Budget — Correction de catégorie sur une ligne de ticket (réservé aux parents).
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
--
-- receipt_items n'a pas de policy UPDATE (seulement select/delete). On passe
-- donc par cette RPC security definer, qui vérifie que l'appelant est parent
-- du foyer propriétaire de la ligne.
-- =============================================================================

create or replace function public.update_receipt_item_category(
  p_item_id uuid,
  p_category text
)
returns void
language plpgsql
security definer
set search_path = public
as $update_receipt_item_category$
declare
  v_family uuid;
begin
  select family_id into v_family from public.receipt_items where id = p_item_id;
  if v_family is null then
    raise exception 'Ligne introuvable';
  end if;
  if not public.is_family_authorized(v_family) then
    raise exception 'Action réservée aux parents';
  end if;

  update public.receipt_items
  set category = nullif(trim(p_category), '')
  where id = p_item_id;
end;
$update_receipt_item_category$;

grant execute on function public.update_receipt_item_category(uuid, text) to authenticated;
