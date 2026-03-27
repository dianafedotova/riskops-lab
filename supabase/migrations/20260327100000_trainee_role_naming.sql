-- Unify trainee role naming: app_users.role and simulator_comments.author_role use 'trainee' (not legacy 'user').
-- Staff roles unchanged (reviewer, ops_admin, super_admin). Policy intent preserved; only literals updated.

-- ---------------------------------------------------------------------------
-- 1) Constraints: drop, backfill, re-add (cannot store 'trainee' while CHECK only allows 'user')
-- ---------------------------------------------------------------------------
alter table public.app_users drop constraint if exists app_users_role_check;

update public.app_users
set role = 'trainee'
where role = 'user';

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('trainee', 'reviewer', 'ops_admin', 'super_admin'));

alter table public.simulator_comments drop constraint if exists simulator_comments_author_role_check;

update public.simulator_comments
set author_role = 'trainee'
where author_role = 'user';

alter table public.simulator_comments
  add constraint simulator_comments_author_role_check
  check (author_role in ('admin', 'trainee'));

-- ---------------------------------------------------------------------------
-- 2) RLS policies (drop + create; same names and logic)
-- ---------------------------------------------------------------------------
drop policy if exists "review_threads_insert_trainee" on public.review_threads;
create policy "review_threads_insert_trainee" on public.review_threads
  for insert to authenticated
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  );

drop policy if exists "trainee_decisions_insert" on public.trainee_decisions;
create policy "trainee_decisions_insert" on public.trainee_decisions
  for insert to authenticated
  with check (
    app_user_id in (
      select me.id from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
    and exists (
      select 1 from public.review_threads rt
      where rt.id = thread_id
        and rt.app_user_id = app_user_id
    )
  );

drop policy if exists "trainee_assign_write" on public.trainee_alert_assignments;
create policy "trainee_assign_write" on public.trainee_alert_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  )
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  );

drop policy if exists "trainee_watch_write" on public.trainee_user_watchlist;
create policy "trainee_watch_write" on public.trainee_user_watchlist
  for all to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  )
  with check (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.role = 'trainee'
    )
  );

drop policy if exists "sim_comments_insert_user" on public.simulator_comments;
create policy "sim_comments_insert_user" on public.simulator_comments
  for insert with check (
    comment_type = 'user_comment'
    and author_role = 'trainee'
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and (
      (
        thread_id is not null
        and exists (
          select 1 from public.review_threads rt
          where rt.id = thread_id
            and rt.app_user_id = author_app_user_id
        )
        and (
          parent_comment_id is null
          or exists (
            select 1
            from public.simulator_comments root
            where root.id = parent_comment_id
              and root.comment_type = 'user_comment'
              and root.author_app_user_id = author_app_user_id
              and root.thread_id = simulator_comments.thread_id
          )
        )
      )
      or (
        thread_id is null
        and (
          (user_id is not null and alert_id is null)
          or (user_id is null and alert_id is not null)
        )
        and (
          parent_comment_id is null
          or exists (
            select 1
            from public.simulator_comments root
            join public.app_users me
              on public.app_user_matches_jwt(me.auth_user_id, me.email)
            where root.id = parent_comment_id
              and root.comment_type = 'user_comment'
              and root.author_app_user_id = me.id
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Helper + update policy
-- ---------------------------------------------------------------------------
create or replace function public.trainee_top_comment_still_editable(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        c.comment_type = 'user_comment'
        and c.author_role = 'trainee'
        and c.parent_comment_id is null
        and c.thread_id is not null
        and c.created_at > now() - interval '5 minutes'
        and not exists (
          select 1
          from public.simulator_comments aq
          where aq.thread_id = c.thread_id
            and aq.comment_type = 'admin_qa'
            and aq.parent_comment_id is not null
            and (
              aq.parent_comment_id = c.id
              or exists (
                with recursive ancestors as (
                  select sc.id, sc.parent_comment_id
                  from public.simulator_comments sc
                  where sc.id = aq.parent_comment_id
                  union all
                  select sc2.id, sc2.parent_comment_id
                  from public.simulator_comments sc2
                  join ancestors a on sc2.id = a.parent_comment_id
                  where a.parent_comment_id is not null
                )
                select 1 from ancestors where id = c.id
              )
            )
        )
      from public.simulator_comments c
      where c.id = p_id
    ),
    false
  );
$$;

revoke all on function public.trainee_top_comment_still_editable(uuid) from public;
grant execute on function public.trainee_top_comment_still_editable(uuid) to authenticated;

drop policy if exists "sim_comments_update_user_trainee_root" on public.simulator_comments;
create policy "sim_comments_update_user_trainee_root" on public.simulator_comments
  for update to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and public.trainee_top_comment_still_editable(id)
  )
  with check (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and me.id = author_app_user_id
        and me.role = 'trainee'
    )
    and public.trainee_top_comment_still_editable(id)
  );
