create extension if not exists "pgcrypto" with schema extensions;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  barcode text,
  min_stock integer not null default 0,
  quantity integer not null default 0,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_id_idx on public.items(user_id);
create index items_barcode_idx on public.items(barcode);
create unique index items_user_barcode_unique on public.items(user_id, barcode) where barcode is not null;

-- ITEM COUNT HISTORY
create table public.item_counts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  quantity_after integer not null,
  latitude double precision,
  longitude double precision,
  client_op_id text,
  created_at timestamptz not null default now()
);

create index item_counts_item_id_idx on public.item_counts(item_id);
create index item_counts_user_id_idx on public.item_counts(user_id);
create unique index item_counts_client_op_id_unique on public.item_counts(client_op_id) where client_op_id is not null;

alter table public.items enable row level security;
alter table public.item_counts enable row level security;

create policy "items_select_own" on public.items
  for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.items
  for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items_delete_own" on public.items
  for delete using (auth.uid() = user_id);

create policy "item_counts_select_own" on public.item_counts
  for select using (auth.uid() = user_id);
create policy "item_counts_insert_own" on public.item_counts
  for insert with check (auth.uid() = user_id);
