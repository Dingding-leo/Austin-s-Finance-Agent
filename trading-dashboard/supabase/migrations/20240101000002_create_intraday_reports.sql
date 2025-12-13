create table if not exists public.intraday_reports (
  id uuid default gen_random_uuid() primary key,
  symbol text not null,
  timeframe text not null default '1h',
  window_start timestamptz not null,
  window_end timestamptz not null,
  generated_at timestamptz not null default now(),
  content text not null,
  trend_prediction text not null,
  confidence float default 0,
  realized_trend text,
  is_correct boolean,
  evaluated_at timestamptz,
  user_id uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.intraday_reports enable row level security;

create policy intraday_reports_select
  on public.intraday_reports for select
  using (user_id is null or auth.uid() = user_id);

create policy intraday_reports_insert
  on public.intraday_reports for insert
  with check (user_id is null or auth.uid() = user_id);

create policy intraday_reports_update
  on public.intraday_reports for update
  using (user_id is null or auth.uid() = user_id);
