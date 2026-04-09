begin;

create table if not exists public.review_thread_internal_notes (
  thread_id uuid primary key references public.review_threads (id) on delete cascade,
  body text not null default '',
  body_json jsonb,
  body_format text not null default 'plain_text',
  updated_by_app_user_id uuid references public.app_users (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint review_thread_internal_notes_body_format_check
    check (body_format in ('plain_text', 'tiptap_json'))
);

comment on table public.review_thread_internal_notes is
  'One shared staff-only internal note attached to a review thread.';

comment on column public.review_thread_internal_notes.body_json is
  'Tiptap/ProseMirror JSON document for the shared staff-only review-thread note.';

comment on column public.review_thread_internal_notes.body_format is
  'Content discriminator for review_thread_internal_notes: plain_text or tiptap_json.';

drop trigger if exists trg_set_updated_at_review_thread_internal_notes on public.review_thread_internal_notes;
create trigger trg_set_updated_at_review_thread_internal_notes
before update on public.review_thread_internal_notes
for each row execute function public.set_updated_at();

alter table public.review_thread_internal_notes enable row level security;

grant select, insert, update, delete on public.review_thread_internal_notes to authenticated;

drop policy if exists "review_thread_internal_notes_select" on public.review_thread_internal_notes;
create policy "review_thread_internal_notes_select"
on public.review_thread_internal_notes
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.review_threads rt
      join public.organizations o on o.id = rt.organization_id
      where rt.id = review_thread_internal_notes.thread_id
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (
    public.is_reviewer()
    and exists (
      select 1
      from public.review_threads rt
      where rt.id = review_thread_internal_notes.thread_id
        and rt.organization_id = public.current_org_id_v2()
    )
  )
);

drop policy if exists "review_thread_internal_notes_insert" on public.review_thread_internal_notes;
create policy "review_thread_internal_notes_insert"
on public.review_thread_internal_notes
for insert
to authenticated
with check (
  (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
  and updated_by_app_user_id = public.current_app_user_id_v2()
  and exists (
    select 1
    from public.review_threads rt
    where rt.id = review_thread_internal_notes.thread_id
      and (
        public.is_super_admin()
        or (
          public.is_ops_admin()
          and exists (
            select 1
            from public.organizations o
            where o.id = rt.organization_id
              and o.org_type = any (array['internal'::text, 'b2c'::text])
          )
        )
        or (
          public.is_reviewer()
          and rt.organization_id = public.current_org_id_v2()
        )
      )
  )
);

drop policy if exists "review_thread_internal_notes_update" on public.review_thread_internal_notes;
create policy "review_thread_internal_notes_update"
on public.review_thread_internal_notes
for update
to authenticated
using (
  exists (
    select 1
    from public.review_threads rt
    where rt.id = review_thread_internal_notes.thread_id
      and (
        public.is_super_admin()
        or (
          public.is_ops_admin()
          and exists (
            select 1
            from public.organizations o
            where o.id = rt.organization_id
              and o.org_type = any (array['internal'::text, 'b2c'::text])
          )
        )
        or (
          public.is_reviewer()
          and rt.organization_id = public.current_org_id_v2()
        )
      )
  )
)
with check (
  (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
  and updated_by_app_user_id = public.current_app_user_id_v2()
  and exists (
    select 1
    from public.review_threads rt
    where rt.id = review_thread_internal_notes.thread_id
      and (
        public.is_super_admin()
        or (
          public.is_ops_admin()
          and exists (
            select 1
            from public.organizations o
            where o.id = rt.organization_id
              and o.org_type = any (array['internal'::text, 'b2c'::text])
          )
        )
        or (
          public.is_reviewer()
          and rt.organization_id = public.current_org_id_v2()
        )
      )
  )
);

drop policy if exists "review_thread_internal_notes_delete" on public.review_thread_internal_notes;
create policy "review_thread_internal_notes_delete"
on public.review_thread_internal_notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.review_threads rt
    where rt.id = review_thread_internal_notes.thread_id
      and (
        public.is_super_admin()
        or (
          public.is_ops_admin()
          and exists (
            select 1
            from public.organizations o
            where o.id = rt.organization_id
              and o.org_type = any (array['internal'::text, 'b2c'::text])
          )
        )
        or (
          public.is_reviewer()
          and rt.organization_id = public.current_org_id_v2()
        )
      )
  )
);

commit;
