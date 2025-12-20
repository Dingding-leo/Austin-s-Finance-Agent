create table if not exists public.account_balances (
  user_id uuid references auth.users primary key,
  total_equity float,
  available_balance float,
  updated_at timestamptz default now()
);

alter table public.account_balances enable row level security;

create policy "Users can view their own balance" on public.account_balances 
  for select using (auth.uid() = user_id);

create policy "Service role can manage balances" on public.account_balances 
  for all using (true) with check (true);
