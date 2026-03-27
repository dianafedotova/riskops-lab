-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Schema aligned with lib/types.ts and client queries (users, alerts, app_users, transactions, etc.).
-- Safe to re-run: uses IF NOT EXISTS / idempotent policies where possible.

-- ---------------------------------------------------------------------------
-- public.users (simulated customers — column names match UserRow)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  email text not null,
  country_code text,
  country_name text,
  tier text,
  status text,
  risk_level text,
  full_name text,
  registration_date date,
  phone text,
  nationality text,
  date_of_birth date,
  address_text text,
  proof_of_identity text,
  proof_of_address text,
  source_of_funds_docs text,
  current_balance_usd numeric,
  total_turnover_usd numeric,
  is_high_tier boolean default false,
  occupation text,
  employment_status text,
  annual_income_min_usd numeric,
  annual_income_max_usd numeric,
  primary_source_of_funds text,
  selfie_path text
);

-- Ensure every canonical column exists on older DBs
alter table public.users add column if not exists country_code text;
alter table public.users add column if not exists country_name text;
alter table public.users add column if not exists tier text;
alter table public.users add column if not exists status text;
alter table public.users add column if not exists risk_level text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists registration_date date;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists nationality text;
alter table public.users add column if not exists date_of_birth date;
alter table public.users add column if not exists address_text text;
alter table public.users add column if not exists proof_of_identity text;
alter table public.users add column if not exists proof_of_address text;
alter table public.users add column if not exists source_of_funds_docs text;
alter table public.users add column if not exists current_balance_usd numeric;
alter table public.users add column if not exists total_turnover_usd numeric;
alter table public.users add column if not exists is_high_tier boolean;
alter table public.users add column if not exists occupation text;
alter table public.users add column if not exists employment_status text;
alter table public.users add column if not exists annual_income_min_usd numeric;
alter table public.users add column if not exists annual_income_max_usd numeric;
alter table public.users add column if not exists primary_source_of_funds text;
alter table public.users add column if not exists selfie_path text;

-- Legacy names from older schema.sql (kept for one-way backfill)
alter table public.users add column if not exists country text;
alter table public.users add column if not exists user_status text;
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists dob date;
alter table public.users add column if not exists address_line text;
alter table public.users add column if not exists balance_usd numeric;
alter table public.users add column if not exists turnover_usd numeric;

update public.users set country_code = coalesce(country_code, country) where country is not null;
update public.users set country_name = coalesce(country_name, nationality) where country_name is null and nationality is not null;
update public.users set status = coalesce(status, user_status) where user_status is not null;
update public.users set full_name = coalesce(full_name, display_name) where display_name is not null;
update public.users set date_of_birth = coalesce(date_of_birth, dob) where dob is not null;
update public.users set address_text = coalesce(address_text, address_line) where address_line is not null;
update public.users set current_balance_usd = coalesce(current_balance_usd, balance_usd) where balance_usd is not null;
update public.users set total_turnover_usd = coalesce(total_turnover_usd, turnover_usd) where turnover_usd is not null;

-- ---------------------------------------------------------------------------
-- public.alerts
-- ---------------------------------------------------------------------------
create table if not exists public.alerts (
  id text primary key,
  internal_id uuid not null default gen_random_uuid(),
  user_id text references public.users (id) on delete cascade,
  type text,
  alert_type text,
  severity text,
  status text,
  description text,
  rule_code text,
  rule_name text,
  created_at timestamptz not null default now()
);

alter table public.alerts add column if not exists internal_id uuid;
alter table public.alerts add column if not exists alert_type text;
alter table public.alerts add column if not exists rule_code text;
alter table public.alerts add column if not exists rule_name text;
update public.alerts set internal_id = coalesce(internal_id, gen_random_uuid()) where internal_id is null;
alter table public.alerts alter column internal_id set default gen_random_uuid();
create unique index if not exists alerts_internal_id_uidx on public.alerts (internal_id);
update public.alerts set alert_type = coalesce(alert_type, type) where type is not null;

