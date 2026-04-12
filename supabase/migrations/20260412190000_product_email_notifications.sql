create table if not exists public.notification_preferences (
  app_user_id uuid primary key references public.app_users (id) on delete cascade,
  product_email_enabled boolean not null default true,
  case_reviewed_email_enabled boolean not null default true,
  alert_assigned_email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  recipient_app_user_id uuid not null references public.app_users (id) on delete cascade,
  recipient_email text,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'pending',
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint notification_deliveries_type_check
    check (type in ('case_reviewed', 'alert_assigned')),
  constraint notification_deliveries_provider_check
    check (provider in ('resend')),
  constraint notification_deliveries_status_check
    check (status in ('pending', 'sent', 'failed', 'disabled', 'skipped'))
);

create index if not exists notification_deliveries_recipient_idx
  on public.notification_deliveries (recipient_app_user_id, created_at desc);

create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries (status, created_at desc);

create index if not exists notification_deliveries_type_idx
  on public.notification_deliveries (type, created_at desc);

create or replace function public.can_access_notification_recipient(
  p_recipient_app_user_id uuid
)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_catalog'
as $$
  select
    p_recipient_app_user_id is not null
    and (
      public.is_super_admin()
      or (
        public.is_ops_admin()
        and exists (
          select 1
          from public.app_users au
          join public.organizations o
            on o.id = au.organization_id
          where au.id = p_recipient_app_user_id
            and o.org_type = any (array['internal'::text, 'b2c'::text])
        )
      )
      or (
        public.is_reviewer()
        and exists (
          select 1
          from public.app_users au
          where au.id = p_recipient_app_user_id
            and au.organization_id = public.current_org_id_v2()
        )
      )
      or (public.is_trainee() and p_recipient_app_user_id = public.current_app_user_id_v2())
    );
$$;

revoke all on function public.can_access_notification_recipient(uuid) from public;
grant execute on function public.can_access_notification_recipient(uuid) to authenticated;

alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update on public.notification_deliveries to authenticated;

drop policy if exists "notification_preferences_select" on public.notification_preferences;
create policy "notification_preferences_select"
on public.notification_preferences
as permissive
for select
to authenticated
using (public.can_access_notification_recipient(app_user_id));

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
as permissive
for insert
to authenticated
with check (app_user_id = public.current_app_user_id_v2());

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
as permissive
for update
to authenticated
using (app_user_id = public.current_app_user_id_v2())
with check (app_user_id = public.current_app_user_id_v2());

drop policy if exists "notification_deliveries_select" on public.notification_deliveries;
create policy "notification_deliveries_select"
on public.notification_deliveries
as permissive
for select
to authenticated
using (public.can_access_notification_recipient(recipient_app_user_id));

drop policy if exists "notification_deliveries_insert_staff" on public.notification_deliveries;
create policy "notification_deliveries_insert_staff"
on public.notification_deliveries
as permissive
for insert
to authenticated
with check (
  public.can_access_notification_recipient(recipient_app_user_id)
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
);

drop policy if exists "notification_deliveries_update_staff" on public.notification_deliveries;
create policy "notification_deliveries_update_staff"
on public.notification_deliveries
as permissive
for update
to authenticated
using (
  public.can_access_notification_recipient(recipient_app_user_id)
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
)
with check (
  public.can_access_notification_recipient(recipient_app_user_id)
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
);

drop trigger if exists trg_set_updated_at_notification_preferences on public.notification_preferences;
create trigger trg_set_updated_at_notification_preferences
before update on public.notification_preferences
for each row execute function public.set_updated_at();
