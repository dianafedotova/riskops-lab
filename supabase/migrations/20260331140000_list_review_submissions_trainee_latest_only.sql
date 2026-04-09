-- Trainees see only the latest submission row per thread; staff still see full history.
create or replace function public.list_review_submissions(
  p_thread_id uuid
)
returns setof public.review_submissions
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_thread public.review_threads%rowtype;
begin
  select *
    into v_thread
  from public.review_threads
  where id = p_thread_id;

  if not found then
    raise exception 'list_review_submissions: thread % not found', p_thread_id;
  end if;

  if not (
    public.is_super_admin()
    or (
      public.is_ops_admin()
      and exists (
        select 1
        from public.organizations o
        where o.id = v_thread.organization_id
          and o.org_type = any (array['internal'::text, 'b2c'::text])
      )
    )
    or (public.is_reviewer() and v_thread.organization_id = public.current_org_id_v2())
    or (public.is_trainee() and v_thread.app_user_id = public.current_app_user_id_v2())
  ) then
    raise exception 'list_review_submissions: access denied for thread %', p_thread_id;
  end if;

  return query
  select rs.*
  from public.review_submissions rs
  where rs.thread_id = p_thread_id
    and (
      not public.is_trainee()
      or rs.submission_version = (
        select max(rs2.submission_version)
        from public.review_submissions rs2
        where rs2.thread_id = p_thread_id
      )
    )
  order by rs.submission_version desc, rs.submitted_at desc;
end;
$function$;
