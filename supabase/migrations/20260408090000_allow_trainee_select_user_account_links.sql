begin;

drop policy if exists "user_account_links_select" on public.user_account_links;

create policy "user_account_links_select"
on public.user_account_links
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.organizations o
      where o.id = user_account_links.organization_id
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
  or (public.is_trainee() and organization_id = public.current_org_id_v2())
);

commit;
