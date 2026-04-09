create table if not exists public.trainee_user_status_overrides (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainee_user_status_overrides_status_check
    check (status in ('active', 'not_active', 'restricted', 'blocked', 'closed'))
);

create unique index if not exists trainee_user_status_overrides_app_user_user_uidx
  on public.trainee_user_status_overrides (app_user_id, user_id);

create index if not exists trainee_user_status_overrides_user_idx
  on public.trainee_user_status_overrides (user_id, updated_at desc);

alter table public.trainee_user_status_overrides enable row level security;

grant select, insert, update, delete on public.trainee_user_status_overrides to authenticated;

drop policy if exists "trainee_user_status_overrides_select" on public.trainee_user_status_overrides;
create policy "trainee_user_status_overrides_select"
on public.trainee_user_status_overrides
for select
to authenticated
using (
  public.is_trainee()
  and app_user_id = public.current_app_user_id_v2()
);

drop policy if exists "trainee_user_status_overrides_insert" on public.trainee_user_status_overrides;
create policy "trainee_user_status_overrides_insert"
on public.trainee_user_status_overrides
for insert
to authenticated
with check (
  public.is_trainee()
  and app_user_id = public.current_app_user_id_v2()
);

drop policy if exists "trainee_user_status_overrides_update" on public.trainee_user_status_overrides;
create policy "trainee_user_status_overrides_update"
on public.trainee_user_status_overrides
for update
to authenticated
using (
  public.is_trainee()
  and app_user_id = public.current_app_user_id_v2()
)
with check (
  public.is_trainee()
  and app_user_id = public.current_app_user_id_v2()
);

drop policy if exists "trainee_user_status_overrides_delete" on public.trainee_user_status_overrides;
create policy "trainee_user_status_overrides_delete"
on public.trainee_user_status_overrides
for delete
to authenticated
using (
  public.is_trainee()
  and app_user_id = public.current_app_user_id_v2()
);

drop trigger if exists trg_set_updated_at_trainee_user_status_overrides on public.trainee_user_status_overrides;
create trigger trg_set_updated_at_trainee_user_status_overrides
before update on public.trainee_user_status_overrides
for each row execute function public.set_updated_at();

create or replace function public.submit_review_submission(
  p_thread_id uuid,
  p_submitted_root_comment_id uuid default null,
  p_review_target_type text default 'human'
)
returns public.review_submissions
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_thread public.review_threads%rowtype;
  v_decision public.trainee_decisions%rowtype;
  v_submission public.review_submissions%rowtype;
  v_next_version integer;
  v_user_status_snapshot text;
begin
  if p_thread_id is null then
    raise exception 'submit_review_submission: p_thread_id is required';
  end if;

  if not public.is_trainee() then
    raise exception 'submit_review_submission: only trainee can submit';
  end if;

  if p_review_target_type not in ('human', 'ai') then
    raise exception 'submit_review_submission: invalid review target type %', p_review_target_type;
  end if;

  select *
    into v_thread
  from public.review_threads
  where id = p_thread_id;

  if not found then
    raise exception 'submit_review_submission: thread % not found', p_thread_id;
  end if;

  if v_thread.app_user_id <> public.current_app_user_id_v2() then
    raise exception 'submit_review_submission: thread % is not owned by current trainee', p_thread_id;
  end if;

  if p_submitted_root_comment_id is not null then
    if not exists (
      select 1
      from public.simulator_comments sc
      where sc.id = p_submitted_root_comment_id
        and sc.thread_id = p_thread_id
        and sc.author_app_user_id = public.current_app_user_id_v2()
        and sc.comment_type = 'user_comment'
        and sc.parent_comment_id is null
        and coalesce(sc.is_deleted, false) = false
    ) then
      raise exception 'submit_review_submission: submitted root comment % is invalid for thread %', p_submitted_root_comment_id, p_thread_id;
    end if;
  end if;

  select *
    into v_decision
  from public.trainee_decisions td
  where td.thread_id = p_thread_id
    and td.app_user_id = public.current_app_user_id_v2()
  order by coalesce(td.version_no, 0) desc, td.created_at desc
  limit 1;

  if p_submitted_root_comment_id is null and v_decision.id is null then
    raise exception 'submit_review_submission: at least a root comment or draft decision is required';
  end if;

  select coalesce(
      (
        select tuo.status
        from public.trainee_user_status_overrides tuo
        where tuo.app_user_id = public.current_app_user_id_v2()
          and tuo.user_id = v_thread.user_id
        order by tuo.updated_at desc
        limit 1
      ),
      (
        select u.status
        from public.users u
        where u.id = v_thread.user_id
      )
    )
    into v_user_status_snapshot;

  select coalesce(max(rs.submission_version), 0) + 1
    into v_next_version
  from public.review_submissions rs
  where rs.thread_id = p_thread_id;

  insert into public.review_submissions (
    thread_id,
    organization_id,
    app_user_id,
    alert_id,
    user_id,
    submission_version,
    submitted_root_comment_id,
    decision_snapshot,
    proposed_alert_status,
    user_status_snapshot,
    alert_status_snapshot,
    rationale_snapshot,
    review_state,
    review_target_type
  )
  values (
    v_thread.id,
    v_thread.organization_id,
    public.current_app_user_id_v2(),
    v_thread.alert_id,
    v_thread.user_id,
    v_next_version,
    p_submitted_root_comment_id,
    v_decision.decision,
    v_decision.proposed_alert_status,
    v_user_status_snapshot,
    (select a.status from public.alerts a where a.id = v_thread.alert_id),
    v_decision.rationale,
    'submitted',
    p_review_target_type
  )
  returning * into v_submission;

  update public.trainee_decisions
  set review_state = 'submitted',
      submitted_at = coalesce(submitted_at, now()),
      updated_at = now()
  where id = v_decision.id;

  update public.review_threads
  set status = 'in_review',
      updated_at = now()
  where id = p_thread_id;

  return v_submission;
end;
$function$;

grant execute on function public.submit_review_submission(uuid, uuid, text) to authenticated;
