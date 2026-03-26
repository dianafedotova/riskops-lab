import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureAlertReviewThread(
  supabase: SupabaseClient,
  appUserId: string,
  alertInternalId: string
): Promise<{ threadId: string; error: Error | null }> {
  const { data: alertRow, error: alertErr } = await supabase
    .from("alerts")
    .select("id")
    .eq("internal_id", alertInternalId)
    .maybeSingle();
  if (alertErr) return { threadId: "", error: new Error(alertErr.message) };
  if (!alertRow?.id) return { threadId: "", error: new Error("Alert not found") };

  const { data: existing, error: selErr } = await supabase
    .from("review_threads")
    .select("id")
    .eq("app_user_id", appUserId)
    .eq("alert_id", alertRow.id)
    .eq("context_type", "alert")
    .maybeSingle();
  if (selErr) return { threadId: "", error: new Error(selErr.message) };
  if (existing?.id) return { threadId: String(existing.id), error: null };

  const { data: ins, error } = await supabase
    .from("review_threads")
    .insert({
      app_user_id: appUserId,
      alert_id: alertRow.id,
      user_id: null,
      context_type: "alert",
    })
    .select("id")
    .single();
  if (error) return { threadId: "", error: new Error(error.message) };
  return { threadId: String(ins!.id), error: null };
}

export async function ensureUserReviewThread(
  supabase: SupabaseClient,
  appUserId: string,
  simulatorUserId: string
): Promise<{ threadId: string; error: Error | null }> {
  const { data: existing, error: selErr } = await supabase
    .from("review_threads")
    .select("id")
    .eq("app_user_id", appUserId)
    .eq("user_id", simulatorUserId)
    .eq("context_type", "profile")
    .maybeSingle();
  if (selErr) return { threadId: "", error: new Error(selErr.message) };
  if (existing?.id) return { threadId: String(existing.id), error: null };

  const { data: ins, error } = await supabase
    .from("review_threads")
    .insert({
      app_user_id: appUserId,
      alert_id: null,
      user_id: simulatorUserId,
      context_type: "profile",
    })
    .select("id")
    .single();
  if (error) return { threadId: "", error: new Error(error.message) };
  return { threadId: String(ins!.id), error: null };
}