alter table public.users enable row level security;
alter table public.alerts enable row level security;

drop policy if exists "Allow public read users" on public.users;
create policy "Allow public read users" on public.users for select using (true);

drop policy if exists "Allow public read alerts" on public.alerts;
create policy "Allow public read alerts" on public.alerts for select using (true);

create index if not exists alerts_created_at_idx on public.alerts (created_at desc);

insert into public.users (
  id, email, country_code, country_name, tier, status, risk_level,
  full_name, registration_date, phone, nationality, date_of_birth, address_text,
  proof_of_identity, proof_of_address, source_of_funds_docs,
  current_balance_usd, total_turnover_usd, is_high_tier,
  occupation, employment_status, annual_income_min_usd, annual_income_max_usd, primary_source_of_funds
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
  '1992-09-18',
  '12 Marina View, #18-07, Singapore 018961',
  'Passport SG ••••9012 verified',
  'Utility bill (Mar 2026)',
  'Bank statements + employer letter on file',
  84250,
  1021300,
  true,
  'Product manager',
  'Employed',
  120000,
  180000,
  'Salary + investments'
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
  '1988-04-22',
  'Dubai Marina, Tower B, UAE',
  'Emirates ID ••••7781 verified',
  'DEWA statement (Feb 2026)',
  'Invoices + crypto exchange exports',
  12000,
  890000,
  false,
  'Consultant',
  'Self-employed',
  80000,
  120000,
  'Client fees + trading'
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
  '1995-12-05',
  'Berlin, DE',
  'National ID ••••4410 pending review',
  'Rental agreement (expired)',
  null,
  500,
  45000,
  false,
  null,
  null,
  null,
  null,
  null
)
on conflict (id) do update set
  email = excluded.email,
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  tier = excluded.tier,
  status = excluded.status,
  risk_level = excluded.risk_level,
  full_name = excluded.full_name,
  registration_date = excluded.registration_date,
  phone = excluded.phone,
  nationality = excluded.nationality,
  date_of_birth = excluded.date_of_birth,
  address_text = excluded.address_text,
  proof_of_identity = excluded.proof_of_identity,
  proof_of_address = excluded.proof_of_address,
  source_of_funds_docs = excluded.source_of_funds_docs,
  current_balance_usd = excluded.current_balance_usd,
  total_turnover_usd = excluded.total_turnover_usd,
  is_high_tier = excluded.is_high_tier,
  occupation = excluded.occupation,
  employment_status = excluded.employment_status,
  annual_income_min_usd = excluded.annual_income_min_usd,
  annual_income_max_usd = excluded.annual_income_max_usd,
  primary_source_of_funds = excluded.primary_source_of_funds;

insert into public.alerts (
  id, user_id, type, alert_type, severity, status, description, rule_code, rule_name, created_at
) values
(
  'a-5001',
  'u-1003',
  'Fraud',
  'Fraud',
  'High',
  'Open',
  'Unusual transaction velocity detected over a short time window after recent credential reset.',
  null,
  null,
  '2026-03-20 11:42:00+00'
),
(
  'a-5002',
  'u-1002',
  'AML',
  'AML',
  'Critical',
  'Escalated',
  'Structuring pattern across linked accounts.',
  'AML_001',
  'Income vs outbound spend (30d)',
  '2026-03-20 10:18:00+00'
),
(
  'a-5003',
  'u-1001',
  'Fraud',
  'Fraud',
  'Medium',
  'Monitoring',
  'Velocity spike vs baseline; review in progress.',
  null,
  null,
  '2026-03-19 19:07:00+00'
),
(
  'a-4920',
  'u-1001',
  'AML',
  'AML',
  'Medium',
  'Monitoring',
  'Related case from shared device fingerprint.',
  null,
  null,
  '2026-03-18 14:22:00+00'
),
(
  'a-5999',
  'u-1002',
  'Fraud',
  'Fraud',
  'Low',
  'Open',
  'Dummy alert for UI validation and filter checks.',
  null,
  null,
  '2026-03-21 09:30:00+00'
)
on conflict (id) do update set
  user_id = excluded.user_id,
  type = excluded.type,
  alert_type = coalesce(excluded.alert_type, excluded.type, public.alerts.alert_type),
  severity = excluded.severity,
  status = excluded.status,
  description = excluded.description,
  rule_code = coalesce(excluded.rule_code, public.alerts.rule_code),
  rule_name = coalesce(excluded.rule_name, public.alerts.rule_name),
  created_at = excluded.created_at;

