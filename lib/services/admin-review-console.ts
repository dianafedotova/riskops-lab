import { formatDateTime } from "@/lib/format";
import type { UserRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const THREAD_COLS = "id, app_user_id, alert_id, user_id, context_type, created_at" as const;

type ReviewThreadListRow = {
  id: string;
  app_user_id: string;
  alert_id: string | null;
  user_id: string | null;
  context_type: string | null;
  created_at: string;
};

type AdminAlertRow = {
  id: string;
  internal_id: string | null;
  alert_type?: string | null;
  type?: string | null;
  severity: string | null;
  user_id: string | null;
};

export type AdminConsoleThreadListItem = {
  threadId: string;
  traineeLabel: string;
  targetLabel: string;
  targetHref: string;
  qaParentId: string | null;
  preview: string;
  created_at: string;
  createdAtLabel: string;
};

export async function listAdminConsoleThreads(
  supabase: SupabaseClient
): Promise<{ threads: AdminConsoleThreadListItem[]; error: string | null }> {
  const { data: threadRows, error: threadsErr } = await supabase
    .from("review_threads")
    .select(THREAD_COLS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (threadsErr) {
    return { threads: [], error: threadsErr.message };
  }

  const rows = (threadRows as ReviewThreadListRow[]) ?? [];
  if (rows.length === 0) {
    return { threads: [], error: null };
  }

  const threadIds = rows.map((row) => row.id);
  const traineeIds = Array.from(new Set(rows.map((row) => row.app_user_id)));
  const alertIds = Array.from(new Set(rows.map((row) => row.alert_id).filter(Boolean))) as string[];
  const simulatorUserIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];

  const [traineesRes, usersRes, alertsResPrimary, rootsRes, decisionsRes] = await Promise.all([
    supabase.from("app_users").select("id, email, full_name").in("id", traineeIds),
    simulatorUserIds.length
      ? supabase.from("users").select("id, full_name, email").in("id", simulatorUserIds)
      : Promise.resolve({ data: [], error: null }),
    alertIds.length
      ? supabase.from("alerts").select("id, internal_id, alert_type, severity, user_id").in("id", alertIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("simulator_comments")
      .select("id, thread_id, body, created_at, comment_type, parent_comment_id")
      .in("thread_id", threadIds)
      .is("parent_comment_id", null)
      .eq("comment_type", "user_comment")
      .order("created_at", { ascending: false }),
    supabase
      .from("trainee_decisions")
      .select("thread_id, rationale, decision, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
  ]);

  if (traineesRes.error) {
    return { threads: [], error: traineesRes.error.message };
  }

  if (usersRes.error) {
    return { threads: [], error: usersRes.error.message };
  }

  let alertsData: AdminAlertRow[] = [];
  if (alertsResPrimary.error && alertIds.length) {
    const alertsResFallback = await supabase
      .from("alerts")
      .select("id, internal_id, alert_type, severity, user_id")
      .in("id", alertIds);

    if (alertsResFallback.error) {
      return { threads: [], error: alertsResFallback.error.message };
    }

    alertsData = (alertsResFallback.data as AdminAlertRow[]) ?? [];
  } else {
    alertsData = (alertsResPrimary.data as AdminAlertRow[]) ?? [];
  }

  if (rootsRes.error || decisionsRes.error) {
    return {
      threads: [],
      error: rootsRes.error?.message ?? decisionsRes.error?.message ?? "Failed to load thread activity",
    };
  }

  const traineesMap = new Map<string, { id: string; email: string | null; full_name: string | null }>();
  for (const trainee of (traineesRes.data as { id: string; email: string | null; full_name: string | null }[]) ?? []) {
    traineesMap.set(trainee.id, trainee);
  }

  const usersMap = new Map<string, Pick<UserRow, "id" | "full_name" | "email">>();
  for (const user of (usersRes.data as Pick<UserRow, "id" | "full_name" | "email">[]) ?? []) {
    usersMap.set(user.id, user);
  }

  const alertsMap = new Map<string, AdminAlertRow>();
  for (const alert of alertsData) {
    if (alert.id) alertsMap.set(String(alert.id), alert);
  }

  const rootByThread = new Map<string, { id: string; body: string }>();
  for (const root of (rootsRes.data as { id: string; thread_id: string | null; body: string }[]) ?? []) {
    if (!root.thread_id || rootByThread.has(root.thread_id)) continue;
    rootByThread.set(root.thread_id, { id: root.id, body: root.body });
  }

  const latestDecisionPreview = new Map<string, string>();
  for (const decision of (decisionsRes.data as { thread_id: string; rationale: string | null; decision: string }[]) ?? []) {
    if (!latestDecisionPreview.has(decision.thread_id)) {
      latestDecisionPreview.set(decision.thread_id, (decision.rationale ?? decision.decision ?? "").trim());
    }
  }

  const threads = rows.map((row) => {
    const trainee = traineesMap.get(row.app_user_id);
    const traineeLabel =
      (trainee?.full_name ?? "").trim() || (trainee?.email ?? "").trim() || row.app_user_id.slice(0, 8);

    let targetLabel = "Review thread";
    let targetHref = "/";

    if (row.context_type === "alert" && row.alert_id) {
      const alert = alertsMap.get(String(row.alert_id));
      const alertPublicId = alert?.id ?? "unknown";
      const type = (alert?.alert_type ?? alert?.type ?? "alert").toString().toUpperCase();
      const severity = alert?.severity ? ` · ${alert.severity}` : "";
      targetLabel = `Alert ${alertPublicId} · ${type}${severity}`;
      targetHref = `/alerts/${alertPublicId}`;
    } else if (row.context_type === "profile" && row.user_id) {
      const simulatorUser = usersMap.get(row.user_id);
      const userLabel =
        (simulatorUser?.full_name ?? "").trim() || (simulatorUser?.email ?? "").trim() || row.user_id;
      targetLabel = `User profile · ${userLabel}`;
      targetHref = `/users/${row.user_id}`;
    }

    const root = rootByThread.get(row.id);
    const decisionPreview = latestDecisionPreview.get(row.id);
    const preview = (root?.body ?? decisionPreview ?? "").trim() || "—";

    return {
      threadId: row.id,
      traineeLabel,
      targetLabel,
      targetHref,
      qaParentId: root?.id ?? null,
      preview,
      created_at: row.created_at,
      createdAtLabel: formatDateTime(row.created_at),
    };
  });

  return { threads, error: null };
}
