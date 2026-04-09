alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;

update public.users
set
  first_name = coalesce(first_name, nullif(split_part(trim(full_name), ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(trim(replace(trim(full_name), split_part(trim(full_name), ' ', 1), '')), '')
  )
where full_name is not null
  and btrim(full_name) <> '';