-- ---------------------------------------------------------------------------
-- user_financials
-- ---------------------------------------------------------------------------
create table if not exists public.user_financials (
  user_id text primary key references public.users (id) on delete cascade,
  current_balance numeric,
  total_turnover numeric
);

alter table public.user_financials enable row level security;
drop policy if exists "Allow public read user_financials" on public.user_financials;
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

-- ---------------------------------------------------------------------------
-- user_events
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- transactions (user profile + AML_001 spend window)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id text primary key,
  user_id text references public.users (id) on delete cascade,
  transaction_date date,
  direction text,
  type text,
  channel text,
  counterparty_name text,
  status text,
  amount numeric,
  amount_usd numeric,
  currency text default 'USD'
);

alter table public.transactions enable row level security;
drop policy if exists "Allow public read transactions" on public.transactions;
create policy "Allow public read transactions"
  on public.transactions
  for select
  to anon, authenticated
  using (true);

insert into public.transactions (
  id, user_id, transaction_date, direction, type, channel, counterparty_name, status, amount, amount_usd, currency
) values
('tx-u1001-1', 'u-1001', '2026-03-18', 'outbound', 'Transfer', 'SEPA', 'Acme Trading Ltd', 'Completed', 4200, 4200, 'USD'),
('tx-u1001-2', 'u-1001', '2026-03-19', 'inbound', 'Deposit', 'Card', 'Payroll ACH', 'Completed', 5500, 5500, 'USD'),
('tx-u1002-1', 'u-1002', '2026-03-01', 'outbound', 'Wire', 'SWIFT', 'Offshore Exchange', 'Completed', 25000, 25000, 'USD'),
('tx-u1002-2', 'u-1002', '2026-03-10', 'outbound', 'Crypto', 'On-chain', 'Wallet 0x7a…c2', 'Completed', 15000, 15000, 'USD'),
('tx-u1002-3', 'u-1002', '2026-03-15', 'outbound', 'Transfer', 'FPS', 'Property escrow', 'Pending', 8000, 8000, 'USD'),
('tx-u1003-1', 'u-1003', '2026-03-12', 'outbound', 'Card', 'POS', 'Merchant 4921', 'Rejected', 1200, 1200, 'USD')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- user_payment_methods
-- ---------------------------------------------------------------------------
create table if not exists public.user_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users (id) on delete cascade,
  type text,
  masked_number text,
  card_network text,
  status text,
  bank_type text,
  account_number text,
  wallet_type text,
  wallet_address text
);

alter table public.user_payment_methods enable row level security;
drop policy if exists "Allow public read user_payment_methods" on public.user_payment_methods;
create policy "Allow public read user_payment_methods"
  on public.user_payment_methods
  for select
  to anon, authenticated
  using (true);

