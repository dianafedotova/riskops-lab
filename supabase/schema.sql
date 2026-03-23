-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Creates public.users / public.alerts, RLS read for anon, seed rows.

create table if not exists public.users (
  id text primary key,
  email text not null,
  country text,
  country_name text,
  tier text,
  user_status text,
  risk_level text,
  display_name text,
  registration_date date,
  phone text,
  nationality text,
  address_line text,
  dob date,
  balance_usd numeric,
  turnover_usd numeric,
  is_high_tier boolean default false
);

-- Add country_name for existing DBs; backfill from nationality
alter table public.users add column if not exists country_name text;
update public.users set country_name = coalesce(country_name, nationality) where country_name is null;

create table if not exists public.alerts (
  id text primary key,
  user_id text references public.users (id) on delete cascade,
  type text,
  severity text,
  status text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.alerts enable row level security;

drop policy if exists "Allow public read users" on public.users;
create policy "Allow public read users" on public.users for select using (true);

drop policy if exists "Allow public read alerts" on public.alerts;
create policy "Allow public read alerts" on public.alerts for select using (true);

insert into public.users (
  id, email, country, country_name, tier, user_status, risk_level,
  display_name, registration_date, phone, nationality, address_line, dob,
  balance_usd, turnover_usd, is_high_tier
) values
(
  'u-1001',
  'maya.chen@example.test',
  'SG',
  'Singapore',
  'Tier 3',
  'Active',
  'Low',
  'Maya Chen',
  '2024-02-03',
  '🇸🇬 +65 8123 4455',
  'Singapore',
  '12 Marina View, #18-07, Singapore 018961',
  '1992-09-18',
  84250,
  1021300,
  true
),
(
  'u-1002',
  'ibrahim.noor@example.test',
  'AE',
  'United Arab Emirates',
  'Tier 2',
  'Restricted',
  'Medium',
  'Ibrahim Noor',
  '2023-11-12',
  '🇦🇪 +971 50 555 0192',
  'United Arab Emirates',
  'Dubai Marina, Tower B, UAE',
  '1988-04-22',
  12000,
  890000,
  false
),
(
  'u-1003',
  'elena.voss@example.test',
  'DE',
  'Germany',
  'Tier 1',
  'Blocked',
  'High',
  'Elena Voss',
  '2022-06-01',
  '🇩🇪 +49 170 8899021',
  'Germany',
  'Berlin, DE',
  '1995-12-05',
  500,
  45000,
  false
)
on conflict (id) do update set country_name = excluded.country_name;

insert into public.alerts (id, user_id, type, severity, status, description, created_at) values
(
  'a-5001',
  'u-1003',
  'Fraud',
  'High',
  'Open',
  'Unusual transaction velocity detected over a short time window after recent credential reset.',
  '2026-03-20 11:42:00+00'
),
(
  'a-5002',
  'u-1002',
  'AML',
  'Critical',
  'Escalated',
  'Structuring pattern across linked accounts.',
  '2026-03-20 10:18:00+00'
),
(
  'a-5003',
  'u-1001',
  'Fraud',
  'Medium',
  'Monitoring',
  'Velocity spike vs baseline; review in progress.',
  '2026-03-19 19:07:00+00'
),
(
  'a-4920',
  'u-1001',
  'AML',
  'Medium',
  'Monitoring',
  'Related case from shared device fingerprint.',
  '2026-03-18 14:22:00+00'
),
(
  'a-5999',
  'u-1002',
  'Fraud',
  'Low',
  'Open',
  'Dummy alert for UI validation and filter checks.',
  '2026-03-21 09:30:00+00'
)
on conflict (id) do nothing;

-- user_financials: balance and turnover (separate table for aggregates)
create table if not exists public.user_financials (
  user_id text primary key references public.users (id) on delete cascade,
  current_balance numeric,
  total_turnover numeric
);

alter table public.user_financials enable row level security;
drop policy if exists "Allow public read user_financials" on public.user_financials;
-- anon/authenticated must be explicit or the client may get zero rows while postgres in SQL Editor sees data
create policy "Allow public read user_financials"
  on public.user_financials
  for select
  to anon, authenticated
  using (true);

insert into public.user_financials (user_id, current_balance, total_turnover) values
('u-1001', 84250, 1021300),
('u-1002', 12000, 890000),
('u-1003', 500, 45000)
on conflict (user_id) do update set current_balance = excluded.current_balance, total_turnover = excluded.total_turnover;

-- user_events: devices and activity
create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  event_time timestamptz not null default now(),
  event_type text not null,
  device_id text,
  ip_address text,
  country_code text,
  device_name text,
  created_at timestamptz not null default now()
);

alter table public.user_events enable row level security;
drop policy if exists "Allow public read user_events" on public.user_events;
create policy "Allow public read user_events" on public.user_events for select using (true);

