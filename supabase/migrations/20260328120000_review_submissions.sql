create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.review_threads (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  alert_id text null references public.alerts (id) on delete set null,
  user_id uuid null references public.users (id) on delete set null,
  submission_version integer not null,
  submitted_root_comment_id uuid null references public.simulator_comments (id) on delete set null,
  submitted_at timestamptz not null default now(),
  decision_snapshot text null,
  proposed_alert_status text null,
  user_status_snapshot text null,
  alert_status_snapshot text null,
  rationale_snapshot text null,
  review_state text not null default 'submitted',
  evaluation text null,
  feedback text null,
  review_target_type text not null default 'human',
  reviewed_by_app_user_id uuid null references public.app_users (id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_submissions_review_state_check
    check (review_state in (
      'submitted',
      'in_review',
      'changes_requested',
      'approved',
      'closed'
    )),
  constraint review_submissions_evaluation_check
    check (evaluation in (
      'needs_work',
      'developing',
      'solid',
      'excellent'
    ) or evaluation is null),
  constraint review_submissions_target_check
    check (alert_id is not null or user_id is not null),
  constraint review_submissions_review_target_type_check
    check (review_target_type in ('human', 'ai'))
);

alter table public.review_submissions
  add column if not exists organization_id uuid;

alter table public.review_submissions
  add column if not exists app_user_id uuid;

alter table public.review_submissions
  add column if not exists alert_id text;

alter table public.review_submissions
  add column if not exists user_id uuid;

alter table public.review_submissions
  add column if not exists submission_version integer;

alter table public.review_submissions
  add column if not exists submitted_root_comment_id uuid;

alter table public.review_submissions
  add column if not exists submitted_at timestamptz not null default now();

alter table public.review_submissions
  add column if not exists decision_snapshot text;

alter table public.review_submissions
  add column if not exists proposed_alert_status text;

alter table public.review_submissions
  add column if not exists user_status_snapshot text;

alter table public.review_submissions
  add column if not exists alert_status_snapshot text;

alter table public.review_submissions
  add column if not exists rationale_snapshot text;

alter table public.review_submissions
  add column if not exists review_state text not null default 'submitted';

alter table public.review_submissions
  add column if not exists evaluation text;

alter table public.review_submissions
  add column if not exists feedback text;

alter table public.review_submissions
  add column if not exists review_target_type text not null default 'human';

alter table public.review_submissions
  add column if not exists reviewed_by_app_user_id uuid;

alter table public.review_submissions
  add column if not exists reviewed_at timestamptz;

alter table public.review_submissions
  add column if not exists created_at timestamptz not null default now();

alter table public.review_submissions
  add column if not exists updated_at timestamptz not null default now();

update public.review_submissions rs
set organization_id = rt.organization_id
from public.review_threads rt
where rs.thread_id = rt.id
  and rs.organization_id is null;

alter table public.review_submissions
  alter column organization_id set not null;

alter table public.review_submissions
  alter column app_user_id set not null;

alter table public.review_submissions
  alter column submission_version set not null;

alter table public.review_submissions
  alter column review_state set default 'submitted';

alter table public.review_submissions
  alter column review_target_type set default 'human';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_submissions_organization_id_fkey'
  ) then
    alter table public.review_submissions
      add constraint review_submissions_organization_id_fkey
      foreign key (organization_id) references public.organizations (id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_submissions_app_user_id_fkey'
  ) then
    alter table public.review_submissions
      add constraint review_submissions_app_user_id_fkey
      foreign key (app_user_id) references public.app_users (id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_submissions_alert_id_fkey'
  ) then
    alter table public.review_submissions
      add constraint review_submissions_alert_id_fkey
      foreign key (alert_id) references public.alerts (id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_submissions_user_id_fkey'
  ) then
    alter table public.review_submissions
      add constraint review_submissions_user_id_fkey
      foreign key (user_id) references public.users (id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_submissions_submitted_root_comment_id_fkey'
  ) then
    alter table public.review_submissions
      add constraint review_submissions_submitted_root_comment_id_fkey
      foreign key (submitted_root_comment_id) references public.simulator_comments (id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_submissions_reviewed_by_app_user_id_fkey'
  ) then
    alter table public.review_submissions
      add constraint review_submissions_reviewed_by_app_user_id_fkey
      foreign key (reviewed_by_app_user_id) references public.app_users (id) on delete set null;
  end if;
end
$$;

create index if not exists review_submissions_thread_idx
  on public.review_submissions (thread_id, submitted_at desc);

create unique index if not exists review_submissions_thread_version_uidx
  on public.review_submissions (thread_id, submission_version);

create index if not exists review_submissions_state_idx
  on public.review_submissions (review_state, submitted_at desc);

create index if not exists review_submissions_org_idx
  on public.review_submissions (organization_id, submitted_at desc);

alter table public.review_submissions enable row level security;

grant select, insert, update, delete on public.review_submissions to authenticated;

create or replace function public.tg_set_org_from_context()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
begin
  if tg_table_name = 'review_threads' then
    new.organization_id := (select organization_id from public.app_users where id = new.app_user_id);
  elsif tg_table_name = 'simulator_comments' then
    new.organization_id := (select organization_id from public.review_threads where id = new.thread_id);
  elsif tg_table_name = 'trainee_decisions' then
    new.organization_id := (select organization_id from public.review_threads where id = new.thread_id);
  elsif tg_table_name = 'review_submissions' then
    new.organization_id := (select organization_id from public.review_threads where id = new.thread_id);
  end if;

  if new.organization_id is null then
    raise exception 'organization_id cannot be resolved for %', tg_table_name;
  end if;

  return new;