insert into public.user_payment_methods (id, user_id, type, masked_number, card_network, status, bank_type, account_number, wallet_type, wallet_address) values
('e0000001-0000-4000-8000-000000000001', 'u-1001', 'Visa Debit', '•••• 4242', 'Visa', 'active', null, null, null, null),
('e0000001-0000-4000-8000-000000000002', 'u-1001', 'Bank account', null, null, 'active', 'DBS', '••••9012', null, null),
('e0000001-0000-4000-8000-000000000003', 'u-1002', 'Mastercard', '•••• 5599', 'Mastercard', 'active', null, null, null, null),
('e0000001-0000-4000-8000-000000000004', 'u-1002', 'Crypto wallet', null, null, 'active', null, null, 'EVM', '0x71C…9Af3'),
('e0000001-0000-4000-8000-000000000005', 'u-1003', 'Visa Credit', '•••• 1111', 'Visa', 'closed', null, null, null, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ops_events
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- internal_notes (note_text for app; text kept for compatibility)
-- ---------------------------------------------------------------------------
create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  text text not null,
  note_type text not null default 'analyst' check (note_type in ('system', 'analyst', 'admin')),
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.internal_notes add column if not exists note_text text;
update public.internal_notes set note_text = coalesce(note_text, text) where note_text is null;

alter table public.internal_notes enable row level security;
drop policy if exists "Allow public read internal_notes" on public.internal_notes;
create policy "Allow public read internal_notes" on public.internal_notes for select using (true);
drop policy if exists "Allow public insert internal_notes" on public.internal_notes;

revoke insert on public.internal_notes from authenticated;
grant select on public.internal_notes to authenticated;

insert into public.internal_notes (id, user_id, text, note_text, note_type, created_at) values
('c0000001-0000-4000-8000-000000000001', 'u-1001', 'EDD review requested due to increased monthly turnover.', 'EDD review requested due to increased monthly turnover.', 'system', '2026-03-18 10:00:00+00'),
('c0000001-0000-4000-8000-000000000002', 'u-1001', 'Verified proof of address (utility bill, issued < 90 days).', 'Verified proof of address (utility bill, issued < 90 days).', 'system', '2026-03-18 11:00:00+00'),
('c0000001-0000-4000-8000-000000000003', 'u-1001', 'SOF docs reviewed and accepted. No further action.', 'SOF docs reviewed and accepted. No further action.', 'analyst', '2026-03-19 14:00:00+00'),
('c0000001-0000-4000-8000-000000000004', 'u-1001', 'Case escalated to compliance for final sign-off.', 'Case escalated to compliance for final sign-off.', 'admin', '2026-03-20 09:00:00+00')
on conflict (id) do nothing;

update public.internal_notes set note_text = coalesce(note_text, text);

-- ---------------------------------------------------------------------------
-- alerts_note
-- ---------------------------------------------------------------------------
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

create or replace view public.alert_notes as
  select id, alert_id, note_text, created_at, created_by
  from public.alerts_note;

grant select on public.alert_notes to anon, authenticated;

-- ---------------------------------------------------------------------------
-- app_users (platform operators — matches AppUserRow + fetch-app-user select)
-- ---------------------------------------------------------------------------
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('trainee', 'reviewer', 'ops_admin', 'super_admin')),
  email text,
  full_name text,
  first_name text,
  last_name text,
  country_code text,
  country_name text,
  avatar_url text,
  provider text,
  status text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  updated_at timestamptz
);

alter table public.app_users add column if not exists full_name text;
alter table public.app_users add column if not exists first_name text;
alter table public.app_users add column if not exists last_name text;
alter table public.app_users add column if not exists country_code text;
alter table public.app_users add column if not exists country_name text;
alter table public.app_users add column if not exists avatar_url text;
alter table public.app_users add column if not exists provider text;
alter table public.app_users add column if not exists status text;
alter table public.app_users add column if not exists is_active boolean;
alter table public.app_users add column if not exists last_login_at timestamptz;
alter table public.app_users add column if not exists updated_at timestamptz;

update public.app_users set is_active = true where is_active is null;

create or replace function public.app_user_matches_jwt(p_auth_user_id uuid, p_email text)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_auth_user_id = auth.uid()
    or (
      p_email is not null
      and btrim(p_email) <> ''
      and auth.jwt() ->> 'email' is not null
      and lower(btrim(p_email)) = lower(btrim(auth.jwt() ->> 'email'))
    );
$$;

grant execute on function public.app_user_matches_jwt(uuid, text) to authenticated;

