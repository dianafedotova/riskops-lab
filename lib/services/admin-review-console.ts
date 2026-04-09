import { formatDateTime } from "@/lib/format";
import { listReviewSubmissionsDirect } from "@/lib/services/review-submissions";
import type { ReviewSubmissionRow, SimulatorCommentRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const THREAD_COLS = "id, app_user_id, alert_id, user_id, context_type, created_at" as const;

export type ReviewThreadListRow = {
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

type SimulatorUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export type AdminConsoleThreadListItem = {
  threadId: string;
  traineeAppUserId: string;
  traineeLabel: string;
  traineeEmail: string | null;
  targetLabel: string;
  targetHref: string;
  qaParentId: string | null;
  preview: string;
  latestSubmission: ReviewSubmissionRow | null;
  isDraft: boolean;
  created_at: string;
  createdAtLabel: string;
  initialDiscussionComments: SimulatorCommentRow[];
  initialAuthorLabels: Record<string, string>;
};

export async function buildAdminConsoleThreadListItems(
  supabase: SupabaseClient,
  rows: ReviewThreadListRow[]
): Promise<{ threads: AdminConsoleThreadListItem[]; error: string | null }> {
  if (rows.length === 0) {
    return { threads: [], error: null };
  }

  const threadIds = rows.map((row) => row.id);
  const traineeIds = Array.from(new Set(rows.map((row) => row.app_user_id)));
  const alertIds = Array.from(new Set(rows.map((row) => row.alert_id).filter(Boolean))) as string[];
  const profileUserIds = Array.from(
    new Set(
      rows
        .filter((row) => row.context_type === "profile")
        .map((row) => row.user_id)
        .filter(Boolean)
    )
  ) as string[];
  const [traineesRes, alertsResPrimary, usersRes, rootsRes, decisionsRes, submissionsRes, discussionRes] = await Promise.all([
    supabase.from("app_users").select("id, email, full_name").in("id", traineeIds),
    alertIds.length
      ? supabase.from("alerts").select("id, internal_id, alert_type, severity, user_id").in("id", alertIds)
      : Promise.resolve({ data: [], error: null }),
    profileUserIds.length
      ? supabase.from("users").select("id, email, full_name").in("id", profileUserIds)
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
    listReviewSubmissionsDirect(supabase, threadIds),
    supabase
      .from("simulator_comments")
      .select(
        "id, thread_id, decision_id, user_id, alert_id, author_app_user_id, author_role, comment_type, parent_comment_id, body, body_json, body_format, created_at, updated_at"
      )
      .in("thread_id", threadIds)
      .neq("comment_type", "admin_private")
      .order("created_at", { ascending: true }),
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

  if (rootsRes.error || decisionsRes.error || discussionRes.error || submissionsRes.error) {
    return {
      threads: [],
      error:
        rootsRes.error?.message ??
        decisionsRes.error?.message ??
        discussionRes.error?.message ??
        submissionsRes.error ??
        "Failed to load review case activity",
    };
  }

  const traineesMap = new Map<string, { id: string; email: string | null; full_name: string | null }>();
  for (const trainee of (traineesRes.data as { id: string; email: string | null; full_name: string | null }[]) ?? []) {
    traineesMap.set(trainee.id, trainee);
  }

  const discussionComments = (discussionRes.data as SimulatorCommentRow[]) ?? [];
  const extraAuthorIds = Array.from(
    new Set(discussionComments.map((comment) => comment.author_app_user_id).filter(Boolean))
  ).filter((authorId) => !traineesMap.has(authorId));

  const extraAuthorsMap = new Map<string, { email: string | null; full_name: string | null }>();
  if (extraAuthorIds.length > 0) {
    const extraAuthorsRes = await supabase.from("app_users").select("id, email, full_name").in("id", extraAuthorIds);
    if (extraAuthorsRes.error) {
      return { threads: [], error: extraAuthorsRes.error.message };
    }
    for (const author of
      (extraAuthorsRes.data as { id: string; email: string | null; full_name: string | null }[]) ?? []) {
      extraAuthorsMap.set(author.id, author);
    }
  }

  const authorLabels = new Map<string, string>();
  for (const authorId of Array.from(new Set(discussionComments.map((comment) => comment.author_app_user_id).filter(Boolean)))) {
    const author = traineesMap.get(authorId) ?? extraAuthorsMap.get(authorId);
    const fullName = (author?.full_name ?? "").trim();
    const email = (author?.email ?? "").trim();
    authorLabels.set(authorId, fullName && email ? `${fullName} · ${email}` : fullName || email || "user");
  }

  const discussionCommentsByThread = new Map<string, SimulatorCommentRow[]>();
  for (const comment of discussionComments) {
    if (!comment.thread_id) continue;
    const items = discussionCommentsByThread.get(comment.thread_id) ?? [];
    items.push(comment);
    discussionCommentsByThread.set(comment.thread_id, items);
  }

  const alertsMap = new Map<string, AdminAlertRow>();
  for (const alert of alertsData) {
    if (alert.id) alertsMap.set(String(alert.id), alert);
  }
  const usersMap = new Map<string, SimulatorUserRow>();
  for (const user of (usersRes.data as SimulatorUserRow[]) ?? []) {
    if (user.id) usersMap.set(user.id, user);
  }

  const rootByThread = new Map<string, { id: string; body: string }>();
  const rootById = new Map<string, { id: string; thread_id: string | null; body: string }>();
  for (const root of (rootsRes.data as { id: string; thread_id: string | null; body: string }[]) ?? []) {
    rootById.set(root.id, root);
    if (!root.thread_id || rootByThread.has(root.thread_id)) continue;
    rootByThread.set(root.thread_id, { id: root.id, body: root.body });
  }

  const latestDecisionPreview = new Map<string, string>();
  for (const decision of (decisionsRes.data as { thread_id: string; rationale: string | null; decision: string }[]) ?? []) {
    if (!latestDecisionPreview.has(decision.thread_id)) {
      latestDecisionPreview.set(decision.thread_id, (decision.rationale ?? decision.decision ?? "").trim());
    }
  }

  const latestSubmissionByThread = new Map<string, ReviewSubmissionRow>();
  for (const submission of submissionsRes.rows) {
    if (!latestSubmissionByThread.has(submission.thread_id)) {
      latestSubmissionByThread.set(submission.thread_id, submission);
    }
  }

  const threads = rows.map((row) => {
    const trainee = traineesMap.get(row.app_user_id);
    const traineeLabel =
      (trainee?.full_name ?? "").trim() || (trainee?.email ?? "").trim() || row.app_user_id.slice(0, 8);
    const traineeEmail = (trainee?.email ?? "").trim() || null;

    let targetLabel = "Review case";
    let targetHref = "/";

    if (row.context_type === "alert" && row.alert_id) {
      const alert = alertsMap.get(String(row.alert_id));
      const alertPublicId = alert?.id ?? "unknown";
      targetLabel = `Alert · ${alertPublicId}`;
      targetHref = `/alerts/${alertPublicId}`;
    } else if (row.context_type === "profile" && row.user_id) {
      const simulatorUser = usersMap.get(row.user_id);
      const simulatorUserLabel =
        (simulatorUser?.full_name ?? "").trim() ||
        (simulatorUser?.email ?? "").trim() ||
        row.user_id;
      targetLabel = `Profile · ${simulatorUserLabel}`;
      targetHref = `/users/${row.user_id}`;
    }

    const root = rootByThread.get(row.id);
    const decisionPreview = latestDecisionPreview.get(row.id);
    const latestSubmission = latestSubmissionByThread.get(row.id) ?? null;
    const submittedRootBody =
      latestSubmission?.submitted_root_comment_id
        ? rootById.get(latestSubmission.submitted_root_comment_id)?.body?.trim() ?? ""
        : "";
    const submissionPreview =
      submittedRootBody ||
      latestSubmission?.rationale_snapshot?.trim() ||
      latestSubmission?.feedback?.trim() ||
      "";
    const previewSource = submissionPreview || root?.body || decisionPreview || "";
    const preview = previewSource.trim() || "—";
    const initialDiscussionComments = discussionCommentsByThread.get(row.id) ?? [];
    const initialAuthorLabels = Object.fromEntries(
      Array.from(new Set(initialDiscussionComments.map((comment) => comment.author_app_user_id).filter(Boolean))).map(
        (authorId) => [authorId, authorLabels.get(authorId) ?? "user"]
      )
    );

    return {
      threadId: row.id,
      traineeAppUserId: row.app_user_id,
      traineeLabel,
      traineeEmail,
      targetLabel,
      targetHref,
      qaParentId: root?.id ?? null,
      preview,
      latestSubmission,
      isDraft: !latestSubmission,
      created_at: row.created_at,
      createdAtLabel: formatDateTime(row.created_at),
      initialDiscussionComments,
      initialAuthorLabels,
    };
  });

  return { threads, error: null };
}

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
  return buildAdminConsoleThreadListItems(supabase, rows);
}

export async function getAdminConsoleThreadListItem(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ thread: AdminConsoleThreadListItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from("review_threads")
    .select(THREAD_COLS)
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    return { thread: null, error: error.message };
  }
  if (!data) {
    return { thread: null, error: null };
  }

  const built = await buildAdminConsoleThreadListItems(supabase, [data as ReviewThreadListRow]);
  return { thread: built.threads[0] ?? null, error: built.error };
}
