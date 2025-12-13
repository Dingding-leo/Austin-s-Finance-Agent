create table if not exists public.strategy_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  strategy_id uuid not null,
  version int not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.strategy_prompts enable row level security;

create policy "prompts_owner_select" on public.strategy_prompts
  for select using (auth.uid() = user_id);

create policy "prompts_owner_insert" on public.strategy_prompts
  for insert with check (auth.uid() = user_id);

create policy "prompts_owner_update" on public.strategy_prompts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prompts_owner_delete" on public.strategy_prompts
  for delete using (auth.uid() = user_id);
