do $$
declare
  v_users_id_udt text;
begin
  select c.udt_name
    into v_users_id_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'users'
    and c.column_name = 'id';

  if v_users_id_udt = 'uuid' then
    execute 'alter table public.users alter column id set default gen_random_uuid()';
  elsif v_users_id_udt = 'text' then
    execute 'alter table public.users alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

do $$
declare
  v_alerts_id_udt text;
begin
  select c.udt_name
    into v_alerts_id_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'alerts'
    and c.column_name = 'id';

  if v_alerts_id_udt = 'uuid' then
    execute 'alter table public.alerts alter column id set default gen_random_uuid()';
  elsif v_alerts_id_udt = 'text' then
    execute 'alter table public.alerts alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'alerts'
      and column_name = 'internal_id'
  ) then
    execute $sql$
      update public.alerts
      set internal_id = gen_random_uuid()
      where internal_id is null
    $sql$;

    execute 'alter table public.alerts alter column internal_id set default gen_random_uuid()';
  end if;
end
$$;

create or replace function public.tg_users_fill_external_user_id()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if new.external_user_id is null or btrim(new.external_user_id) = '' then
    new.external_user_id := new.id::text;
  end if;
  return new;
end;
$function$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'external_user_id'
  ) then
    execute $sql$
      update public.users
      set external_user_id = id::text
      where external_user_id is null or btrim(external_user_id) = ''
    $sql$;

    execute 'drop trigger if exists trg_users_fill_external_user_id on public.users';
    execute 'create trigger trg_users_fill_external_user_id before insert on public.users for each row execute function public.tg_users_fill_external_user_id()';
  end if;
end
$$;
