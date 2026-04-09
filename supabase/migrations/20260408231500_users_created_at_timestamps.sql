-- Simulator user rows: record insert time for list sorting ("Added" column).
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz;
