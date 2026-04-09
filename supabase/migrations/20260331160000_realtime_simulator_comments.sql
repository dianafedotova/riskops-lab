-- Allow Realtime to broadcast simulator_comments changes so staff UIs can refresh when trainees post.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'simulator_comments'
  ) then
    alter publication supabase_realtime add table public.simulator_comments;
  end if;
end
$$;
