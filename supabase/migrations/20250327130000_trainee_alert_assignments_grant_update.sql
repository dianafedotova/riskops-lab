-- Upserts need UPDATE; plain inserts work with insert-only grants, but this matches `supabase/schema.sql`.
grant select, insert, update, delete on public.trainee_alert_assignments to authenticated;
