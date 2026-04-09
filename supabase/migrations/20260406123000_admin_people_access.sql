create or replace function public.admin_update_app_user_identity(
  p_target_user_id uuid,
  p_new_role text,
  p_new_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_actor public.app_users%rowtype;
begin
  select *
  into v_actor
  from public.app_users
  where auth_user_id = auth.uid()
    and coalesce(is_active, true) = true
  limit 1;

  if v_actor.id is null or v_actor.role <> 'super_admin' then
    raise exception 'Only super_admin can update app user identity';
  end if;

  if p_new_role not in ('trainee', 'reviewer', 'ops_admin', 'super_admin') then
    raise exception 'Invalid role: %', p_new_role;
  end if;

  if not exists (
    select 1
    from public.organizations
    where id = p_new_organization_id
  ) then
    raise exception 'Organization not found: %', p_new_organization_id;
  end if;

  update public.app_users
  set
    role = p_new_role,
    organization_id = p_new_organization_id,
    updated_at = now()
  where id = p_target_user_id;

  if not found then
    raise exception 'Target user not found';
  end if;
end;
$function$;

grant execute on function public.admin_update_app_user_identity(uuid, text, uuid) to authenticated;

drop policy if exists "app_users_select" on public.app_users;
create policy "app_users_select"
on public.app_users
as permissive
for select
to authenticated
using (
  public.is_super_admin()
  or (
    (public.is_ops_admin() or public.is_reviewer())
    and organization_id = public.current_org_id_v2()
  )
  or auth_user_id = auth.uid()
);

drop policy if exists "app_user_activity_select" on public.app_user_activity;
create policy "app_user_activity_select"
on public.app_user_activity
as permissive
for select
to authenticated
using (
  public.is_super_admin()
  or (
    (public.is_ops_admin() or public.is_reviewer())
    and exists (
      select 1
      from public.app_users au
      where au.id = app_user_activity.app_user_id
        and au.organization_id = public.current_org_id_v2()
    )
  )
  or app_user_id = public.current_app_user_id_v2()
);
