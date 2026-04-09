drop policy if exists "review_threads_delete" on public.review_threads;

create policy "review_threads_delete"
on public.review_threads
as permissive
for delete
to authenticated
using (
  public.is_super_admin()
  or public.is_ops_admin()
  or (public.is_reviewer() and (organization_id = public.current_org_id_v2()))
  or (
    public.is_trainee()
    and app_user_id = public.current_app_user_id_v2()
    and not exists (
      select 1
      from public.review_submissions rs
      where rs.thread_id = review_threads.id
    )
  )
);