insert into public.user_events (id, user_id, event_time, event_type, device_id, ip_address, country_code, device_name) values
('a0000001-0000-4000-8000-000000000001', 'u-1001', '2026-03-20 11:37:00+00', 'Device changed from iOS to Windows', 'dev-ios-a1', '185.32.1.44', 'SG', 'iPhone 15'),
('a0000001-0000-4000-8000-000000000002', 'u-1001', '2026-03-20 11:37:00+00', 'Device changed from iOS to Windows', 'dev-win-b2', '185.32.1.44', 'SG', 'Windows Chrome'),
('a0000001-0000-4000-8000-000000000003', 'u-1001', '2026-03-20 11:35:00+00', 'Address updated (new proof uploaded)', 'dev-ios-a1', '185.32.1.44', 'SG', 'iPhone 15'),
('a0000001-0000-4000-8000-000000000004', 'u-1001', '2026-03-19 09:15:00+00', 'Large transfer initiated', 'dev-mac-c3', '92.118.45.12', 'DE', 'MacBook Pro'),
('a0000001-0000-4000-8000-000000000005', 'u-1002', '2026-03-20 10:00:00+00', 'Login', 'dev-ae-d1', '103.22.14.90', 'AE', 'Android Chrome'),
('a0000001-0000-4000-8000-000000000006', 'u-1001', '2026-03-18 14:00:00+00', 'Login', 'dev-ios-a1', '103.22.14.90', 'SG', 'iPhone 15'),
('a0000001-0000-4000-8000-000000000007', 'u-1002', '2026-03-19 12:00:00+00', 'Login', 'dev-ios-a1', '185.32.1.44', 'SG', 'iPhone 15'),
('a0000001-0000-4000-8000-000000000008', 'u-1003', '2026-03-18 10:00:00+00', 'Login', 'dev-mac-c3', '92.118.45.12', 'DE', 'MacBook Pro')
on conflict (id) do nothing;

-- ops_events: operations log entries (event_time, action_type, performed_by)
create table if not exists public.ops_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  event_time timestamptz not null default now(),
  action_type text not null,
  performed_by text
);

alter table public.ops_events enable row level security;
drop policy if exists "Allow public read ops_events" on public.ops_events;
create policy "Allow public read ops_events" on public.ops_events for select using (true);

insert into public.ops_events (id, user_id, event_time, action_type, performed_by) values
('b0000001-0000-4000-8000-000000000001', 'u-1001', '2026-03-20 12:10:00+00', 'risk_updated', 'analyst@riskopslab.com'),
('b0000001-0000-4000-8000-000000000002', 'u-1001', '2026-03-20 12:04:00+00', 'block_applied', 'analyst@riskopslab.com'),
('b0000001-0000-4000-8000-000000000003', 'u-1001', '2026-03-20 11:58:00+00', 'poa_approved', 'analyst@riskopslab.com'),
('b0000001-0000-4000-8000-000000000004', 'u-1002', '2026-03-20 11:00:00+00', 'block_applied', 'compliance@riskopslab.com'),
('b0000001-0000-4000-8000-000000000005', 'u-1001', '2026-03-02 10:30:00+00', 'poa_approved', 'analyst@riskopslab.com')
on conflict (id) do nothing;

-- internal_notes: internal notes per user
create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  text text not null,
  note_type text not null default 'analyst' check (note_type in ('system', 'analyst', 'admin')),
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.internal_notes enable row level security;
drop policy if exists "Allow public read internal_notes" on public.internal_notes;
create policy "Allow public read internal_notes" on public.internal_notes for select using (true);
drop policy if exists "Allow public insert internal_notes" on public.internal_notes;
create policy "Allow public insert internal_notes" on public.internal_notes for insert with check (true);

insert into public.internal_notes (id, user_id, text, note_type, created_at) values
('c0000001-0000-4000-8000-000000000001', 'u-1001', 'EDD review requested due to increased monthly turnover.', 'system', '2026-03-18 10:00:00+00'),
('c0000001-0000-4000-8000-000000000002', 'u-1001', 'Verified proof of address (utility bill, issued < 90 days).', 'system', '2026-03-18 11:00:00+00'),
('c0000001-0000-4000-8000-000000000003', 'u-1001', 'SOF docs reviewed and accepted. No further action.', 'analyst', '2026-03-19 14:00:00+00'),
('c0000001-0000-4000-8000-000000000004', 'u-1001', 'Case escalated to compliance for final sign-off.', 'admin', '2026-03-20 09:00:00+00')
on conflict (id) do nothing;

-- alerts_note: notes per alert (predefined + analyst)
create table if not exists public.alerts_note (
  id uuid primary key default gen_random_uuid(),
  alert_id text not null references public.alerts (id) on delete cascade,
  note_text text not null,
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.alerts_note enable row level security;
drop policy if exists "Allow public read alerts_note" on public.alerts_note;
create policy "Allow public read alerts_note" on public.alerts_note for select using (true);
drop policy if exists "Allow public insert alerts_note" on public.alerts_note;
create policy "Allow public insert alerts_note" on public.alerts_note for insert with check (true);

insert into public.alerts_note (id, alert_id, note_text, created_at, created_by) values
('d0000001-0000-4000-8000-000000000001', 'a-5001', 'Alert triaged for fraud review.', '2026-03-20 11:45:00+00', 'system@riskopslab.com'),
('d0000001-0000-4000-8000-000000000002', 'a-5001', 'Requesting SOF docs from user.', '2026-03-20 12:00:00+00', 'analyst@riskopslab.com')
on conflict (id) do nothing;
