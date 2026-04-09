import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAlertInternalToPublicIds } from "@/lib/alerts/identity";
import { listReviewSubmissionsDirect } from "@/lib/services/review-submissions";
import type { ReviewSubmissionRow, ReviewSubmissionState } from "@/lib/types";
import { formatPostgrestError, isPostgrestUnknownColumnError } from "@/lib/trainee-user-watchlist";

/** Lifecycle of a trainee "case" derived from latest review_submission (draft = none yet). */
export type TraineeCasePhase = "draft" | ReviewSubmissionState;

export type TraineeCaseRow = {
  threadId: string;
  alertPublicId: string | null;
  profileUserId: string | null;
  targetHref: string;
  targetLabel: string;
  lastSnippet: string;
  updatedAt: string;
  latestSubmission: ReviewSubmissionRow | null;
  casePhase: TraineeCasePhase;
  alertStatus: string | null;
  simulatorUserStatus: string | null;
  profileSearchText: string;
};

export type TraineeCaseKpiCounts = {
  initiated: number;
  underReview: number;
  needsAttention: number;
  done: number;
};

type NormalizedThreadRow = {
  id: string;
  created_at: string;
  alertPublicId: string | null;
  profileUserId: string | null;
};

const DEFAULT_THREAD_CAP = 2000;

/** Latest submission per thread by max submission_version. */
export function pickLatestSubmissionByThread(rows: ReviewSubmissionRow[]): Map<string, ReviewSubmissionRow> {
  const map = new Map<string, ReviewSubmissionRow>();
  for (const row of rows) {
    const tid = String(row.thread_id);
    const prev = map.get(tid);
    if (!prev || row.submission_version > prev.submission_version) {
      map.set(tid, row);
    }
  }
  return map;
}

export function deriveCasePhase(latest: ReviewSubmissionRow | null): TraineeCasePhase {
  if (!latest) return "draft";
  return latest.review_state;
}

export function countKpiByPhase(cases: TraineeCaseRow[]): TraineeCaseKpiCounts {
  let initiated = 0;
  let underReview = 0;
  let needsAttention = 0;
  let done = 0;
  for (const c of cases) {
    switch (c.casePhase) {
      case "submitted":
        initiated += 1;
        break;
      case "in_review":
        underReview += 1;
        break;
      case "changes_requested":
        needsAttention += 1;
        break;
      case "approved":
      case "closed":
        done += 1;
        break;
      default:
        break;
    }
  }
  return { initiated, underReview, needsAttention, done };
}

/** Cases visible in dashboard preview: in progress (submitted onward), not draft / approved / closed. */
export function filterActiveCases(cases: TraineeCaseRow[]): TraineeCaseRow[] {
  return cases.filter(
    (c) => c.casePhase !== "draft" && c.casePhase !== "approved" && c.casePhase !== "closed"
  );
}

export type WorkspaceCasePhaseFilter =
  | "all"
  | "draft"
  | "submitted"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "closed"
  | "done";

export function parseWorkspaceCasePhaseParam(value: string | null | undefined): WorkspaceCasePhaseFilter {
  const v = (value ?? "").trim().toLowerCase();
  if (
    v === "all" ||
    v === "draft" ||
    v === "submitted" ||
    v === "in_review" ||
    v === "changes_requested" ||
    v === "approved" ||
    v === "closed" ||
    v === "done"
  ) {
    return v;
  }
  return "all";
}

export function caseMatchesWorkspacePhase(row: TraineeCaseRow, phase: WorkspaceCasePhaseFilter): boolean {
  if (phase === "all") return row.casePhase !== "draft";
  if (phase === "done") return row.casePhase === "approved" || row.casePhase === "closed";
  return row.casePhase === phase;
}

export function sortTraineeCasesByUpdatedAt(cases: TraineeCaseRow[]): TraineeCaseRow[] {
  return [...cases].sort((a, b) => {
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    return tb - ta;
  });
}

export type WorkspaceCaseTypeFilter = "all" | "alert" | "user";

export function parseWorkspaceCaseTypeParam(value: string | null | undefined): WorkspaceCaseTypeFilter {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "alert" || v === "user") return v;
  return "all";
}

