drop index if exists public.review_threads_alert_unique_idx;

drop index if exists public.review_threads_profile_unique_idx;

alter table public.review_threads
  drop constraint if exists review_threads_alert_id_app_user_id_key;

create index if not exists review_threads_alert_app_user_created_idx
  on public.review_threads using btree (app_user_id, alert_id, created_at desc)
  where (context_type = 'alert'::text);

create index if not exists review_threads_profile_app_user_created_idx
  on public.review_threads using btree (app_user_id, user_id, created_at desc)
  where (context_type = 'profile'::text);
