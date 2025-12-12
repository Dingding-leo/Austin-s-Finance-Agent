create table if not exists public.strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  parameters jsonb default '{}'::jsonb,
  is_active boolean default true,
  max_risk float default 0.02,
  prompt text,
  technical_info text,
  performance jsonb default '{"since": "now()", "trades": 0, "win_rate": 0, "total_pnl": 0, "avg_rr": 0}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.strategies enable row level security;

create policy "Users can view their own strategies"
  on public.strategies for select
  using (auth.uid() = user_id);

create policy "Users can insert their own strategies"
  on public.strategies for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own strategies"
  on public.strategies for update
  using (auth.uid() = user_id);

create policy "Users can delete their own strategies"
  on public.strategies for delete
  using (auth.uid() = user_id);