-- Staff roles (reviewer / ops_admin / super_admin): same RLS access as legacy admin.
create or replace function public.app_user_is_staff(p_role text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_role in ('reviewer', 'ops_admin', 'super_admin');
$$;

grant execute on function public.app_user_is_staff(text) to authenticated;

-- app_users.id for the signed-in JWT user, without re-entering RLS on app_users.
-- Policies that do `exists (select 1 from app_users ...)` from app_user_profiles can
-- recurse with other policies/triggers and hit "stack depth limit exceeded".
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select au.id
     from public.app_users au
     where au.auth_user_id = auth.uid()
     limit 1),
    (select au.id
     from public.app_users au
     where au.email is not null
       and btrim(au.email) <> ''
       and (auth.jwt() ->> 'email') is not null
       and btrim((auth.jwt() ->> 'email')) <> ''
       and lower(btrim(au.email)) = lower(btrim((auth.jwt() ->> 'email')))
     limit 1)
  );
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated;

alter table public.app_users enable row level security;
drop policy if exists "app_users_select_own" on public.app_users;
create policy "app_users_select_own" on public.app_users
  for select using (public.app_user_matches_jwt(auth_user_id, email));

drop policy if exists "app_users_update_own" on public.app_users;
create policy "app_users_update_own" on public.app_users
  for update
  using (public.app_user_matches_jwt(auth_user_id, email))
  with check (public.app_user_matches_jwt(auth_user_id, email));

-- ---------------------------------------------------------------------------
-- simulator_comments
-- ---------------------------------------------------------------------------
create table if not exists public.simulator_comments (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users (id) on delete cascade,
  alert_id uuid references public.alerts (internal_id) on delete cascade,
  author_app_user_id uuid not null references public.app_users (id) on delete cascade,
  author_role text not null check (author_role in ('admin', 'trainee')),
  comment_type text not null check (comment_type in ('user_comment', 'admin_qa', 'admin_private')),
  parent_comment_id uuid references public.simulator_comments (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint simulator_comment_target_check check (
    (user_id is not null and alert_id is null) or
    (user_id is null and alert_id is not null)
  )
);

create index if not exists simulator_comments_user_idx
  on public.simulator_comments (user_id, created_at desc);
create index if not exists simulator_comments_alert_idx
  on public.simulator_comments (alert_id, created_at desc);

alter table public.simulator_comments enable row level security;

drop policy if exists "sim_comments_select_admin" on public.simulator_comments;
create policy "sim_comments_select_admin" on public.simulator_comments
  for select using (
    exists (
      select 1
      from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );

drop policy if exists "sim_comments_select_author" on public.simulator_comments;
create policy "sim_comments_select_author" on public.simulator_comments
  for select using (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = simulator_comments.author_app_user_id
    )
  );

drop policy if exists "sim_comments_select_qa_reply" on public.simulator_comments;
create policy "sim_comments_select_qa_reply" on public.simulator_comments
  for select using (
    comment_type = 'admin_qa'
    and parent_comment_id is not null
    and exists (
      select 1
      from public.simulator_comments p
      join public.app_users me
        on public.app_user_matches_jwt(me.auth_user_id, me.email)
      where p.id = simulator_comments.parent_comment_id
        and p.author_app_user_id = me.id
    )
  );

drop policy if exists "sim_comments_insert_user" on public.simulator_comments;
create policy "sim_comments_insert_user" on public.simulator_comments
  for insert with check (
    comment_type = 'user_comment'
    and author_role = 'trainee'
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and (
      parent_comment_id is null
      or
      exists (
        select 1
        from public.simulator_comments root
        join public.app_users me
          on public.app_user_matches_jwt(me.auth_user_id, me.email)
        where root.id = parent_comment_id
          and root.comment_type = 'user_comment'
          and root.author_app_user_id = me.id
      )
    )
  );

drop policy if exists "sim_comments_insert_admin_qa" on public.simulator_comments;
create policy "sim_comments_insert_admin_qa" on public.simulator_comments
  for insert with check (
    comment_type = 'admin_qa'
    and author_role = 'admin'
    and parent_comment_id is not null
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
    )
    and exists (
      select 1 from public.simulator_comments p
      where p.id = parent_comment_id
        and p.comment_type = 'user_comment'
    )
  );

