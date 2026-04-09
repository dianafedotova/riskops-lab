-- Speed up trainee alert activity feed: filter by metadata.alert_id
CREATE INDEX IF NOT EXISTS idx_app_user_activity_metadata_alert_id
  ON public.app_user_activity ((metadata ->> 'alert_id'))
  WHERE (metadata ? 'alert_id');
