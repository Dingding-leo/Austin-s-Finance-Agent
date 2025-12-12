-- Create Orders table
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  side text not null,
  type text not null,
  quantity float not null,
  status text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create Positions table
create table if not exists public.positions (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders not null,
  symbol text not null,
  quantity float not null,
  entry_price float not null,
  current_price float,
  unrealized_pnl float,
  is_open boolean default true,
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create Sessions table
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  start_time timestamptz not null,
  end_time timestamptz,
  start_balance float not null,
  end_balance float,
  total_pnl float default 0,
  trade_count int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create Market Prices table
create table if not exists public.market_prices (
  symbol text primary key,
  bid float,
  ask float,
  last float,
  volume float,
  change24h float,
  changePercent24h float,
  timestamp timestamptz default now()
);

-- Enable RLS
alter table public.orders enable row level security;
alter table public.positions enable row level security;
alter table public.sessions enable row level security;
alter table public.market_prices enable row level security;

-- Policies for Orders
create policy "Users can view their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users can insert their own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Users can update their own orders" on public.orders for update using (auth.uid() = user_id);

-- Policies for Positions
create policy "Users can view their own positions" on public.positions for select using (
  exists (select 1 from public.orders where orders.id = positions.order_id and orders.user_id = auth.uid())
);
create policy "Users can insert their own positions" on public.positions for insert with check (
  exists (select 1 from public.orders where orders.id = order_id and orders.user_id = auth.uid())
);
create policy "Users can update their own positions" on public.positions for update using (
  exists (select 1 from public.orders where orders.id = order_id and orders.user_id = auth.uid())
);

-- Policies for Sessions
create policy "Users can view their own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert their own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own sessions" on public.sessions for update using (auth.uid() = user_id);

-- Policies for Market Prices (Public read, Service role write)
create policy "Public read market prices" on public.market_prices for select using (true);
-- Write policy omitted, effectively strictly service-role or admin only