end;
$function$;

drop policy if exists "review_submissions_select" on public.review_submissions;
create policy "review_submissions_select"
on public.review_submissions
as permissive
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_ops_admin()
    and exists (
      select 1
      from public.organizations o
      where o.id = review_submissions.organization_id
        and o.org_type = any (array['internal'::text, 'b2c'::text])
    )
  )
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
  or (public.is_trainee() and app_user_id = public.current_app_user_id_v2())
);

drop policy if exists "review_submissions_insert" on public.review_submissions;
create policy "review_submissions_insert"
on public.review_submissions
as permissive
for insert
to authenticated
with check (
  public.is_trainee()
  and app_user_id = public.current_app_user_id_v2()
  and organization_id = public.current_org_id_v2()
);

drop policy if exists "review_submissions_update" on public.review_submissions;
create policy "review_submissions_update"
on public.review_submissions
as permissive
for update
to authenticated
using (
  public.is_super_admin()
  or public.is_ops_admin()
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
)
with check (
  public.is_super_admin()
  or public.is_ops_admin()
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
);

drop policy if exists "review_submissions_delete" on public.review_submissions;
create policy "review_submissions_delete"
on public.review_submissions
as permissive
for delete
to authenticated
using (
  public.is_super_admin()
  or public.is_ops_admin()
  or (public.is_reviewer() and organization_id = public.current_org_id_v2())
);

drop trigger if exists trg_review_submissions_set_org on public.review_submissions;
create trigger trg_review_submissions_set_org
before insert or update on public.review_submissions
for each row execute function public.tg_set_org_from_context();

drop trigger if exists trg_set_updated_at_review_submissions on public.review_submissions;
create trigger trg_set_updated_at_review_submissions
before update on public.review_submissions
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
    (select u.status from public.users u where u.id = v_thread.user_id),
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
  order by rs.submission_version desc, rs.submitted_at desc;
end;
$function$;

create or replace function public.get_latest_review_submission(
  p_thread_id uuid
)
returns public.review_submissions
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_thread public.review_threads%rowtype;
  v_submission public.review_submissions%rowtype;
begin
  select *
    into v_thread
  from public.review_threads
  where id = p_thread_id;

  if not found then
    raise exception 'get_latest_review_submission: thread % not found', p_thread_id;
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
    raise exception 'get_latest_review_submission: access denied for thread %', p_thread_id;
  end if;

  select rs.*
    into v_submission
  from public.review_submissions rs
  where rs.thread_id = p_thread_id
  order by rs.submission_version desc, rs.submitted_at desc
  limit 1;

  return v_submission;
end;
$function$;

create or replace function public.review_review_submission(
  p_submission_id uuid,
  p_review_state text,
  p_evaluation text default null,
  p_feedback text default null
)
returns public.review_submissions
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_submission public.review_submissions%rowtype;
begin
  if p_submission_id is null then
    raise exception 'review_review_submission: p_submission_id is required';
  end if;

  if not (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer()) then
    raise exception 'review_review_submission: only reviewer roles can review submissions';
  end if;

  if p_review_state not in ('in_review', 'changes_requested', 'approved', 'closed') then
    raise exception 'review_review_submission: invalid review state %', p_review_state;
  end if;

  if p_evaluation is not null and p_evaluation not in ('needs_work', 'developing', 'solid', 'excellent') then
    raise exception 'review_review_submission: invalid evaluation %', p_evaluation;
  end if;

  select *
    into v_submission
  from public.review_submissions
  where id = p_submission_id;

  if not found then
    raise exception 'review_review_submission: submission % not found', p_submission_id;
  end if;

  if public.is_reviewer() and v_submission.organization_id <> public.current_org_id_v2() then
    raise exception 'review_review_submission: submission % is outside current reviewer organization', p_submission_id;
  end if;

  if public.is_ops_admin() and not exists (
    select 1
    from public.organizations o
    where o.id = v_submission.organization_id
      and o.org_type = any (array['internal'::text, 'b2c'::text])
  ) then
    raise exception 'review_review_submission: submission % is outside allowed ops_admin organizations', p_submission_id;
  end if;

  update public.review_submissions
  set review_state = p_review_state,
      evaluation = p_evaluation,
      feedback = p_feedback,
      reviewed_by_app_user_id = public.current_app_user_id_v2(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_submission_id
  returning * into v_submission;

  update public.review_threads
  set status = case
        when p_review_state = 'in_review' then 'in_review'
        when p_review_state = 'changes_requested' then 'qa_replied'
        else 'closed'
      end,
      updated_at = now()
  where id = v_submission.thread_id;

  return v_submission;
end;
$function$;

grant execute on function public.submit_review_submission(uuid, uuid, text) to authenticated;
grant execute on function public.list_review_submissions(uuid) to authenticated;
grant execute on function public.get_latest_review_submission(uuid) to authenticated;
grant execute on function public.review_review_submission(uuid, text, text, text) to authenticated;