drop policy if exists "sim_comments_insert_admin_private" on public.simulator_comments;
create policy "sim_comments_insert_admin_private" on public.simulator_comments
  for insert with check (
    comment_type = 'admin_private'
    and author_role = 'admin'
    and parent_comment_id is null
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
        and me.id = author_app_user_id
    )
  );

grant select on public.app_users to authenticated;
grant update on public.app_users to authenticated;
grant select, insert on public.simulator_comments to authenticated;

-- ---------------------------------------------------------------------------
-- admin_private_notes (admin-only scratch threads; use-simulator-comments.ts)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_private_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users (id) on delete cascade,
  alert_id uuid references public.alerts (internal_id) on delete cascade,
  author_app_user_id uuid not null references public.app_users (id) on delete cascade,
  author_role text not null check (author_role = 'admin'),
  parent_note_id uuid references public.admin_private_notes (id) on delete set null,
  body text not null,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint admin_private_notes_target_check check (
    (user_id is not null and alert_id is null) or
    (user_id is null and alert_id is not null)
  )
);

create index if not exists admin_private_notes_user_idx
  on public.admin_private_notes (user_id, created_at desc);
create index if not exists admin_private_notes_alert_idx
  on public.admin_private_notes (alert_id, created_at desc);

alter table public.admin_private_notes enable row level security;

drop policy if exists "admin_private_notes_select_own" on public.admin_private_notes;
create policy "admin_private_notes_select_own" on public.admin_private_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
        and me.id = author_app_user_id
    )
  );

drop policy if exists "admin_private_notes_insert_own" on public.admin_private_notes;
create policy "admin_private_notes_insert_own" on public.admin_private_notes
  for insert to authenticated
  with check (
    author_role = 'admin'
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
        and me.id = author_app_user_id
    )
  );

grant select, insert on public.admin_private_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Review / workspace layer (trainee decisions, threads, assignments)
-- ---------------------------------------------------------------------------

create table if not exists public.app_user_profiles (
  app_user_id uuid primary key references public.app_users (id) on delete cascade,
  first_name text,
  last_name text,
  country_code text,
  updated_at timestamptz not null default now()
);

alter table public.app_user_profiles enable row level security;
drop policy if exists "app_user_profiles_select_own" on public.app_user_profiles;
create policy "app_user_profiles_select_own" on public.app_user_profiles
  for select to authenticated
  using (app_user_id = public.current_app_user_id());
drop policy if exists "app_user_profiles_upsert_own" on public.app_user_profiles;
create policy "app_user_profiles_upsert_own" on public.app_user_profiles
  for insert to authenticated
  with check (app_user_id = public.current_app_user_id());
drop policy if exists "app_user_profiles_update_own" on public.app_user_profiles;
create policy "app_user_profiles_update_own" on public.app_user_profiles
  for update to authenticated
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

grant select, insert, update on public.app_user_profiles to authenticated;

create table if not exists public.app_user_activity (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  event_type text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_user_activity enable row level security;
drop policy if exists "app_user_activity_own" on public.app_user_activity;
create policy "app_user_activity_own" on public.app_user_activity
  for all to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
  )
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
  );

grant select, insert on public.app_user_activity to authenticated;

create table if not exists public.review_threads (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  alert_internal_id uuid references public.alerts (internal_id) on delete cascade,
  user_id text references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint review_threads_target_check check (
    alert_internal_id is not null or user_id is not null
  )
);

create unique index if not exists review_threads_trainee_alert_uidx
  on public.review_threads (app_user_id, alert_internal_id)
  where alert_internal_id is not null;

create unique index if not exists review_threads_trainee_user_uidx
  on public.review_threads (app_user_id, user_id)
  where user_id is not null and alert_internal_id is null;

