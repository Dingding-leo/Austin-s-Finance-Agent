create table if not exists public.strategy_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  strategy_id uuid not null,
  symbol text not null,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.strategy_assets enable row level security;

create policy "assets_owner_select" on public.strategy_assets
  for select using (auth.uid() = user_id);

create policy "assets_owner_insert" on public.strategy_assets
  for insert with check (auth.uid() = user_id);

create policy "assets_owner_update" on public.strategy_assets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "assets_owner_delete" on public.strategy_assets
  for delete using (auth.uid() = user_id);
