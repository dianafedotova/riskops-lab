begin;

grant select, insert, update, delete on public.alerts to authenticated;

drop policy if exists "Allow public read alerts" on public.alerts;
drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select"
on public.alerts
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.organizations o
      where o.id = alerts.organization_id
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
  or public.is_trainee()
);

drop policy if exists "alerts_staff_write" on public.alerts;
create policy "alerts_staff_write"
on public.alerts
for all
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.organizations o
      where o.id = alerts.organization_id
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
)
with check (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.organizations o
      where o.id = alerts.organization_id
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
);

commit;
