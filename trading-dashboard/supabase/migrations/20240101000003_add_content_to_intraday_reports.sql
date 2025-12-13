alter table public.intraday_reports
  add column if not exists content text;

-- optional: set default empty string for existing rows
update public.intraday_reports
  set content = coalesce(content, '');
