import type { SupabaseClient } from "@supabase/supabase-js";

export type AppUserActivityEvent =
  | "alert_assignment_assigned"
  | "alert_assignment_unassigned"
  | "qa_reply_created"
  | "private_note_created"
  | "trainee_decision_submitted"
  | "watchlist_item_added"
  | "watchlist_item_removed";

export async function recordAppUserActivity(
  supabase: SupabaseClient,
  args: {
    appUserId: string;
    eventType: AppUserActivityEvent;
    meta?: Record<string, unknown> | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("app_user_activity").insert({
    app_user_id: args.appUserId,
    event_type: args.eventType,
    meta: args.meta ?? null,
  });

  return { error: error?.message ?? null };
}
