"use client";

import { AlertActivityLog } from "@/components/alert-activity-log";
import { AlertDetailSkeleton } from "@/components/alert-detail-skeleton";
import { AlertReviewAssignmentsPanel } from "@/components/alert-review-assignments-panel";
import { ObjectNotePanel } from "@/components/object-note-panel";
import { QueryErrorBanner } from "@/components/query-error";
import { ReviewThreadInternalNotePanel } from "@/components/review-thread-internal-note-panel";
import { ReviewSubmissionsPanel } from "@/components/review-submissions-panel";
import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import { SimulatorAlertForm } from "@/components/simulator-alert-form";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { getAlertContextIds } from "@/lib/alerts/identity";
import { formatDate, formatDateTime } from "@/lib/format";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { useReviewSubmissions } from "@/lib/hooks/use-review-submissions";
import { useTraineeDecisions } from "@/lib/hooks/use-trainee-decisions";
import { runSerializedAuth } from "@/lib/auth/auth-user-queue";
import { fetchReviewThreadIdForAlert } from "@/lib/review/fetch-review-thread-id";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import {
  assignAlertToTraineeSelf,
  listAlertAssigneesForContext,
  unassignAlertFromTraineeSelf,
} from "@/lib/services/assignments";
import { listReviewSubmissionsDirect } from "@/lib/services/review-submissions";
import { createTraineeDecision, displayStatusFromTraineeDecisionOnAlert } from "@/lib/services/trainee-decisions";
import { createAlertReviewThreadForContext, fetchAlertReviewThreadById } from "@/lib/services/review-threads";
import { formatPostgrestError } from "@/lib/trainee-user-watchlist";
import type { AlertRow, ReviewSubmissionRow, ReviewThreadRow, UserRow } from "@/lib/types";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Decision = "false_positive" | "true_positive" | "info_requested" | "escalated";

type AlertWithRuleCode = AlertRow & { rule_code?: string | null; rule_name?: string | null };

const ALERT_DETAIL_COLS =
  "id, internal_id, user_id, alert_type, severity, status, description, rule_code, rule_name, created_at, updated_at, alert_date, decision" as const;

function proposedStatusForDecision(decision: Decision): string {
  if (decision === "false_positive") return "resolved";
  if (decision === "true_positive") return "resolved";
  if (decision === "info_requested") return "in_review";
  return "in_review";
}

function getDecisionLabel(decision: string | null | undefined): string {
  const d = (decision ?? "").trim();
  if (!d) return "Not set";
  if (d === "false_positive") return "False Positive";
  if (d === "true_positive") return "True Positive";
  if (d === "info_requested") return "Info requested";
  if (d === "escalated") return "Escalated";
  return d;
}

function formatRuleDisplay(ruleCode: string | null | undefined, ruleName: string | null | undefined): string {
  const code = (ruleCode ?? "").trim();
  const name = (ruleName ?? "").trim();
  if (!code && !name) return "—";
  if (code && name) return `${code}: ${name}`;
  return code || name;
}

function formatSeverityLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "Unknown";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatStatusLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const statusBadgeClass = (status: string | null) => {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "open") return "ui-badge-blue";
  if (s === "in review") return "ui-badge-teal";
  if (s === "resolved") return "ui-badge-neutral";
  if (s === "closed") return "ui-badge-neutral";
  if (s === "monitoring") return "ui-badge-amber";
  if (s === "escalated") return "ui-badge-violet";
  return "ui-badge-neutral";
};

const severityBadgeClass = (severity: string | null) => {
  const s = (severity ?? "").trim().toLowerCase();
  if (s === "critical") return "ui-badge-rose";
  if (s === "high") return "ui-badge-rose";
  if (s === "medium") return "ui-badge-amber";
  if (s === "low") return "ui-badge-emerald";
  return "ui-badge-neutral";
};

const typeBadgeClass = (type: string | null) => {
  const s = (type ?? "").trim().toLowerCase();
  if (s === "aml") return "ui-badge-indigo";
  if (s === "fraud") return "ui-badge-blue";
  return "ui-badge-neutral";
};

const decisionBadgeClass = (decision: string | null | undefined) => {
  const d = (decision ?? "").trim();
  if (!d) return "ui-badge-neutral";
  if (d === "false_positive") return "ui-badge-emerald";
  if (d === "true_positive") return "ui-badge-rose";
  if (d === "info_requested") return "ui-badge-teal";
  if (d === "escalated") return "ui-badge-amber";
  return "ui-badge-neutral";
};

function reviewSubmissionStateBadgeClass(state: string | null | undefined) {
  const value = (state ?? "").trim().toLowerCase();
  if (value === "submitted") return "ui-badge-blue";
  if (value === "in_review") return "ui-badge-teal";
  if (value === "changes_requested") return "ui-badge-rose";
  if (value === "approved") return "ui-badge-emerald";
  return "ui-badge-neutral";
}

