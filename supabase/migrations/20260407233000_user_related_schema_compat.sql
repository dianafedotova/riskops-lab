begin;

alter table public.transactions add column if not exists external_id text;
alter table public.transactions add column if not exists rail text;
alter table public.transactions add column if not exists merchant_name text;
alter table public.transactions add column if not exists display_name text;
alter table public.transactions add column if not exists organization_id uuid references public.organizations (id) on delete set null;
alter table public.transactions add column if not exists created_at timestamp with time zone not null default now();
alter table public.transactions add column if not exists updated_at timestamp with time zone not null default now();

update public.transactions
set external_id = coalesce(nullif(external_id, ''), id::text)
where external_id is null or btrim(external_id) = '';

grant insert, update, delete on public.transactions to authenticated;
drop policy if exists "transactions_staff_write" on public.transactions;
create policy "transactions_staff_write"
on public.transactions
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
      where u.id::text = transactions.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = transactions.user_id::text
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
      where u.id::text = transactions.user_id::text
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.users u
      where u.id::text = transactions.user_id::text
        and u.organization_id = public.current_org_id_v2()
    )
  )
);

alter table public.user_payment_methods add column if not exists created_at timestamp with time zone default now();

alter table public.internal_notes add column if not exists updated_at timestamp with time zone;
alter table public.internal_notes add column if not exists updated_by text;
alter table public.internal_notes add column if not exists note_text text;

update public.internal_notes
set note_text = coalesce(note_text, text)
where note_text is null;

commit;
