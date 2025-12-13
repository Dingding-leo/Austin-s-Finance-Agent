create table if not exists public.strategy_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  strategy_id uuid not null,
  symbol text not null,
  action text not null,
  confidence numeric not null,
  content text,
  created_at timestamptz default now()
);

alter table public.strategy_decisions enable row level security;

create policy "decisions_owner_select" on public.strategy_decisions
  for select using (auth.uid() = user_id);

create policy "decisions_owner_insert" on public.strategy_decisions
  for insert with check (auth.uid() = user_id);

create policy "decisions_owner_update" on public.strategy_decisions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "decisions_owner_delete" on public.strategy_decisions
  for delete using (auth.uid() = user_id);