function formatReviewSubmissionState(state: string | null | undefined): string {
  const value = (state ?? "").trim().toLowerCase();
  if (!value) return "Draft case";
  if (value === "in_review") return "In review";
  if (value === "changes_requested") return "Changes requested";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function formatReviewEvaluation(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Not graded";
  if (normalized === "needs_work") return "Needs a full redo";
  if (normalized === "developing") return "On the right track";
  if (normalized === "solid") return "Good work";
  if (normalized === "excellent") return "Outstanding";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replaceAll("_", " ");
}

function shortThreadId(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  if (!normalized) return "—";
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 8)}…${normalized.slice(-4)}`;
}

const DECISION_BUTTON_BASE =
  "ui-btn min-h-0 justify-center rounded-[1rem] px-4 py-2 text-sm font-semibold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50";

const decisionOptionClass = (key: Decision, selected: boolean) => {
  if (selected) {
    if (key === "info_requested") {
      return "border border-[rgb(101_139_147_/_0.94)] bg-[linear-gradient(180deg,rgb(123_162_169_/_0.98),rgb(92_130_138_/_0.98))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_16px_rgba(24,42,59,0.15)]";
    }
    if (key === "false_positive") {
      return "border border-transparent bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)] hover:bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
    }
    if (key === "true_positive") {
      return "border border-transparent bg-[linear-gradient(180deg,var(--brand-dot),#7f1724)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_18px_rgba(24,42,59,0.2)]";
    }
    if (key === "escalated") {
      return "border border-transparent bg-[linear-gradient(180deg,var(--warning-600),#9a6a36)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_18px_rgba(24,42,59,0.2)]";
    }
    return "ui-btn-primary";
  }
  if (key === "info_requested") {
    return "ui-btn-secondary border-[rgb(193_221_226_/_0.95)] bg-[linear-gradient(180deg,rgb(255_255_255_/_0.98),rgb(243_249_250_/_0.98))] text-[rgb(57_103_112)] shadow-[0_6px_12px_rgba(120,160,168,0.05)] hover:border-[rgb(160_196_202_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(236_247_248_/_0.98),rgb(223_239_242_/_0.98))] hover:text-[rgb(48_90_98)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_14px_rgba(120,160,168,0.1)]";
  }
  if (key === "escalated") {
    return "ui-btn-secondary border-amber-300 text-[var(--warning-600)] shadow-none hover:border-[rgb(191_144_84_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(250_242_220_/_0.98),rgb(243_229_193_/_0.98))] hover:text-[var(--warning-600)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_18px_rgba(24,42,59,0.12)]";
  }
  if (key === "false_positive") {
    return "ui-btn-secondary border-[rgb(196_220_214_/_0.95)] text-[var(--brand-700)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
  }
  return "ui-btn-secondary border-[rgb(221_189_196_/_0.94)] text-[var(--brand-dot)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-dot),#7f1724)] hover:text-white hover:shadow-[0_10px_18px_rgba(24,42,59,0.18)]";
};

export default function AlertDetailsPage() {
  const { appUser, hasStaffAccess, isTraineeActor } = useReviewWorkspaceActor();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reviewThreadFromUrl = searchParams.get("reviewThread");
  const alertId = params?.id ?? "a-unknown";

  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [otherAlerts, setOtherAlerts] = useState<AlertRow[]>([]);
  const [alertUserSummary, setAlertUserSummary] = useState<Pick<UserRow, "id" | "full_name" | "email"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [alertEditorOpen, setAlertEditorOpen] = useState(false);
  const [alertEditorMessage, setAlertEditorMessage] = useState<string | null>(null);

  /** Latest review thread for this alert (sidebar + decisions); RLS allows trainee/admin per policies. */
  const [canonicalAsideThreadId, setCanonicalAsideThreadId] = useState<string | null>(null);
  const [activeReviewThread, setActiveReviewThread] = useState<ReviewThreadRow | null>(null);
  const [reviewWorkspaceError, setReviewWorkspaceError] = useState<string | null>(null);
  const [reviewThreads, setReviewThreads] = useState<ReviewThreadRow[]>([]);
  const [reviewThreadsSubmissions, setReviewThreadsSubmissions] = useState<ReviewSubmissionRow[]>([]);
  const [reviewThreadsWithRootNotes, setReviewThreadsWithRootNotes] = useState<string[]>([]);
  const [reviewThreadsReloadTick, setReviewThreadsReloadTick] = useState(0);
  const [draftsExpanded, setDraftsExpanded] = useState(false);
  const [submittedExpanded, setSubmittedExpanded] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [unassignBusy, setUnassignBusy] = useState(false);
  const [assignees, setAssignees] = useState<
    { app_user_id: string; full_name: string | null; email: string | null }[]
  >([]);

  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [rationale, setRationale] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const alertContext = getAlertContextIds(alert);

  const decisionsThreadId = canonicalAsideThreadId;
  const { decisions, loading: decisionsLoading, refresh: refreshDecisions, resetDecision } = useTraineeDecisions(decisionsThreadId);
  const staffSubmissionsThreadId = hasStaffAccess && !isTraineeActor ? canonicalAsideThreadId : null;
  const { submissions: staffReviewSubmissions } = useReviewSubmissions(staffSubmissionsThreadId);

  useEffect(() => {
    if (!alertContext.publicId) {
      setAssignees([]);
      return;
    }
    const publicAlertId = alertContext.publicId;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { assignees: list } = await listAlertAssigneesForContext(supabase, {
        internalId: alertContext.internalId,
        publicId: publicAlertId,
      });
      if (!cancelled) setAssignees(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [alertContext.internalId, alertContext.publicId, reloadTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      setLoading(true);
      setError(null);
      const { data: row, error: qError } = await supabase
        .from("alerts")
        .select(ALERT_DETAIL_COLS)
        .eq("id", alertId)
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setAlert(null);
        setAlertUserSummary(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      if (!row) {
        setAlert(null);
        setAlertUserSummary(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      const a = row as AlertRow;
      setAlert(a);
      const uid = a.user_id;
      if (uid) {
        const { data: linkedUser } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", uid)
          .maybeSingle();
        if (!cancelled) {
          setAlertUserSummary(((linkedUser as Pick<UserRow, "id" | "full_name" | "email"> | null) ?? null));
        }

        const { data: others } = await supabase
          .from("alerts")
          .select(ALERT_DETAIL_COLS)
          .eq("user_id", uid)
          .neq("id", alertId)
          .order("created_at", { ascending: false });
        if (!cancelled) setOtherAlerts((others as AlertRow[]) ?? []);
      } else {
        setAlertUserSummary(null);
        setOtherAlerts([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [alertId, reloadTick]);

  useEffect(() => {
    if (!alertContext.internalId) {
      setCanonicalAsideThreadId(null);
      setActiveReviewThread(null);
      setReviewWorkspaceError(null);
      return;
    }
    if (!appUser) {
      setCanonicalAsideThreadId(null);
      setActiveReviewThread(null);
      setReviewWorkspaceError(null);
      return;
    }
    const alertInternalId = alertContext.internalId;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      setReviewWorkspaceError(null);
      if (isTraineeActor) {
        const { threadId, error: thErr } = await fetchReviewThreadIdForAlert(supabase, alertInternalId, appUser.id);
        if (cancelled) return;
        if (thErr) {
          setCanonicalAsideThreadId(null);
          setActiveReviewThread(null);
          setReviewWorkspaceError(thErr.message);
          return;
        }
        setCanonicalAsideThreadId(threadId);
        setActiveReviewThread(null);
        return;
      }
      const publicId = alertContext.publicId;
      if (!reviewThreadFromUrl || !publicId) {
        setCanonicalAsideThreadId(null);
        setActiveReviewThread(null);
        return;
      }
      const { thread, error: threadErr } = await fetchAlertReviewThreadById(supabase, reviewThreadFromUrl);
      if (cancelled) return;
      if (threadErr || !thread) {
        setCanonicalAsideThreadId(null);
        setActiveReviewThread(null);
        setReviewWorkspaceError(threadErr?.message ?? "This review link does not match this alert.");
        return;
      }
      if (
        thread.context_type !== "alert" ||
        !thread.alert_id ||
        thread.alert_id !== publicId
      ) {
        setCanonicalAsideThreadId(null);
        setActiveReviewThread(null);
        setReviewWorkspaceError("This review link does not match this alert.");
        return;
      }
      setCanonicalAsideThreadId(thread.id);
      setActiveReviewThread(thread as ReviewThreadRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [alertContext.internalId, alertContext.publicId, appUser, isTraineeActor, reviewThreadFromUrl, reloadTick, reviewThreadsReloadTick]);

  const createReviewThread = useCallback(async () => {
    if (!appUser?.id || !alertContext.internalId) return null;

    const supabase = createClient();
    const { threadId, error: threadError } = await createAlertReviewThreadForContext(supabase, appUser.id, {
      publicId: alertContext.publicId,
      internalId: alertContext.internalId,
    });

    if (threadError || !threadId) {
      setReviewWorkspaceError(threadError?.message ?? "Could not create a new review case for this alert.");
      return null;
    }

    setReviewWorkspaceError(null);
    setCanonicalAsideThreadId(threadId);
    setReviewThreadsReloadTick((tick) => tick + 1);
    return threadId;
  }, [alertContext.internalId, alertContext.publicId, appUser?.id]);

  useEffect(() => {
    if (!alertContext.publicId || !appUser?.id || !isTraineeActor) {
      setReviewThreads([]);
      setReviewThreadsSubmissions([]);
      setReviewThreadsWithRootNotes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      setReviewWorkspaceError(null);
      const { data, error: threadsError } = await supabase
        .from("review_threads")
        .select("id, app_user_id, alert_id, user_id, context_type, status, created_at, updated_at")
        .eq("app_user_id", appUser.id)
        .eq("alert_id", alertContext.publicId)
        .eq("context_type", "alert")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (threadsError) {
        setReviewThreads([]);
        setReviewThreadsSubmissions([]);
        setReviewThreadsWithRootNotes([]);
        setReviewWorkspaceError(threadsError.message);
        return;
      }

      const rows = ((data as ReviewThreadRow[] | null) ?? []).map((row) => ({
        ...row,
        id: String(row.id),
        app_user_id: String(row.app_user_id),
        alert_id: row.alert_id ? String(row.alert_id) : null,
        user_id: row.user_id ? String(row.user_id) : null,
      }));

      setReviewThreads(rows);

      if (rows.length === 0) {
        setReviewThreadsSubmissions([]);
        setReviewThreadsWithRootNotes([]);
        return;
      }

      const [rootCommentsResult, submissionsResult] = await Promise.all([
        supabase
          .from("simulator_comments")
          .select("thread_id")
          .in("thread_id", rows.map((row) => row.id))
          .eq("comment_type", "user_comment")
          .is("parent_comment_id", null),
        listReviewSubmissionsDirect(
          supabase,
          rows.map((row) => row.id)
        ),
      ]);

      if (cancelled) return;

      const rootCommentRows = rootCommentsResult.data;
      const rootCommentsError = rootCommentsResult.error;

      if (rootCommentsError) {
        setReviewThreadsWithRootNotes([]);
      } else {
        const threadIds = Array.from(
          new Set(
            (((rootCommentRows as { thread_id: string | null }[] | null) ?? [])
              .map((row) => row.thread_id)
              .filter((threadId): threadId is string => Boolean(threadId)))
          )
        );
        setReviewThreadsWithRootNotes(threadIds);
      }

      if (submissionsResult.error) {
        setReviewThreadsSubmissions([]);
        setReviewWorkspaceError(submissionsResult.error);
        return;
      }

      setReviewThreadsSubmissions(submissionsResult.rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [alertContext.publicId, appUser?.id, isTraineeActor, reviewThreadsReloadTick]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onReviewSubmissionsChanged = () => {
      setReviewThreadsReloadTick((tick) => tick + 1);
    };

    window.addEventListener("review-submissions:changed", onReviewSubmissionsChanged);
    return () => {
      window.removeEventListener("review-submissions:changed", onReviewSubmissionsChanged);
    };
  }, []);

  useEffect(() => {
    if (!alertContext.publicId || !appUser?.id || !isTraineeActor) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`alert-review-submissions:${appUser.id}:${alertContext.publicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_submissions",
          filter: `app_user_id=eq.${appUser.id}`,
        },
        (payload) => {
          const nextAlertId =
            typeof payload.new === "object" && payload.new && "alert_id" in payload.new
              ? String((payload.new as { alert_id?: string | null }).alert_id ?? "")
              : "";
          const prevAlertId =
            typeof payload.old === "object" && payload.old && "alert_id" in payload.old
              ? String((payload.old as { alert_id?: string | null }).alert_id ?? "")
              : "";

          if (nextAlertId === alertContext.publicId || prevAlertId === alertContext.publicId) {
            setReviewThreadsReloadTick((tick) => tick + 1);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [alertContext.publicId, appUser?.id, isTraineeActor]);

  const onAssignToMe = useCallback(async () => {
    if (!appUser?.id || !isTraineeActor || !alert) return;
    const publicAlertId = alertContext.publicId;
    if (!publicAlertId) return;
    setAssignBusy(true);
    setAssignError(null);
    try {
      const supabase = createClient();
      await runSerializedAuth(async () => {
        const { error: insErr } = await assignAlertToTraineeSelf(supabase, appUser.id, {
          internalId: alertContext.internalId,
          publicId: publicAlertId,
        });
        if (insErr) throw insErr;
        const { assignees: list } = await listAlertAssigneesForContext(supabase, {
          internalId: alertContext.internalId,
          publicId: publicAlertId,
        });
        setAssignees(list);
      });
    } catch (e) {
      setAssignError(formatPostgrestError(e));
    } finally {
      setAssignBusy(false);
    }
  }, [alert, alertContext.internalId, alertContext.publicId, appUser, isTraineeActor]);

  const onUnassignSelf = useCallback(async () => {
    if (!appUser?.id || !isTraineeActor || !alert) return;
    const publicAlertId = alertContext.publicId;
    if (!publicAlertId) return;
    setUnassignBusy(true);
    setAssignError(null);
    try {
      const supabase = createClient();
      await runSerializedAuth(async () => {
        const { error: delErr } = await unassignAlertFromTraineeSelf(supabase, appUser.id, {
          internalId: alertContext.internalId,
          publicId: publicAlertId,
        });
        if (delErr) throw delErr;
        const { assignees: list } = await listAlertAssigneesForContext(supabase, {
          internalId: alertContext.internalId,
          publicId: publicAlertId,
        });
        setAssignees(list);
      });
    } catch (e) {
      setAssignError(formatPostgrestError(e));
    } finally {
      setUnassignBusy(false);
    }
  }, [alert, alertContext.internalId, alertContext.publicId, appUser, isTraineeActor]);

  const assignedToMe =
    Boolean(appUser?.id) && assignees.some((a) => a.app_user_id === appUser?.id);

  const traineeAssignmentSummaryLabel = assignedToMe ? "Assigned to me" : "Unassigned";
  const traineeAssignmentSummaryBadgeClass = assignedToMe ? "ui-badge-teal" : "ui-badge-neutral";

  const reviewThreadsSubmissionsForUi = useMemo(() => {
    if (!isTraineeActor) return reviewThreadsSubmissions;
    const maxVersionByThread = new Map<string, number>();
    for (const submission of reviewThreadsSubmissions) {
      const prev = maxVersionByThread.get(submission.thread_id) ?? 0;
      if (submission.submission_version > prev) {
        maxVersionByThread.set(submission.thread_id, submission.submission_version);
      }
    }
    return reviewThreadsSubmissions.filter(
      (submission) => submission.submission_version === (maxVersionByThread.get(submission.thread_id) ?? 0)
    );
  }, [isTraineeActor, reviewThreadsSubmissions]);

  const submissionsByThreadId = useMemo(() => {
    const map = new Map<string, ReviewSubmissionRow[]>();
    for (const submission of reviewThreadsSubmissionsForUi) {
      const list = map.get(submission.thread_id) ?? [];
      list.push(submission);
      map.set(submission.thread_id, list);
    }
    return map;
  }, [reviewThreadsSubmissionsForUi]);

  const draftReviewThreads = useMemo(
    () => reviewThreads.filter((thread) => (submissionsByThreadId.get(thread.id) ?? []).length === 0),
    [reviewThreads, submissionsByThreadId]
  );

  const draftReviewThreadsWithNotes = useMemo(() => {
    const threadsWithNotes = new Set(reviewThreadsWithRootNotes);
    return draftReviewThreads.filter((thread) => threadsWithNotes.has(thread.id));
  }, [draftReviewThreads, reviewThreadsWithRootNotes]);

  const submittedReviewThreads = useMemo(
    () => reviewThreads.filter((thread) => (submissionsByThreadId.get(thread.id) ?? []).length > 0),
    [reviewThreads, submissionsByThreadId]
  );

  const deleteDraftReviewThread = useCallback(
    async (threadId: string) => {
      if (!appUser?.id) return;

      const threadSubmissions = submissionsByThreadId.get(threadId) ?? [];
      if (threadSubmissions.length > 0) {
        throw new Error("Submitted cases cannot be deleted.");
      }

      const supabase = createClient();
      const { data: deletedRows, error: deleteError } = await supabase
        .from("review_threads")
        .delete()
        .select("id")
        .eq("id", threadId)
        .eq("app_user_id", appUser.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("Draft was not deleted. Apply the latest review case delete policy migration and try again.");
      }

      if (canonicalAsideThreadId === threadId) {
        setCanonicalAsideThreadId(null);
      }
      setReviewThreads((current) => current.filter((thread) => thread.id !== threadId));
      setReviewThreadsSubmissions((current) => current.filter((submission) => submission.thread_id !== threadId));
      setReviewThreadsReloadTick((tick) => tick + 1);
    },
    [appUser?.id, canonicalAsideThreadId, submissionsByThreadId]
  );

  const onPickDecision = useCallback(
    async (decision: Decision) => {
      setPendingDecision(decision);
      if (!appUser || !isTraineeActor || !appUser.id || !alert) return;
      setSubmitBusy(true);
      setSubmitError(null);
      try {
        const workingThreadId = decisionsThreadId ?? (await createReviewThread());
        if (!workingThreadId) {
          throw new Error("No cases for review yet. Wait a moment or refresh the page.");
        }

        const result = await createTraineeDecision(createClient(), {
          threadId: workingThreadId,
          appUserId: appUser.id,
          alertId: alert.id,
          userId: alert.user_id,
          decision,
          proposedAlertStatus: proposedStatusForDecision(decision),
          rationale: rationale.trim() || null,
          reviewState: "draft",
        });
        if (result.error) {
          throw new Error(result.error);
        }

        if (workingThreadId === decisionsThreadId) {
          refreshDecisions();
        }
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setSubmitBusy(false);
      }
    },
    [alert, appUser, createReviewThread, decisionsThreadId, isTraineeActor, rationale, refreshDecisions]
  );

  const onResetDecision = useCallback(async () => {
    if (!appUser || !isTraineeActor || !appUser.id) return;
    setResetBusy(true);
    setSubmitError(null);
    try {
      await resetDecision(appUser.id);
      setPendingDecision(null);
      setRationale("");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetBusy(false);
    }
  }, [appUser, isTraineeActor, resetDecision]);

  const ruleCode = ((alert as AlertWithRuleCode | null)?.rule_code ?? "").trim();
  const ruleName = ((alert as AlertWithRuleCode | null)?.rule_name ?? "").trim();
  const latestDecisionRow = decisions.length > 0 ? decisions[decisions.length - 1] ?? null : null;
  const latestDecision = latestDecisionRow?.decision ?? null;
  const effectiveDecision = pendingDecision ?? (latestDecision as Decision | null);
  useEffect(() => {
    if (pendingDecision && latestDecision === pendingDecision) {
      setPendingDecision(null);
    }
  }, [latestDecision, pendingDecision]);
  const displayStatus =
    effectiveDecision === "info_requested" || effectiveDecision === "escalated"
      ? "in review"
      : effectiveDecision === "false_positive" || effectiveDecision === "true_positive"
        ? "resolved"
        : displayStatusFromTraineeDecisionOnAlert(null, alert?.status);
  const isStaffReviewMode = hasStaffAccess && !isTraineeActor && Boolean(reviewThreadFromUrl);
  const latestStaffSubmission = useMemo(() => {
    if (!staffReviewSubmissions.length) return null;
    return staffReviewSubmissions.reduce<ReviewSubmissionRow | null>((latest, submission) => {
      if (!latest) return submission;
      if (submission.submission_version > latest.submission_version) return submission;
      return latest;
    }, null);
  }, [staffReviewSubmissions]);
  const activeThreadReference = activeReviewThread?.id ?? canonicalAsideThreadId;
  const activeThreadStatusLabel = latestStaffSubmission
    ? formatReviewSubmissionState(latestStaffSubmission.review_state)
    : "Draft case";
  const activeThreadEvaluationLabel = latestStaffSubmission
    ? formatReviewEvaluation(latestStaffSubmission.evaluation)
    : "Not graded";
  const activeThreadTimestampLabel = latestStaffSubmission?.submitted_at
    ? formatDateTime(latestStaffSubmission.submitted_at)
    : activeReviewThread?.created_at
      ? formatDateTime(activeReviewThread.created_at)
      : "Waiting for case details";
  const activeThreadSummary = latestStaffSubmission
    ? `Submission v${latestStaffSubmission.submission_version}`
    : activeThreadReference
      ? "Shared review case"
      : "Loading case";
  const activityLogRefreshKey = `${reviewThreadsReloadTick}-${reloadTick}-${decisions.length}-${latestDecisionRow?.updated_at ?? ""}`;

  const syncDecisionToReviewThread = useCallback(
    async (threadId: string) => {
      if (!appUser?.id || !isTraineeActor || !alert || !effectiveDecision) return;

      const rationaleValue = rationale.trim() || null;
      const currentDecisionMatchesThread =
        threadId === decisionsThreadId &&
        latestDecisionRow?.decision === effectiveDecision &&
        (latestDecisionRow?.rationale ?? null) === rationaleValue;

      if (currentDecisionMatchesThread) return;

      const supabase = createClient();
      const result = await createTraineeDecision(supabase, {
        threadId,
        appUserId: appUser.id,
        alertId: alert.id,
        userId: alert.user_id,
        decision: effectiveDecision,
        proposedAlertStatus: proposedStatusForDecision(effectiveDecision),
        rationale: rationaleValue,
        reviewState: "draft",
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (threadId === decisionsThreadId) {
        setPendingDecision(null);
      }
    },
    [alert, appUser?.id, decisionsThreadId, effectiveDecision, isTraineeActor, latestDecisionRow?.decision, latestDecisionRow?.rationale, rationale]
  );
  const traineeReviewWorkspacePanels = isTraineeActor ? (
    <div className="space-y-5">
      {reviewWorkspaceError ? <p className="text-sm text-rose-600">{reviewWorkspaceError}</p> : null}
      <AlertActivityLog alertId={alertContext.publicId} refreshKey={activityLogRefreshKey} />
      <SimulatorCommentsPanel
        threadId={null}
        reviewMode
        privateAlertInternalId={null}
        privateSimulatorUserId={null}
        submissions={[]}
        createThread={createReviewThread}
        prepareTraineeThread={syncDecisionToReviewThread}
        showItems={false}
        showStatusMessages={false}
        showTitle={false}
        withTopBorder={false}
        flushTop
        emptyMessage="No notes in this workspace yet."
        traineeSubmittedSummaryLayout="alert"
      />
      <div
        className={`evidence-shell rounded-[1rem] border-[rgb(210_217_229_/_0.95)] bg-[linear-gradient(180deg,rgba(248,250,253,0.987),rgba(235,240,248,0.992))] ${
          draftsExpanded
            ? "p-4 shadow-[inset_0_2px_8px_rgba(197,206,220,0.18),inset_0_1px_0_rgba(255,255,255,0.94),0_9px_20px_rgba(18,32,46,0.08)] sm:p-5"
            : "px-4 py-3 shadow-[inset_0_3px_10px_rgba(194,203,218,0.2),inset_0_1px_0_rgba(255,255,255,0.96),0_7px_16px_rgba(18,32,46,0.06)] sm:px-5 sm:py-4"
        }`}
      >
        <button
          type="button"
          onClick={() => setDraftsExpanded((open) => !open)}
          aria-expanded={draftsExpanded}
          className="group flex w-full items-center justify-between gap-3 text-left outline-none transition focus-visible:rounded-[0.9rem] focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
            Drafts
          </h3>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition group-hover:text-slate-800">
            <svg
              viewBox="0 0 12 12"
              aria-hidden="true"
              className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition duration-200 group-hover:text-slate-600 ${
                draftsExpanded ? "rotate-90" : "rotate-0"
              }`}
              fill="none"
            >
              <path
                d="M4 2.5 7.5 6 4 9.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {draftsExpanded ? "Hide drafts" : "Show drafts"}
          </span>
        </button>
        <div aria-hidden={!draftsExpanded} className={draftsExpanded ? "mt-3 space-y-3" : "hidden"}>
          {draftReviewThreadsWithNotes.length > 0 ? (
            draftReviewThreadsWithNotes.map((thread) => (
              <SimulatorCommentsPanel
                key={thread.id}
                threadId={thread.id}
                reviewMode
                privateAlertInternalId={null}
                privateSimulatorUserId={null}
                submissions={[]}
                showComposer={false}
                onDeleteDraftThread={deleteDraftReviewThread}
                showTitle={false}
                withTopBorder={false}
                emptyMessage=""
                traineeSubmittedSummaryLayout="alert"
              />
            ))
          ) : (
            <div className="empty-state">No drafts yet.</div>
          )}
        </div>
      </div>
      {submittedReviewThreads.length > 0 ? (
        <div
          className={`evidence-shell rounded-[1rem] border-[rgb(210_217_229_/_0.95)] bg-[linear-gradient(180deg,rgba(248,250,253,0.987),rgba(235,240,248,0.992))] ${
            submittedExpanded
              ? "p-4 shadow-[inset_0_2px_8px_rgba(197,206,220,0.18),inset_0_1px_0_rgba(255,255,255,0.94),0_9px_20px_rgba(18,32,46,0.08)] sm:p-5"
              : "px-4 py-3 shadow-[inset_0_3px_10px_rgba(194,203,218,0.2),inset_0_1px_0_rgba(255,255,255,0.96),0_7px_16px_rgba(18,32,46,0.06)] sm:px-5 sm:py-4"
          }`}
        >
          <button
            type="button"
            onClick={() => setSubmittedExpanded((open) => !open)}
            aria-expanded={submittedExpanded}
            className="group flex w-full items-center justify-between gap-3 text-left outline-none transition focus-visible:rounded-[0.9rem] focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
              Review cases
            </h3>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition group-hover:text-slate-800">
              <svg
                viewBox="0 0 12 12"
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition duration-200 group-hover:text-slate-600 ${
                  submittedExpanded ? "rotate-90" : "rotate-0"
                }`}
                fill="none"
              >
                <path
                  d="M4 2.5 7.5 6 4 9.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {submittedExpanded ? "Hide cases" : "Show cases"}
            </span>
          </button>
          <div aria-hidden={!submittedExpanded} className={submittedExpanded ? "mt-3 space-y-4" : "hidden"}>
            {submittedReviewThreads.map((thread) => {
              const threadSubmissions = submissionsByThreadId.get(thread.id) ?? [];

              return (
                <SimulatorCommentsPanel
                  key={thread.id}
                  threadId={thread.id}
                  reviewMode
                  privateAlertInternalId={null}
                  privateSimulatorUserId={null}
                  submissions={threadSubmissions}
                  showComposer={false}
                  showTitle={false}
                  withTopBorder={false}
                  emptyMessage="Nothing has been submitted from this case yet."
                  traineeSubmittedSummaryLayout="alert"
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  if (loading) {
    return <AlertDetailSkeleton />;
  }

  if (error) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <QueryErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
          hint={
            <p className="text-xs text-rose-800/90">
              Check <code className="rounded bg-rose-100 px-1 font-mono">.env.local</code> and Supabase project access.
            </p>
          }
        />
      </section>
    );
  }

  if (!alert) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-slate-600">
          Alert not found. Run <code className="font-mono text-xs">supabase/schema.sql</code> or check the ID.
        </p>
        <Link href="/alerts" className="text-sm text-[var(--brand-700)] hover:underline">
          Back to Alerts
        </Link>
      </section>
    );
  }

  const staffReviewModeHeader = isStaffReviewMode ? (
    <div className="evidence-shell p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ui-badge ui-badge-amber">Review mode</span>
            <span className={`ui-badge ${reviewSubmissionStateBadgeClass(latestStaffSubmission?.review_state)}`}>
              {activeThreadStatusLabel}
            </span>
            <span className="ui-badge ui-badge-neutral">{activeThreadSummary}</span>
          </div>
          <h2 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.16rem]">
            Review case workspace for this alert
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/review" className="ui-btn ui-btn-secondary min-h-0 rounded-[1rem] px-3.5 py-2 text-sm shadow-none">
            Back to Review queue
          </Link>
          {alert.user_id ? (
            <Link
              href={`/admin/trainees/${alert.user_id}`}
              className="ui-btn ui-btn-secondary min-h-0 rounded-[1rem] px-3.5 py-2 text-sm shadow-none"
            >
              View trainee profile
            </Link>
          ) : null}
        </div>
      </div>

      {reviewWorkspaceError ? <p className="mt-4 text-sm text-rose-600">{reviewWorkspaceError}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Case</p>
          <p className="mt-1.5 font-mono text-sm text-slate-800">{shortThreadId(activeThreadReference)}</p>
        </div>
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Snapshots</p>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{staffReviewSubmissions.length}</p>
        </div>
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Latest activity</p>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{activeThreadTimestampLabel}</p>
        </div>
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Evaluation</p>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{activeThreadEvaluationLabel}</p>
        </div>
      </div>
    </div>
  ) : null;

  const staffReviewWorkspacePanel = isStaffReviewMode ? (
    <div className="evidence-shell p-4 sm:p-5">
      <div>
        <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
          Review case
        </h3>
      </div>
      <div className="mt-2">
        <SimulatorCommentsPanel
          threadId={canonicalAsideThreadId}
          reviewMode
          privateAlertInternalId={null}
          privateSimulatorUserId={null}
          submissions={staffSubmissionsThreadId ? staffReviewSubmissions : []}
          adminModeOverride="reply"
          showItems={Boolean(staffSubmissionsThreadId)}
          showStatusMessages={false}
          showTitle={false}
          withTopBorder={false}
          flushTop
          emptyMessage="No notes in this workspace yet."
          traineeSubmittedSummaryLayout="alert"
          showQaReplyAction={false}
        />
      </div>
    </div>
  ) : null;

  const alertDecisionActionPanel =
    isTraineeActor || hasStaffAccess ? (
      <div className="evidence-shell p-4 sm:p-5">
        <h3 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
          Decision
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["info_requested", "Info requested"],
              ["escalated", "Escalated"],
              ["false_positive", "False Positive"],
              ["true_positive", "True Positive"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={submitBusy}
              onClick={() => void onPickDecision(key)}
              className={`${DECISION_BUTTON_BASE} ${decisionOptionClass(key, effectiveDecision === key)}`}
            >
              {label}
            </button>
          ))}
        </div>
        {submitError ? <p className="mt-2 text-xs text-rose-600">{submitError}</p> : null}
        {isTraineeActor ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => void onResetDecision()}
              disabled={resetBusy || decisionsLoading}
              className="text-[11px] text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetBusy ? "Resetting..." : "Reset decision"}
            </button>
          </div>
        ) : null}
      </div>
    ) : null;

  const alertDescriptionPanel = (
    <div className="evidence-shell p-4 sm:p-5">
      <h3 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
        Description
      </h3>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{alert.description ?? ""}</p>
    </div>
  );

  /** Non-trainee: canonical aside keeps Description only. */
  const staffCanonicalAlertTrio =
      !isTraineeActor ? (
        <>
          {alertDescriptionPanel}
        </>
      ) : null;

  const staffReviewSidebar = isStaffReviewMode ? (
    <div className="space-y-4 lg:sticky lg:top-6">
      {staffCanonicalAlertTrio}
      <div className="evidence-shell p-4 sm:p-5">
        <ReviewSubmissionsPanel
          threadId={canonicalAsideThreadId}
          title="Reviewer Evaluation"
          showTraineeAction={false}
          showTitle
          sectionHeader
          withTopBorder={false}
          variant="admin"
        />
      </div>
      <ReviewThreadInternalNotePanel
        threadId={canonicalAsideThreadId}
        title="Case Note"
        variant="drafts"
        noThreadMessage="Open a review case from Admin to keep one shared case note for this submission."
      />
      <ObjectNotePanel
        title="Source Alert Note"
        mode="read"
        alertInternalId={alert.internal_id}
        emptyMessage="No alert note yet."
      />
    </div>
  ) : null;

  const alertContextPanels = (
    <>
      {hasStaffAccess && alertEditorOpen ? (
        <div className="evidence-shell p-4 sm:p-5">
          <SimulatorAlertForm
            viewer={appUser}
            mode="edit"
            initialValue={alert}
            initialUser={alertUserSummary}
            submitLabel="Save alert"
            onSaved={(nextAlert) => {
              setAlert(nextAlert);
              setAlertEditorOpen(false);
              setAlertEditorMessage("Alert details saved.");
              setReloadTick((tick) => tick + 1);
            }}
            onCancel={() => setAlertEditorOpen(false)}
          />
        </div>
      ) : null}
      <div className="evidence-shell p-4 sm:p-5">
        <div className="relative pb-4">
          <h3
            className="min-w-0 pr-[9rem] text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--app-shell-bg)" }}
          >
            Alert Information
          </h3>
          <div className="absolute inset-x-0 bottom-0 border-b border-[var(--border-subtle)]" aria-hidden />
          {isTraineeActor && (Boolean(alert.internal_id) || Boolean(alert.id)) ? (
            assignedToMe ? (
              <button
                type="button"
                disabled={assignBusy || unassignBusy}
                onClick={() => void onUnassignSelf()}
                className="absolute -right-[6px] -top-2 inline-flex shrink-0 items-center justify-center rounded-[1rem] border border-slate-300/90 bg-white/96 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unassignBusy ? "Saving…" : "Unassign"}
              </button>
            ) : (
              <button
                type="button"
                disabled={assignBusy || unassignBusy}
                onClick={() => void onAssignToMe()}
                className="absolute -right-[6px] -top-2 inline-flex shrink-0 items-center justify-center rounded-[1rem] border border-slate-300/90 bg-white/96 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignBusy ? "Saving…" : "Assign to me"}
              </button>
            )
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-slate-500">
            <span>{alert.id}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(alert.alert_date ?? alert.created_at)}</span>
            {alert.user_id ? (
              <>
                <span aria-hidden>·</span>
                <Link href={`/users/${alert.user_id}`} className="text-[var(--brand-700)] hover:underline">
                  {alert.user_id}
                </Link>
              </>
            ) : null}
          </p>
          <h3 className="text-base font-semibold text-slate-900">{formatRuleDisplay(ruleCode, ruleName)}</h3>

          <div className="flex flex-wrap items-center gap-2">
            {assignError ? <span className="text-xs text-rose-600">{assignError}</span> : null}
          </div>

          <div className="content-panel overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.93),rgba(248,251,254,0.95))]">
            <div
              className={`flex flex-col divide-y divide-slate-200/75 md:grid md:gap-px md:divide-y-0 md:bg-slate-200/75 ${
                isTraineeActor
                  ? "md:grid-cols-[0.95fr_0.8fr_0.9fr_1fr_1.1fr]"
                  : "md:grid-cols-[1fr_0.85fr_0.95fr_1.05fr]"
              }`}
            >
              <div className="bg-white/82 px-4 py-2.5">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</span>
                  <span className={`ui-badge w-fit ${statusBadgeClass(displayStatus)}`}>
                    {formatStatusLabel(displayStatus)}
                  </span>
                </div>
              </div>
              <div className="bg-white/82 px-4 py-2.5 md:border-l md:border-slate-200/75">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Type</span>
                  <span className={`ui-badge w-fit ${typeBadgeClass(alert?.alert_type ?? alert?.type ?? null)}`}>
                    {formatStatusLabel(alert?.alert_type ?? alert?.type ?? "")}
                  </span>
                </div>
              </div>
              <div className="bg-white/82 px-4 py-2.5 md:border-l md:border-slate-200/75">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Severity</span>
                  <span className={`ui-badge w-fit ${severityBadgeClass(alert?.severity ?? null)}`}>
                    {formatSeverityLabel(alert?.severity)}
                  </span>
                </div>
              </div>
              <div className="bg-white/82 px-4 py-2.5 md:border-l md:border-slate-200/75">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Decision</span>
                  <span className={`ui-badge w-fit ${decisionBadgeClass(effectiveDecision)}`}>
                    {getDecisionLabel(effectiveDecision)}
                  </span>
                </div>
              </div>
              {isTraineeActor ? (
                <div className="bg-white/82 px-4 py-2.5 md:border-l md:border-slate-200/75">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Assignment</span>
                    <span className={`ui-badge w-fit ${traineeAssignmentSummaryBadgeClass}`}>
                      {traineeAssignmentSummaryLabel}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {hasStaffAccess && !isTraineeActor ? alertDecisionActionPanel : null}
      {hasStaffAccess && !reviewThreadFromUrl?.trim() ? (
        <AlertReviewAssignmentsPanel alertId={alert.id} alertInternalId={alert.internal_id ?? null} />
      ) : null}
      {isTraineeActor ? (
        <>
          {alertDecisionActionPanel}
          {alertDescriptionPanel}
        </>
      ) : null}

      {otherAlerts.length > 0 ? (
        <div className="evidence-shell p-4 sm:p-5">
          <h3 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
            Other Alerts
          </h3>
          <div className="mt-4">
            <TableSwipeHint />
            <div className="scroll-x-touch">
              <table className="min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                    <th className={`pr-4 ${TABLE_PY_INNER}`}>Alert</th>
                    <th className={`pr-4 ${TABLE_PY_INNER}`}>Type</th>
                    <th className={`pr-4 ${TABLE_PY_INNER}`}>Status</th>
                    <th className={`text-right tabular-nums ${TABLE_PY_INNER}`}>Alert Date</th>
                  </tr>
                </thead>
                <tbody>
                  {otherAlerts.map((a, idx) => (
                    <tr
                      key={a.id}
                      className={`border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-200/50 ${
                        idx % 2 === 1 ? "bg-slate-50/70" : ""
                      }`}
                    >
                      <td className={`pr-4 ${TABLE_PY_INNER}`}>
                        <Link href={`/alerts/${a.id}`} className="font-mono text-xs text-[var(--brand-700)] hover:underline">
                          {a.id}
                        </Link>
                      </td>
                      <td className={`pr-4 ${TABLE_PY_INNER}`}>{formatStatusLabel(a.alert_type ?? a.type ?? "")}</td>
                      <td className={`pr-4 ${TABLE_PY_INNER}`}>{formatStatusLabel(a.status ?? "")}</td>
                      <td className={`text-right tabular-nums ${TABLE_PY_INNER}`}>{formatDate(a.alert_date ?? a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  const defaultAsidePanels = (
    <div className="space-y-4 lg:sticky lg:top-6">
      {staffCanonicalAlertTrio}
      {hasStaffAccess && alert.internal_id ? (
        <ObjectNotePanel
          title="Alert Note"
          mode="edit"
          alertInternalId={alert.internal_id}
          emptyMessage="No alert note yet."
          placeholder="Add a personal note for this alert..."
          saveButtonLabel="Save alert note"
        />
      ) : null}
      {traineeReviewWorkspacePanels}
    </div>
  );

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--brand-700)]">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/alerts" className="hover:text-[var(--brand-700)]">
            Alerts
          </Link>{" "}
          / <span className="font-mono text-slate-700">{alertId}</span>
        </nav>
        {hasStaffAccess ? (
          <button
            type="button"
            onClick={() => {
              setAlertEditorOpen((open) => !open);
              setAlertEditorMessage(null);
            }}
            className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
          >
            {alertEditorOpen ? "Close editor" : "Edit alert"}
          </button>
        ) : null}
      </div>

      {hasStaffAccess && alertEditorMessage ? (
        <p className="text-sm font-medium text-emerald-700">{alertEditorMessage}</p>
      ) : null}

      {isStaffReviewMode ? (
        <div className="space-y-4">
          {staffReviewModeHeader}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.95fr)]">
            <div className="min-w-0 space-y-4">
              <div>
                {staffReviewWorkspacePanel}
              </div>
              {alertContextPanels}
            </div>
            <aside className="min-w-0">{staffReviewSidebar}</aside>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0 space-y-4">{alertContextPanels}</div>
          <aside>{defaultAsidePanels}</aside>
        </div>
      )}
    </section>
  );
}