alter table public.review_threads enable row level security;
drop policy if exists "review_threads_select_trainee" on public.review_threads;
create policy "review_threads_select_trainee" on public.review_threads
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );
drop policy if exists "review_threads_insert_trainee" on public.review_threads;
create policy "review_threads_insert_trainee" on public.review_threads
  for insert to authenticated
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  );

grant select, insert on public.review_threads to authenticated;

create table if not exists public.trainee_decisions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.review_threads (id) on delete cascade,
  alert_id text references public.alerts (id) on delete set null,
  user_id text references public.users (id) on delete set null,
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  decision text not null,
  proposed_alert_status text,
  rationale text,
  review_state text,
  created_at timestamptz not null default now()
);

create index if not exists trainee_decisions_thread_idx on public.trainee_decisions (thread_id, created_at desc);

alter table public.trainee_decisions enable row level security;
drop policy if exists "trainee_decisions_select" on public.trainee_decisions;
create policy "trainee_decisions_select" on public.trainee_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.review_threads rt
      join public.app_users me on me.id = rt.app_user_id
      where rt.id = thread_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );
drop policy if exists "trainee_decisions_insert" on public.trainee_decisions;
create policy "trainee_decisions_insert" on public.trainee_decisions
  for insert to authenticated
  with check (
    app_user_id in (
      select me.id from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
    and exists (
      select 1 from public.review_threads rt
      where rt.id = thread_id
        and rt.app_user_id = app_user_id
    )
  );

grant select, insert on public.trainee_decisions to authenticated;

create table if not exists public.trainee_alert_assignments (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  alert_internal_id uuid not null references public.alerts (internal_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (app_user_id, alert_internal_id)
);

alter table public.trainee_alert_assignments enable row level security;
drop policy if exists "trainee_assign_select" on public.trainee_alert_assignments;
create policy "trainee_assign_select" on public.trainee_alert_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );
drop policy if exists "trainee_assign_write" on public.trainee_alert_assignments;
create policy "trainee_assign_write" on public.trainee_alert_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  )
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  );

grant select, insert, update, delete on public.trainee_alert_assignments to authenticated;

create table if not exists public.trainee_user_watchlist (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  simulator_user_id text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (app_user_id, simulator_user_id)
);

alter table public.trainee_user_watchlist enable row level security;
drop policy if exists "trainee_watch_select" on public.trainee_user_watchlist;
create policy "trainee_watch_select" on public.trainee_user_watchlist
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );
drop policy if exists "trainee_watch_write" on public.trainee_user_watchlist;
create policy "trainee_watch_write" on public.trainee_user_watchlist
  for all to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  )
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  );

grant select, insert, delete on public.trainee_user_watchlist to authenticated;

-- Thread-scoped comments (legacy user_id/alert_id rows remain valid)
alter table public.simulator_comments add column if not exists thread_id uuid references public.review_threads (id) on delete cascade;
alter table public.simulator_comments add column if not exists decision_id uuid references public.trainee_decisions (id) on delete set null;

alter table public.simulator_comments drop constraint if exists simulator_comment_target_check;
alter table public.simulator_comments add constraint simulator_comment_target_check_v2 check (
  thread_id is not null
  or (user_id is not null and alert_id is null)
  or (user_id is null and alert_id is not null)
);

create index if not exists simulator_comments_thread_idx
  on public.simulator_comments (thread_id, created_at desc);

drop policy if exists "sim_comments_insert_user" on public.simulator_comments;
create policy "sim_comments_insert_user" on public.simulator_comments
  for insert with check (
    comment_type = 'user_comment'
    and author_role = 'trainee'
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and (
      (
        thread_id is not null
        and exists (
          select 1 from public.review_threads rt
          where rt.id = thread_id
            and rt.app_user_id = author_app_user_id
        )
        and (
          parent_comment_id is null
          or exists (
            select 1
            from public.simulator_comments root
            where root.id = parent_comment_id
              and root.comment_type = 'user_comment'
              and root.author_app_user_id = author_app_user_id
              and root.thread_id = simulator_comments.thread_id
          )
        )
      )
      or (
        thread_id is null
        and (
          (user_id is not null and alert_id is null)
          or (user_id is null and alert_id is not null)
        )
        and (
          parent_comment_id is null
          or exists (
            select 1
            from public.simulator_comments root
            join public.app_users me
              on public.app_user_matches_jwt(me.auth_user_id, me.email)
            where root.id = parent_comment_id
              and root.comment_type = 'user_comment'
              and root.author_app_user_id = me.id
          )
        )
      )
    )
  );

