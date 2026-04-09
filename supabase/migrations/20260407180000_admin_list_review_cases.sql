-- Staff catalog: paginated review_threads with filters and search (security definer + role checks).

create or replace function public.admin_list_review_cases(
  p_search text default null,
  p_organization_id uuid default null,
  p_trainee_app_user_id uuid default null,
  p_simulator_user_id uuid default null,
  p_alert_id text default null,
  p_context_type text default 'all',
  p_phase text default 'all',
  p_date_basis text default 'activity',
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_page int default 1,
  p_page_size int default 10
)
returns table (
  thread_id uuid,
  organization_id uuid,
  organization_name text,
  app_user_id uuid,
  context_type text,
  alert_id text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  trainee_email text,
  trainee_full_name text,
  sim_user_email text,
  sim_user_full_name text,
  case_phase text,
  activity_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to public, pg_catalog
as $function$
declare
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_size int := greatest(1, least(coalesce(nullif(p_page_size, 0), 10), 50));
  v_offset bigint;
  v_needle text := nullif(trim(coalesce(p_search, '')), '');
  v_uuid uuid;
  v_uuid_ok boolean := false;
  v_basis text := coalesce(nullif(trim(p_date_basis), ''), 'activity');
  v_ctx text := coalesce(nullif(trim(p_context_type), ''), 'all');
  v_phase text := coalesce(nullif(trim(p_phase), ''), 'all');
begin
  if not (
    public.is_super_admin()
    or public.is_ops_admin()
    or public.is_reviewer()
  ) then
    raise exception 'admin_list_review_cases: forbidden';
  end if;

  v_offset := (v_page - 1) * v_size;

  if v_needle is not null then
    begin
      v_uuid := v_needle::uuid;
      v_uuid_ok := true;
    exception
      when invalid_text_representation then
        v_uuid_ok := false;
    end;
  end if;

  return query
  with base as (
    select
      rt.id as tid,
      rt.organization_id as org_id,
      o.name as org_name,
      rt.app_user_id as trainee_id,
      rt.context_type as ctx,
      rt.alert_id as aid,
      rt.user_id as suid,
      rt.created_at as crt,
      rt.updated_at as upt,
      au.email as te,
      au.full_name as tfn,
      su.email as sue,
      su.full_name as sufn,
      case
        when lrs.id is null then 'draft'::text
        else lrs.review_state::text
      end as cphase,
      case
        when v_basis = 'thread_created' then rt.created_at
        else greatest(
          rt.updated_at,
          coalesce(lrs.updated_at, lrs.submitted_at, lrs.created_at, rt.created_at)
        )
      end as act_at
    from public.review_threads rt
    join public.organizations o on o.id = rt.organization_id
    join public.app_users au on au.id = rt.app_user_id
    left join public.users su on su.id = rt.user_id
    left join lateral (
      select rs.id, rs.review_state, rs.submitted_at, rs.created_at, rs.updated_at
      from public.review_submissions rs
      where rs.thread_id = rt.id
      order by rs.submission_version desc
      limit 1
    ) lrs on true
    where
      (
        (
          public.is_super_admin()
          and (p_organization_id is null or rt.organization_id = p_organization_id)
        )
        or (
          public.is_ops_admin()
          and exists (
            select 1
            from public.organizations o2
            where o2.id = rt.organization_id
              and o2.org_type = any (array['internal'::text, 'b2c'::text])
          )
        )
        or (
          public.is_reviewer()
          and rt.organization_id = public.current_org_id_v2()
        )
      )
      and (v_ctx = 'all' or rt.context_type = v_ctx)
      and (p_trainee_app_user_id is null or rt.app_user_id = p_trainee_app_user_id)
      and (p_simulator_user_id is null or rt.user_id = p_simulator_user_id)
      and (p_alert_id is null or rt.alert_id = p_alert_id)
      and (
        v_phase = 'all'
        or (v_phase = 'draft' and lrs.id is null)
        or (
          v_phase = 'done'
          and lrs.id is not null
          and lrs.review_state in ('approved', 'closed')
        )
        or (
          v_phase not in ('all', 'draft', 'done')
          and lrs.id is not null
          and lrs.review_state::text = v_phase
        )
      )
      and (
        p_date_from is null
        or (
          case
            when v_basis = 'thread_created' then rt.created_at
            else greatest(
              rt.updated_at,
              coalesce(lrs.updated_at, lrs.submitted_at, lrs.created_at, rt.created_at)
            )
          end
        ) >= p_date_from
      )
      and (
        p_date_to is null
        or (
          case
            when v_basis = 'thread_created' then rt.created_at
            else greatest(
              rt.updated_at,
              coalesce(lrs.updated_at, lrs.submitted_at, lrs.created_at, rt.created_at)
            )
          end
        ) < p_date_to
      )
      and (
        v_needle is null
        or (
          (
            v_uuid_ok
            and (
              rt.id = v_uuid
              or rt.app_user_id = v_uuid
              or rt.user_id = v_uuid
            )
          )
          or coalesce(rt.alert_id, '') = v_needle
          or coalesce(rt.alert_id, '') ilike '%' || v_needle || '%'
          or coalesce(au.email, '') ilike '%' || v_needle || '%'
          or coalesce(au.full_name, '') ilike '%' || v_needle || '%'
          or coalesce(su.email, '') ilike '%' || v_needle || '%'
          or coalesce(su.full_name, '') ilike '%' || v_needle || '%'
        )
      )
  ),
  numbered as (
    select
      b.*,
      count(*) over () as tc
    from base b
  )
  select
    n.tid,
    n.org_id,
    n.org_name,
    n.trainee_id,
    n.ctx,
    n.aid,
    n.suid,
    n.crt,
    n.upt,
    n.te,
    n.tfn,
    n.sue,
    n.sufn,
    n.cphase,
    n.act_at,
    n.tc
  from numbered n
  order by n.act_at desc, n.tid desc
  limit v_size offset v_offset;
end;
$function$;

grant execute on function public.admin_list_review_cases(
  text, uuid, uuid, uuid, text, text, text, text, timestamptz, timestamptz, int, int
) to authenticated;