export function filterTraineeCasesForWorkspace(
  cases: TraineeCaseRow[],
  filters: {
    phase: WorkspaceCasePhaseFilter;
    caseType: WorkspaceCaseTypeFilter;
    alertStatus: string;
    userStatus: string;
    searchQuery: string;
  }
): TraineeCaseRow[] {
  const q = filters.searchQuery.trim().toLowerCase();
  return cases.filter((c) => {
    if (!caseMatchesWorkspacePhase(c, filters.phase)) return false;
    if (filters.caseType === "alert" && !c.alertPublicId) return false;
    if (filters.caseType === "user" && !c.profileUserId) return false;
    if (filters.alertStatus !== "all") {
      const want = filters.alertStatus.trim().toLowerCase();
      if ((c.alertStatus ?? "").trim().toLowerCase() !== want) return false;
    }
    if (filters.userStatus !== "all") {
      const want = filters.userStatus.trim().toLowerCase();
      if ((c.simulatorUserStatus ?? "").trim().toLowerCase() !== want) return false;
    }
    if (q) {
      const hay = [c.profileSearchText, c.alertPublicId ?? "", c.targetLabel, c.lastSnippet]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

async function loadNormalizedThreadsForTrainee(
  supabase: SupabaseClient,
  appUserId: string,
  threadLimit: number | null
): Promise<{ normalized: NormalizedThreadRow[]; error: string | null }> {
  const normalized: NormalizedThreadRow[] = [];

  let modern = supabase
    .from("review_threads")
    .select("id, alert_id, user_id, context_type, created_at")
    .eq("app_user_id", appUserId)
    .order("created_at", { ascending: false });
  if (threadLimit != null) {
    modern = modern.limit(threadLimit);
  }
  const modernRes = await modern;

  if (!modernRes.error) {
    const rows = (modernRes.data ?? []) as {
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
    return { normalized, error: null };
  }

  if (!isPostgrestUnknownColumnError(modernRes.error)) {
    return { normalized: [], error: formatPostgrestError(modernRes.error) };
  }

  let legacy = supabase
    .from("review_threads")
    .select("id, alert_internal_id, user_id, created_at")
    .eq("app_user_id", appUserId)
    .order("created_at", { ascending: false });
  if (threadLimit != null) {
    legacy = legacy.limit(threadLimit);
  }
  const legacyRes = await legacy;
  if (legacyRes.error) {
    return { normalized: [], error: formatPostgrestError(legacyRes.error) };
  }
  const raw = (legacyRes.data ?? []) as {
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
    return { normalized: [], error: alertMapErr.message };
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
  return { normalized, error: null };
}

/**
 * Full trainee case list + KPI for one app user (My Cases / dashboard).
 * Threads, decisions, and submissions are scoped to {@link appUserId}; drafts excluded from KPI counts.
 * @param threadLimit pass null for no limit (capped internally by DEFAULT_THREAD_CAP)
 */
export async function loadTraineeCasesAndKpi(
  supabase: SupabaseClient,
  appUserId: string,
  options?: { threadLimit?: number | null }
): Promise<{ cases: TraineeCaseRow[]; kpi: TraineeCaseKpiCounts; error: string | null }> {
  const cap =
    options?.threadLimit === null ? DEFAULT_THREAD_CAP : (options?.threadLimit ?? DEFAULT_THREAD_CAP);

  const { normalized, error: normErr } = await loadNormalizedThreadsForTrainee(supabase, appUserId, cap);
  if (normErr) {
    return { cases: [], kpi: { initiated: 0, underReview: 0, needsAttention: 0, done: 0 }, error: normErr };
  }

  const tIds = normalized.map((t) => t.id);
  const decMap = new Map<string, { snippet: string; at: string }>();
  if (tIds.length > 0) {
    const { data: decs, error: dErr } = await supabase
      .from("trainee_decisions")
      .select("thread_id, decision, rationale, created_at")
      .eq("app_user_id", appUserId)
      .in("thread_id", tIds)
      .order("created_at", { ascending: false });
    if (dErr) {
      return {
        cases: [],
        kpi: { initiated: 0, underReview: 0, needsAttention: 0, done: 0 },
        error: formatPostgrestError(dErr),
      };
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

  const { rows: submissionRows, error: subErr } = await listReviewSubmissionsDirect(supabase, tIds, {
    appUserId,
  });
  if (subErr) {
    return {
      cases: [],
      kpi: { initiated: 0, underReview: 0, needsAttention: 0, done: 0 },
      error: subErr,
    };
  }
  const latestByThread = pickLatestSubmissionByThread(submissionRows);

  const alertIds = Array.from(new Set(normalized.map((t) => t.alertPublicId).filter(Boolean))) as string[];
  const alertPublic = new Set<string>();
  const alertStatusById = new Map<string, string | null>();
  if (alertIds.length > 0) {
    const { data: alRows, error: apErr } = await supabase
      .from("alerts")
      .select("id, status")
      .in("id", alertIds);
    if (apErr) {
      return {
        cases: [],
        kpi: { initiated: 0, underReview: 0, needsAttention: 0, done: 0 },
        error: formatPostgrestError(apErr),
      };
    }
    for (const a of (alRows ?? []) as { id: string; status: string | null }[]) {
      const id = String(a.id);
      alertPublic.add(id);
      alertStatusById.set(id, a.status ?? null);
    }
  }

  const profileIds = Array.from(new Set(normalized.map((t) => t.profileUserId).filter(Boolean))) as string[];
  const userMetaById = new Map<string, { status: string | null; full_name: string | null; email: string | null }>();
  if (profileIds.length > 0) {
    const { data: uRows, error: uErr } = await supabase
      .from("users")
      .select("id, status, full_name, email")
      .in("id", profileIds);
    if (uErr) {
      return {
        cases: [],
        kpi: { initiated: 0, underReview: 0, needsAttention: 0, done: 0 },
        error: formatPostgrestError(uErr),
      };
    }
    for (const u of (uRows ?? []) as {
      id: string;
      status: string | null;
      full_name: string | null;
      email: string | null;
    }[]) {
      userMetaById.set(String(u.id), {
        status: u.status ?? null,
        full_name: u.full_name ?? null,
        email: u.email ?? null,
      });
    }
  }

  const cases: TraineeCaseRow[] = normalized.map((rt) => {
    let targetHref = "/";
    let targetLabel = "Case";
    if (rt.alertPublicId) {
      const pid = alertPublic.has(String(rt.alertPublicId)) ? String(rt.alertPublicId) : "—";
      targetHref = `/alerts/${pid}`;
      targetLabel = `Alert ${pid}`;
    } else if (rt.profileUserId) {
      targetHref = `/users/${rt.profileUserId}`;
      const meta = userMetaById.get(rt.profileUserId);
      const display = meta?.full_name?.trim() || meta?.email?.trim() || rt.profileUserId;
      targetLabel = `User ${display}`;
    }

    const latest = latestByThread.get(rt.id) ?? null;
    const casePhase = deriveCasePhase(latest);
    const dec = decMap.get(rt.id);
    const subAt = latest?.submitted_at ?? latest?.updated_at ?? null;
    const updatedAt =
      subAt && dec?.at
        ? new Date(subAt) > new Date(dec.at)
          ? subAt
          : dec.at
        : subAt ?? dec?.at ?? rt.created_at;
    const lastSnippet = dec?.snippet?.trim() ?? "";

    const alertStatus = rt.alertPublicId ? alertStatusById.get(String(rt.alertPublicId)) ?? null : null;
    const uMeta = rt.profileUserId ? userMetaById.get(rt.profileUserId) : null;
    const simulatorUserStatus = uMeta?.status ?? null;
    const profileSearchText = [
      rt.profileUserId,
      uMeta?.full_name,
      uMeta?.email,
      rt.alertPublicId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      threadId: rt.id,
      alertPublicId: rt.alertPublicId,
      profileUserId: rt.profileUserId,
      targetHref,
      targetLabel,
      lastSnippet,
      updatedAt,
      latestSubmission: latest,
      casePhase,
      alertStatus,
      simulatorUserStatus,
      profileSearchText,
    };
  });

  const kpi = countKpiByPhase(cases);
  return { cases, kpi, error: null };
}

export function formatTraineeCasePhaseLabel(phase: TraineeCasePhase): string {
  if (phase === "draft") return "Draft";
  const v = phase.trim().toLowerCase();
  if (v === "in_review") return "In review";
  if (v === "changes_requested") return "Changes requested";
  if (v === "submitted") return "Submitted";
  return v.charAt(0).toUpperCase() + v.slice(1).replaceAll("_", " ");
}
