begin;

create table if not exists public.user_account_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id text not null,
  linked_user_id text not null,
  link_reason text not null,
  created_by_app_user_id uuid references public.app_users (id) on delete set null,
  updated_by_app_user_id uuid references public.app_users (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_account_links_distinct_users check (
    btrim(user_id) <> ''
    and btrim(linked_user_id) <> ''
    and user_id <> linked_user_id
  )
);

create unique index if not exists user_account_links_unique_pair
  on public.user_account_links (organization_id, user_id, linked_user_id);

drop trigger if exists trg_set_updated_at_user_account_links on public.user_account_links;
create trigger trg_set_updated_at_user_account_links
before update on public.user_account_links
for each row execute function public.set_updated_at();

alter table public.user_account_links enable row level security;
grant select, insert, update, delete on public.user_account_links to authenticated;

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

drop policy if exists "user_account_links_staff_write" on public.user_account_links;
create policy "user_account_links_staff_write"
on public.user_account_links
for all
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
)
with check (
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
);

grant insert, update, delete on public.user_events to authenticated;
drop policy if exists "user_events_staff_write" on public.user_events;
create policy "user_events_staff_write"
on public.user_events
for all
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.users u
      join public.organizations o on o.id = u.organization_id
      where u.id::text = user_events.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = user_events.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
)
with check (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.users u
      join public.organizations o on o.id = u.organization_id
      where u.id::text = user_events.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = user_events.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
);

grant insert, update, delete on public.user_payment_methods to authenticated;
drop policy if exists "user_payment_methods_staff_write" on public.user_payment_methods;
create policy "user_payment_methods_staff_write"
on public.user_payment_methods
for all
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.users u
      join public.organizations o on o.id = u.organization_id
      where u.id::text = user_payment_methods.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = user_payment_methods.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
)
with check (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.users u
      join public.organizations o on o.id = u.organization_id
      where u.id::text = user_payment_methods.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = user_payment_methods.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
);

grant insert, update, delete on public.internal_notes to authenticated;
drop policy if exists "internal_notes_staff_write" on public.internal_notes;
create policy "internal_notes_staff_write"
on public.internal_notes
for all
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.users u
      join public.organizations o on o.id = u.organization_id
      where u.id::text = internal_notes.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = internal_notes.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
)
with check (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.users u
      join public.organizations o on o.id = u.organization_id
      where u.id::text = internal_notes.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = internal_notes.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
);

commit;
