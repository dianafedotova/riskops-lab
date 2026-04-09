import type { SupabaseClient } from "@supabase/supabase-js";

export type AppUserActivityEvent =
  | "alert_assignment_assigned"
  | "alert_assignment_unassigned"
  | "qa_reply_created"
  | "private_note_created"
  | "review_submission_created"
  | "review_submission_reviewed"
  | "trainee_decision_submitted"
  | "trainee_alert_review_thread_created"
  | "trainee_profile_review_thread_created"
  | "user_logged_in"
  | "watchlist_item_added"
  | "watchlist_item_removed";

export type AppUserActivityRow = {
  id: string;
  app_user_id: string;
  event_type: string;
  entity_id: string | null;
  entity_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ACTIVITY_SELECT_COLS = "id, app_user_id, event_type, entity_id, entity_type, metadata, created_at" as const;

/** Builds the row shape for `app_user_activity` (metadata jsonb, optional entity_* for alerts). */
export function buildAppUserActivityInsertRow(args: {
  appUserId: string;
  eventType: AppUserActivityEvent;
  meta?: Record<string, unknown> | null;
}): {
  app_user_id: string;
  event_type: AppUserActivityEvent;
  metadata: Record<string, unknown>;
  entity_type: string | null;
  entity_id: string | null;
} {
  const raw = { ...(args.meta ?? {}) };
  const metadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined) metadata[k] = v;
  }
  const alertIdRaw = metadata.alert_id;
  const alertId = typeof alertIdRaw === "string" && alertIdRaw.length > 0 ? alertIdRaw : null;

  return {
    app_user_id: args.appUserId,
    event_type: args.eventType,
    metadata,
    entity_type: alertId ? "alert" : null,
    entity_id: alertId,
  };
}

export async function recordAppUserActivity(
  supabase: SupabaseClient,
  args: {
    appUserId: string;
    eventType: AppUserActivityEvent;
    meta?: Record<string, unknown> | null;
  }
): Promise<{ error: string | null }> {
  const row = buildAppUserActivityInsertRow(args);
  const { error } = await supabase.from("app_user_activity").insert(row);

  return { error: error?.message ?? null };
}

export async function listAppUserActivityForAlert(
  supabase: SupabaseClient,
  args: { alertId: string; limit?: number }
): Promise<{ rows: AppUserActivityRow[]; error: string | null }> {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const { data, error } = await supabase
    .from("app_user_activity")
    .select(ACTIVITY_SELECT_COLS)
    .contains("metadata", { alert_id: args.alertId })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = ((data as AppUserActivityRow[] | null) ?? []).map((r) => ({
    ...r,
    id: String(r.id),
    app_user_id: String(r.app_user_id),
    metadata: (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>,
    entity_id: r.entity_id ?? null,
    entity_type: r.entity_type ?? null,
  }));

  return { rows, error: null };
}

export async function listAppUserActivityForAppUser(
  supabase: SupabaseClient,
  args: { appUserId: string; limit?: number }
): Promise<{ rows: AppUserActivityRow[]; error: string | null }> {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const { data, error } = await supabase
    .from("app_user_activity")
    .select(ACTIVITY_SELECT_COLS)
    .eq("app_user_id", args.appUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = ((data as AppUserActivityRow[] | null) ?? []).map((r) => ({
    ...r,
    id: String(r.id),
    app_user_id: String(r.app_user_id),
    metadata: (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>,
    entity_id: r.entity_id ?? null,
    entity_type: r.entity_type ?? null,
  }));

  return { rows, error: null };
}
