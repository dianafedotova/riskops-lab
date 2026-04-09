create or replace function public.admin_create_organization(
  p_name text,
  p_org_type text default 'b2b'
)
returns setof public.organizations
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_actor public.app_users%rowtype;
  v_name text;
  v_org_type text;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_created public.organizations%rowtype;
begin
  select *
  into v_actor
  from public.app_users
  where auth_user_id = auth.uid()
    and coalesce(is_active, true) = true
  limit 1;

  if v_actor.id is null or v_actor.role <> 'super_admin' then
    raise exception 'Only super_admin can create organizations';
  end if;

  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'Organization name is required';
  end if;

  v_org_type := lower(trim(coalesce(p_org_type, 'b2b')));
  if v_org_type not in ('internal', 'b2c', 'b2b') then
    raise exception 'Invalid organization type: %', p_org_type;
  end if;

  v_base_slug := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');

  if v_base_slug = '' then
    raise exception 'Could not derive a valid slug from organization name';
  end if;

  v_slug := v_base_slug;
  while exists (
    select 1
    from public.organizations
    where slug = v_slug
  ) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (
    name,
    slug,
    org_type,
    status,
    updated_at
  )
  values (
    v_name,
    v_slug,
    v_org_type,
    'active',
    now()
  )
  returning *
  into v_created;

  return next v_created;
end;
$function$;

grant execute on function public.admin_create_organization(text, text) to authenticated;
