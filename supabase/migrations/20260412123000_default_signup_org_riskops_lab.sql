do $$
declare
  v_default_org_id uuid;
begin
  select id
  into v_default_org_id
  from public.organizations
  where name = 'RiskOps Lab'
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if v_default_org_id is null then
    select id
    into v_default_org_id
    from public.organizations
    where slug = 'riskops-lab'
    limit 1;
  end if;

  if v_default_org_id is null then
    insert into public.organizations (
      name,
      slug,
      org_type,
      status,
      updated_at
    )
    values (
      'RiskOps Lab',
      'riskops-lab',
      'b2c',
      'active',
      now()
    )
    returning id into v_default_org_id;
  else
    update public.organizations
    set
      name = 'RiskOps Lab',
      org_type = 'b2c',
      status = 'active',
      updated_at = now()
    where id = v_default_org_id;
  end if;
end
$$;

create or replace function public.upsert_default_b2c_app_user(p_auth_user auth.users)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog'
as $function$
declare
  v_default_org_id uuid;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_avatar_url text;
  v_provider text;
  v_country_code text;
  v_country_name text;
  v_app_user_id uuid;
begin
  select id
  into v_default_org_id
  from public.organizations
  where name = 'RiskOps Lab'
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if v_default_org_id is null then
    select id
    into v_default_org_id
    from public.organizations
    where slug = 'riskops-lab'
    limit 1;
  end if;

  if v_default_org_id is null then
    raise exception 'Default signup organization not found (expected RiskOps Lab / riskops-lab)';
  end if;

  v_first_name := nullif(trim(p_auth_user.raw_user_meta_data ->> 'first_name'), '');
  v_last_name := nullif(trim(p_auth_user.raw_user_meta_data ->> 'last_name'), '');

  v_full_name := coalesce(
    nullif(trim(p_auth_user.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(p_auth_user.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), '')
  );

  if v_first_name is null and v_full_name is not null then
    v_first_name := split_part(v_full_name, ' ', 1);
  end if;

  if v_last_name is null and v_full_name is not null then
    v_last_name := nullif(trim(replace(v_full_name, split_part(v_full_name, ' ', 1), '')), '');
  end if;

  v_avatar_url := coalesce(
    nullif(trim(p_auth_user.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(p_auth_user.raw_user_meta_data ->> 'picture'), '')
  );

  v_provider := coalesce(
    nullif(trim(p_auth_user.raw_app_meta_data ->> 'provider'), ''),
    nullif(trim(p_auth_user.raw_app_meta_data -> 'providers' ->> 0), ''),
    'email'
  );

  v_country_code := upper(nullif(trim(p_auth_user.raw_user_meta_data ->> 'country_code'), ''));
  v_country_name := nullif(trim(p_auth_user.raw_user_meta_data ->> 'country_name'), '');

  insert into public.app_users (
    auth_user_id,
    email,
    first_name,
    last_name,
    full_name,
    country_code,
    country_name,
    avatar_url,
    provider,
    role,
    organization_id,
    status,
    is_active,
    created_at,
    updated_at
  )
  values (
    p_auth_user.id,
    p_auth_user.email,
    v_first_name,
    v_last_name,
    v_full_name,
    v_country_code,
    v_country_name,
    v_avatar_url,
    v_provider,
    'trainee',
    v_default_org_id,
    'active',
    true,
    now(),
    now()
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    first_name = coalesce(public.app_users.first_name, excluded.first_name),
    last_name = coalesce(public.app_users.last_name, excluded.last_name),
    full_name = coalesce(public.app_users.full_name, excluded.full_name),
    country_code = coalesce(public.app_users.country_code, excluded.country_code),
    country_name = coalesce(public.app_users.country_name, excluded.country_name),
    avatar_url = coalesce(public.app_users.avatar_url, excluded.avatar_url),
    provider = coalesce(public.app_users.provider, excluded.provider),
    role = coalesce(public.app_users.role, excluded.role),
    organization_id = coalesce(public.app_users.organization_id, excluded.organization_id),
    status = coalesce(public.app_users.status, excluded.status),
    is_active = coalesce(public.app_users.is_active, excluded.is_active),
    updated_at = now()
  returning id into v_app_user_id;

  return v_app_user_id;
end;
$function$;

create or replace function public.handle_default_b2c_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog'
as $function$
begin
  perform public.upsert_default_b2c_app_user(new);
  return new;
end;
$function$;

drop trigger if exists on_public_beta_auth_user_created on auth.users;
drop trigger if exists on_default_b2c_auth_user_created on auth.users;

create trigger on_default_b2c_auth_user_created
after insert on auth.users
for each row execute function public.handle_default_b2c_auth_user();
