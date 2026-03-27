-- app_users.role: legacy 'admin' -> staff roles (reviewer, ops_admin, super_admin).
-- RLS: use public.app_user_is_staff() where policies previously checked au/me.role = 'admin'.

create or replace function public.app_user_is_staff(p_role text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_role in ('reviewer', 'ops_admin', 'super_admin');
$$;

grant execute on function public.app_user_is_staff(text) to authenticated;

-- Must drop the old check first: legacy allows only ('admin','user'), so SET super_admin would fail before drop.
alter table public.app_users drop constraint if exists app_users_role_check;

update public.app_users set role = 'super_admin' where role = 'admin';

-- Any other non-trainee / unknown value -> super_admin so the new check can be applied safely.
update public.app_users
set role = 'super_admin'
where role is not null
  and role <> 'user'
  and role not in ('reviewer', 'ops_admin', 'super_admin');

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('user', 'reviewer', 'ops_admin', 'super_admin'));

drop policy if exists "sim_comments_select_admin" on public.simulator_comments;
create policy "sim_comments_select_admin" on public.simulator_comments
  for select using (
    exists (
      select 1
      from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );

drop policy if exists "sim_comments_insert_admin_qa" on public.simulator_comments;
create policy "sim_comments_insert_admin_qa" on public.simulator_comments
  for insert with check (
    comment_type = 'admin_qa'
    and author_role = 'admin'
    and parent_comment_id is not null
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
    )
    and exists (
      select 1 from public.simulator_comments p
      where p.id = parent_comment_id
        and p.comment_type = 'user_comment'
        and (
          simulator_comments.thread_id is null
          or p.thread_id = simulator_comments.thread_id
        )
    )
  );

drop policy if exists "sim_comments_insert_admin_private" on public.simulator_comments;
create policy "sim_comments_insert_admin_private" on public.simulator_comments
  for insert with check (
    comment_type = 'admin_private'
    and author_role = 'admin'
    and parent_comment_id is null
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
        and me.id = author_app_user_id
    )
  );

drop policy if exists "admin_private_notes_select_own" on public.admin_private_notes;
create policy "admin_private_notes_select_own" on public.admin_private_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
        and me.id = author_app_user_id
    )
  );

drop policy if exists "admin_private_notes_insert_own" on public.admin_private_notes;
create policy "admin_private_notes_insert_own" on public.admin_private_notes
  for insert to authenticated
  with check (
    author_role = 'admin'
    and exists (
      select 1 from public.app_users me
      where public.app_user_matches_jwt(me.auth_user_id, me.email)
        and public.app_user_is_staff(me.role)
        and me.id = author_app_user_id
    )
  );

drop policy if exists "review_threads_select_trainee" on public.review_threads;
create policy "review_threads_select_trainee" on public.review_threads
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );

drop policy if exists "trainee_decisions_select" on public.trainee_decisions;
create policy "trainee_decisions_select" on public.trainee_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.review_threads rt
      join public.app_users me on me.id = rt.app_user_id
      where rt.id = thread_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );

drop policy if exists "trainee_assign_select" on public.trainee_alert_assignments;
create policy "trainee_assign_select" on public.trainee_alert_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );

drop policy if exists "trainee_watch_select" on public.trainee_user_watchlist;
create policy "trainee_watch_select" on public.trainee_user_watchlist
  for select to authenticated
  using (
    exists (
      select 1 from public.app_users me
      where me.id = app_user_id
        and public.app_user_matches_jwt(me.auth_user_id, me.email)
    )
    or exists (
      select 1 from public.app_users au
      where public.app_user_matches_jwt(au.auth_user_id, au.email)
        and public.app_user_is_staff(au.role)
    )
  );
