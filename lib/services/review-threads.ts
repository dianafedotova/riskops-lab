import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAlertContextIds, type AlertContextIds } from "@/lib/alerts/identity";
import { recordAppUserActivity } from "@/lib/services/app-user-activity";

export async function ensureAlertReviewThreadForContext(
  supabase: SupabaseClient,
  appUserId: string,
  alert: AlertContextIds
): Promise<{ threadId: string; error: Error | null }> {
  const { ids, error: alertErr } = await resolveAlertContextIds(supabase, alert);
  if (alertErr || !ids.publicId) {
    return { threadId: "", error: alertErr ?? new Error("Alert not found") };
  }

  const { data: existing, error: selErr } = await supabase
    .from("review_threads")
    .select("id")
    .eq("app_user_id", appUserId)
    .eq("alert_id", ids.publicId)
    .eq("context_type", "alert")
    .maybeSingle();
  if (selErr) return { threadId: "", error: new Error(selErr.message) };
  if (existing?.id) return { threadId: String(existing.id), error: null };

  const { data: alertRow, error: alertLoadErr } = await supabase
    .from("alerts")
    .select("id, user_id")
    .eq("id", ids.publicId)
    .maybeSingle();
  if (alertLoadErr) {
    return { threadId: "", error: new Error(alertLoadErr.message) };
  }
  if (!alertRow?.user_id) {
    return { threadId: "", error: new Error("Alert owner is missing, so review case could not be created.") };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("review_threads")
    .insert({
      app_user_id: appUserId,
      alert_id: ids.publicId,
      user_id: String(alertRow.user_id),
      context_type: "alert",
    })
    .select("id")
    .single();
  if (insErr) return { threadId: "", error: new Error(insErr.message) };

  const threadId = String(inserted.id);
  void recordAppUserActivity(supabase, {
    appUserId: appUserId,
    eventType: "trainee_alert_review_thread_created",
    meta: {
      alert_id: ids.publicId,
      thread_id: threadId,
      context_type: "alert",
    },
  });

  return { threadId, error: null };
}

export async function createAlertReviewThreadForContext(
  supabase: SupabaseClient,
  appUserId: string,
  alert: AlertContextIds
): Promise<{ threadId: string; error: Error | null }> {
  const { ids, error: alertErr } = await resolveAlertContextIds(supabase, alert);
  if (alertErr || !ids.publicId) {
    return { threadId: "", error: alertErr ?? new Error("Alert not found") };
  }

  const { data: alertRow, error: alertLoadErr } = await supabase
    .from("alerts")
    .select("id, user_id")
    .eq("id", ids.publicId)
    .maybeSingle();
  if (alertLoadErr) {
    return { threadId: "", error: new Error(alertLoadErr.message) };
  }
  if (!alertRow?.user_id) {
    return { threadId: "", error: new Error("Alert owner is missing, so review case could not be created.") };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("review_threads")
    .insert({
      app_user_id: appUserId,
      alert_id: ids.publicId,
      user_id: String(alertRow.user_id),
      context_type: "alert",
    })
    .select("id")
    .single();
  if (insErr) return { threadId: "", error: new Error(insErr.message) };

  const threadId = String(inserted.id);
  void recordAppUserActivity(supabase, {
    appUserId: appUserId,
    eventType: "trainee_alert_review_thread_created",
    meta: {
      alert_id: ids.publicId,
      thread_id: threadId,
      context_type: "alert",
    },
  });

  return { threadId, error: null };
}

export async function ensureProfileReviewThreadForContext(
  supabase: SupabaseClient,
  appUserId: string,
  simulatorUserId: string
): Promise<{ threadId: string; error: Error | null }> {
  const { data: existing, error: selectError } = await supabase
    .from("review_threads")
    .select("id")
    .eq("app_user_id", appUserId)
    .eq("user_id", simulatorUserId)
    .eq("context_type", "profile")
    .maybeSingle();

  if (selectError) {
    return { threadId: "", error: new Error(selectError.message) };
  }

  if (existing?.id) {
    return { threadId: String(existing.id), error: null };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("review_threads")
    .insert({
      app_user_id: appUserId,
      alert_id: null,
      user_id: simulatorUserId,
      context_type: "profile",
    })
    .select("id")
    .single();

  if (insertError) {
    return { threadId: "", error: new Error(insertError.message) };
  }

  const threadId = String(inserted.id);
  void recordAppUserActivity(supabase, {
    appUserId: appUserId,
    eventType: "trainee_profile_review_thread_created",
    meta: {
      thread_id: threadId,
      simulator_user_id: simulatorUserId,
      context_type: "profile",
    },
  });

  return { threadId, error: null };
}

export async function createProfileReviewThreadForContext(
  supabase: SupabaseClient,
  appUserId: string,
  simulatorUserId: string
): Promise<{ threadId: string; error: Error | null }> {
  const { data: inserted, error: insertError } = await supabase
    .from("review_threads")
    .insert({
      app_user_id: appUserId,
      alert_id: null,
      user_id: simulatorUserId,
      context_type: "profile",
    })
    .select("id")
    .single();

  if (insertError) {
    return { threadId: "", error: new Error(insertError.message) };
  }

  const threadId = String(inserted.id);
  void recordAppUserActivity(supabase, {
    appUserId: appUserId,
    eventType: "trainee_profile_review_thread_created",
    meta: {
      thread_id: threadId,
      simulator_user_id: simulatorUserId,
      context_type: "profile",
    },
  });

  return { threadId, error: null };
}

export async function fetchAlertReviewThreadIdForContext(
  supabase: SupabaseClient,
  alert: AlertContextIds,
  appUserId?: string | null
): Promise<{ threadId: string | null; error: Error | null }> {
  const { ids, error: alertErr } = await resolveAlertContextIds(supabase, alert);
  if (alertErr || !ids.publicId) {
    return { threadId: null, error: alertErr ?? new Error("Alert not found") };
  }

  let query = supabase
    .from("review_threads")
    .select("id")
    .eq("alert_id", ids.publicId)
    .eq("context_type", "alert");

  if (appUserId) {
    query = query.eq("app_user_id", appUserId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return { threadId: null, error: new Error(error.message) };

  return { threadId: data?.id ? String(data.id) : null, error: null };
}

export async function fetchAlertReviewThreadById(
  supabase: SupabaseClient,
  threadId: string
): Promise<{
  thread:
    | {
        id: string;
        app_user_id: string;
        alert_id: string | null;
        context_type: string | null;
      }
    | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("review_threads")
    .select("id, app_user_id, alert_id, context_type")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    return { thread: null, error: new Error(error.message) };
  }

  if (!data) {
    return { thread: null, error: null };
  }

  return {
    thread: {
      id: String(data.id),
      app_user_id: String(data.app_user_id),
      alert_id: data.alert_id ? String(data.alert_id) : null,
      context_type: data.context_type ? String(data.context_type) : null,
    },
    error: null,
  };
}

export async function fetchProfileReviewThreadIdForContext(
  supabase: SupabaseClient,
  simulatorUserId: string,
  appUserId?: string | null
): Promise<{ threadId: string | null; error: Error | null }> {
  let query = supabase
    .from("review_threads")
    .select("id")
    .eq("user_id", simulatorUserId)
    .eq("context_type", "profile");

  if (appUserId) {
    query = query.eq("app_user_id", appUserId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    return { threadId: null, error: new Error(error.message) };
  }

  return { threadId: data?.id ? String(data.id) : null, error: null };
}

export async function fetchProfileReviewThreadById(
  supabase: SupabaseClient,
  threadId: string
): Promise<{
  thread:
    | {
        id: string;
        app_user_id: string;
        user_id: string | null;
        context_type: string | null;
        created_at: string;
      }
    | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("review_threads")
    .select("id, app_user_id, user_id, context_type, created_at")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    return { thread: null, error: new Error(error.message) };
  }

  if (!data) {
    return { thread: null, error: null };
  }

  return {
    thread: {
      id: String(data.id),
      app_user_id: String(data.app_user_id),
      user_id: data.user_id ? String(data.user_id) : null,
      context_type: data.context_type ? String(data.context_type) : null,
      created_at: String(data.created_at ?? ""),
    },
    error: null,
  };
}
