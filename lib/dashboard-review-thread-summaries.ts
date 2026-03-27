import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAlertInternalToPublicIds } from "@/lib/alerts/identity";
import { formatPostgrestError, isPostgrestUnknownColumnError } from "@/lib/trainee-user-watchlist";

export type DashboardThreadSummary = {
  threadId: string;
  targetHref: string;
  targetLabel: string;
  lastSnippet: string;
  updatedAt: string;
};

type NormalizedThreadRow = {
  id: string;
  created_at: string;
  alertPublicId: string | null;
  profileUserId: string | null;
};

/**
 * Loads review thread rows for the trainee dashboard. Supports both:
 * - New shape: `alert_id`, `user_id`, `context_type` (matches `ensure-thread.ts`)
 * - Legacy shape: `alert_internal_id`, `user_id` (matches older `schema.sql`)
 */
export async function loadReviewThreadSummariesForDashboard(
  supabase: SupabaseClient,
  appUserId: string
): Promise<{ summaries: DashboardThreadSummary[]; error: string | null }> {
  const normalized: NormalizedThreadRow[] = [];

  const modern = await supabase
    .from("review_threads")
    .select("id, alert_id, user_id, context_type, created_at")
    .eq("app_user_id", appUserId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (!modern.error) {
    const rows = (modern.data ?? []) as {
      id: string;
      alert_id: string | null;
      user_id: string | null;
      context_type: string | null;
      created_at: string;
    }[];
    for (const r of rows) {
      const ctx = (r.context_type ?? "").toLowerCase().trim();
      let alertPublicId: string | null = null;
      let profileUserId: string | null = null;
      if (ctx === "alert" || (!ctx && r.alert_id)) {
        alertPublicId = r.alert_id ? String(r.alert_id) : null;
      } else if (ctx === "profile" || (!ctx && r.user_id && !r.alert_id)) {
        profileUserId = r.user_id ? String(r.user_id) : null;
      }
      normalized.push({
        id: r.id,
        created_at: r.created_at,
        alertPublicId,
        profileUserId,
      });
    }
  } else if (isPostgrestUnknownColumnError(modern.error)) {
    const legacy = await supabase
      .from("review_threads")
      .select("id, alert_internal_id, user_id, created_at")
      .eq("app_user_id", appUserId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (legacy.error) {
      return { summaries: [], error: formatPostgrestError(legacy.error) };
    }
    const raw = (legacy.data ?? []) as {
      id: string;
      alert_internal_id: string | null;
      user_id: string | null;
      created_at: string;
    }[];
    const internalIds = [...new Set(raw.map((r) => r.alert_internal_id).filter(Boolean))] as string[];
    const { mapping: internalToPublic, error: alertMapErr } = await mapAlertInternalToPublicIds(
      supabase,
      internalIds
    );
    if (alertMapErr) {
      return { summaries: [], error: alertMapErr.message };
    }
    for (const r of raw) {
      const intId = r.alert_internal_id ? String(r.alert_internal_id) : null;
      normalized.push({
        id: r.id,
        created_at: r.created_at,
        alertPublicId: intId ? internalToPublic.get(intId) ?? null : null,
        profileUserId: r.user_id ? String(r.user_id) : null,
      });
    }
  } else {
    return { summaries: [], error: formatPostgrestError(modern.error) };
  }

  const tIds = normalized.map((t) => t.id);
  const decMap = new Map<string, { snippet: string; at: string }>();
  if (tIds.length > 0) {
    const { data: decs, error: dErr } = await supabase
      .from("trainee_decisions")
      .select("thread_id, decision, rationale, created_at")
      .in("thread_id", tIds)
      .order("created_at", { ascending: false });
    if (dErr) {
      return { summaries: [], error: formatPostgrestError(dErr) };
    }
    for (const d of (decs ?? []) as {
      thread_id: string;
      decision: string;
      rationale: string | null;
      created_at: string;
    }[]) {
      if (!decMap.has(d.thread_id)) {
        const snippet = (d.rationale ?? d.decision ?? "").trim() || "—";
        decMap.set(d.thread_id, { snippet, at: d.created_at });
      }
    }
  }

  const alertIds = Array.from(
    new Set(normalized.map((t) => t.alertPublicId).filter(Boolean))
  ) as string[];
  const alertPublic = new Set<string>();
  if (alertIds.length > 0) {
    const { data: alRows, error: apErr } = await supabase.from("alerts").select("id").in("id", alertIds);
    if (apErr) {
      return { summaries: [], error: formatPostgrestError(apErr) };
    }
    for (const a of (alRows ?? []) as { id: string }[]) {
      alertPublic.add(String(a.id));
    }
  }

  const summaries: DashboardThreadSummary[] = normalized.map((rt) => {
    let targetHref = "/";
    let targetLabel = "Thread";
    if (rt.alertPublicId) {
      const pid = alertPublic.has(String(rt.alertPublicId)) ? String(rt.alertPublicId) : "—";
      targetHref = `/alerts/${pid}`;
      targetLabel = `Alert ${pid}`;
    } else if (rt.profileUserId) {
      targetHref = `/users/${rt.profileUserId}`;
      targetLabel = `User ${rt.profileUserId}`;
    }
    const dec = decMap.get(rt.id);
    return {
      threadId: rt.id,
      targetHref,
      targetLabel,
      lastSnippet: dec?.snippet ?? "No decisions yet",
      updatedAt: dec?.at ?? rt.created_at,
    };
  });

  return { summaries, error: null };
}
