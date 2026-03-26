import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve review_threads.id for an alert (internal_id).
 * When appUserId is set (trainee), returns that user's thread only.
 * When omitted (e.g. admin), returns the most recently created thread for the alert.
 */
export async function fetchReviewThreadIdForAlert(
  supabase: SupabaseClient,
  alertInternalId: string,
  appUserId?: string | null
): Promise<{ threadId: string | null; error: Error | null }> {
  const { data: alertRow, error: alertErr } = await supabase
    .from("alerts")
    .select("id")
    .eq("internal_id", alertInternalId)
    .maybeSingle();
  if (alertErr) return { threadId: null, error: new Error(alertErr.message) };
  if (!alertRow?.id) return { threadId: null, error: new Error("Alert not found") };

  let q = supabase
    .from("review_threads")
    .select("id")
    .eq("alert_id", alertRow.id)
    .eq("context_type", "alert");
  if (appUserId) {
    q = q.eq("app_user_id", appUserId);
  }
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return { threadId: null, error: new Error(error.message) };
  return { threadId: data?.id ? String(data.id) : null, error: null };
}

/**
 * Resolve review_threads.id for a simulator user profile workspace.
 * When appUserId is set (trainee), scopes to that trainee + profile.
 * When omitted (admin), latest thread for that simulator user across trainees.
 */
export async function fetchReviewThreadIdForProfile(
  supabase: SupabaseClient,
  simulatorUserId: string,
  appUserId?: string | null
): Promise<{ threadId: string | null; error: Error | null }> {
  let q = supabase
    .from("review_threads")
    .select("id")
    .eq("user_id", simulatorUserId)
    .eq("context_type", "profile");
  if (appUserId) {
    q = q.eq("app_user_id", appUserId);
  }
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return { threadId: null, error: new Error(error.message) };
  return { threadId: data?.id ? String(data.id) : null, error: null };
}
