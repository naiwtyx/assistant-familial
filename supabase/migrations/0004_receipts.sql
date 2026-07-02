-- =============================================================================
-- Étape 12 — Budget familial : tickets scannés + dépenses (réservé aux parents)
-- À appliquer dans Supabase : SQL Editor -> coller -> Run.
-- =============================================================================

create table if not exists public.receipts (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  store        text,
  purchased_at date not null default current_date,
  total        numeric,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id           uuid primary key default gen_random_uuid(),
  receipt_id   uuid not null references public.receipts (id) on delete cascade,
  family_id    uuid not null references public.families (id) on delete cascade,
  purchased_at date not null,
  name         text not null,
  quantity     numeric not null default 1,
  category     text,
  price        numeric not null default 0
);

create index if not exists idx_receipts_family on public.receipts (family_id, purchased_at);
create index if not exists idx_receipt_items_family on public.receipt_items (family_id, purchased_at);
create index if not exists idx_receipt_items_receipt on public.receipt_items (receipt_id);

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

-- Lecture RÉSERVÉE aux parents (owner/parent). Les écritures passent par la RPC ci-dessous.
drop policy if exists "receipts_select" on public.receipts;
create policy "receipts_select" on public.receipts for select
  using (public.is_family_authorized(family_id));

drop policy if exists "receipts_delete" on public.receipts;
create policy "receipts_delete" on public.receipts for delete
  using (public.is_family_authorized(family_id));

drop policy if exists "receipt_items_select" on public.receipt_items;
create policy "receipt_items_select" on public.receipt_items for select
  using (public.is_family_authorized(family_id));

drop policy if exists "receipt_items_delete" on public.receipt_items;
create policy "receipt_items_delete" on public.receipt_items for delete
  using (public.is_family_authorized(family_id));

-- =============================================================================
-- RPC : enregistrer un ticket + ses lignes (atomique). Réservé aux membres.
-- p_items : tableau JSON [{name, quantity, category, price}]
-- =============================================================================
create or replace function public.save_receipt(
  p_family_id uuid,
  p_store text,
  p_purchased_at date,
  p_total numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_id uuid;
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'Action réservée à la famille';
  end if;

  insert into public.receipts (family_id, store, purchased_at, total, created_by)
  values (p_family_id, p_store, coalesce(p_purchased_at, current_date), p_total, auth.uid())
  returning id into v_receipt_id;

  insert into public.receipt_items (receipt_id, family_id, purchased_at, name, quantity, category, price)
  select
    v_receipt_id,
    p_family_id,
    coalesce(p_purchased_at, current_date),
    item ->> 'name',
    coalesce((item ->> 'quantity')::numeric, 1),
    item ->> 'category',
    coalesce((item ->> 'price')::numeric, 0)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  where coalesce(item ->> 'name', '') <> '';

  return v_receipt_id;
end;
$$;
