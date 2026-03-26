-- App expects review_threads.user_id (FK to public.users) for profile review workspaces.
-- Run once if your project still has simulator_user_id from an older schema.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_threads'
      and column_name = 'simulator_user_id'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_threads'
      and column_name = 'user_id'
  ) then
    alter table public.review_threads rename column simulator_user_id to user_id;
  end if;
end $$;
