-- Run in Supabase SQL Editor if balance/turnover are visible as postgres but not in the app.
-- The anon key respects RLS; postgres role in Table Editor does not.

alter table public.user_financials enable row level security;

drop policy if exists "Allow public read user_financials" on public.user_financials;
create policy "Allow public read user_financials"
  on public.user_financials
  for select
  to anon, authenticated
  using (true);
