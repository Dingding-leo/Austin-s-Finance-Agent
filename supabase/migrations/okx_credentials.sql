create table if not exists public.okx_credentials (
  user_id uuid primary key,
  salt jsonb not null,
  iv jsonb not null,
  ct jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.okx_credentials enable row level security;

create policy "okx_owner_select" on public.okx_credentials
  for select using (auth.uid() = user_id);

create policy "okx_owner_insert" on public.okx_credentials
  for insert with check (auth.uid() = user_id);

create policy "okx_owner_update" on public.okx_credentials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "okx_owner_delete" on public.okx_credentials
  for delete using (auth.uid() = user_id);
