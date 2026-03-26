-- Align legacy `trainee_user_watchlist.user_id` with app + `supabase/schema.sql` (`simulator_user_id`).
-- Run in Supabase SQL editor if POST /rest/v1/trainee_user_watchlist returns 400 and the error mentions an unknown column.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trainee_user_watchlist'
      and column_name = 'user_id'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trainee_user_watchlist'
      and column_name = 'simulator_user_id'
  ) then
    alter table public.trainee_user_watchlist rename column user_id to simulator_user_id;
  end if;
end $$;