drop policy if exists "sim_comments_insert_admin_qa" on public.simulator_comments;
create policy "sim_comments_insert_admin_qa" on public.simulator_comments
  for insert with check (
    comment_type = 'admin_qa'
    and author_role = 'admin'
    and parent_comment_id is not null
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
    )
    and exists (
      select 1 from public.simulator_comments p
      where p.id = parent_comment_id
        and p.comment_type = 'user_comment'
        and (
          simulator_comments.thread_id is null
          or p.thread_id = simulator_comments.thread_id
        )
    )
  );

drop policy if exists "sim_comments_select_author" on public.simulator_comments;
create policy "sim_comments_select_author" on public.simulator_comments
  for select using (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = simulator_comments.author_app_user_id
    )
    or (
      thread_id is not null
      and exists (
        select 1 from public.review_threads rt
        join public.app_users me on me.id = rt.app_user_id
        where rt.id = thread_id
          and public.app_user_matches_jwt(me.auth_user_id, me.email)
      )
    )
  );

drop policy if exists "sim_comments_select_qa_reply" on public.simulator_comments;
create policy "sim_comments_select_qa_reply" on public.simulator_comments
  for select using (
    comment_type = 'admin_qa'
    and parent_comment_id is not null
    and exists (
      select 1
      from public.simulator_comments p
      join public.app_users me
        on public.app_user_matches_jwt(me.auth_user_id, me.email)
      where p.id = simulator_comments.parent_comment_id
        and p.author_app_user_id = me.id
    )
  );

-- Trainee may edit their own root thread message within 5 minutes if no admin QA exists under that root.
alter table public.simulator_comments add column if not exists updated_at timestamptz;

create or replace function public.trainee_top_comment_still_editable(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        c.comment_type = 'user_comment'
        and c.author_role = 'trainee'
        and c.parent_comment_id is null
        and c.thread_id is not null
        and c.created_at > now() - interval '5 minutes'
        and not exists (
          select 1
          from public.simulator_comments aq
          where aq.thread_id = c.thread_id
            and aq.comment_type = 'admin_qa'
            and aq.parent_comment_id is not null
            and (
              aq.parent_comment_id = c.id
              or exists (
                with recursive ancestors as (
                  select sc.id, sc.parent_comment_id
                  from public.simulator_comments sc
                  where sc.id = aq.parent_comment_id
                  union all
                  select sc2.id, sc2.parent_comment_id
                  from public.simulator_comments sc2
                  join ancestors a on sc2.id = a.parent_comment_id
                  where a.parent_comment_id is not null
                )
                select 1 from ancestors where id = c.id
              )
            )
        )
      from public.simulator_comments c
      where c.id = p_id
    ),
    false
  );
$$;

revoke all on function public.trainee_top_comment_still_editable(uuid) from public;
grant execute on function public.trainee_top_comment_still_editable(uuid) to authenticated;

drop policy if exists "sim_comments_update_user_trainee_root" on public.simulator_comments;
create policy "sim_comments_update_user_trainee_root" on public.simulator_comments
  for update to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and public.trainee_top_comment_still_editable(id)
  )
  with check (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and public.trainee_top_comment_still_editable(id)
  );

grant update (body, updated_at) on public.simulator_comments to authenticated;

-- Link Supabase Auth users after they exist in auth.users:
-- insert into public.app_users (auth_user_id, role, email, full_name, is_active)
-- values ('<auth.users uuid>', 'super_admin', 'admin@example.test', 'Admin User', true);
