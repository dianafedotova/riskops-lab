"use client";

import { AlertDetailSkeleton } from "@/components/alert-detail-skeleton";
import { QueryErrorBanner } from "@/components/query-error";
import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { formatDate, formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useTraineeDecisions } from "@/lib/hooks/use-trainee-decisions";
import { runSerializedAuth } from "@/lib/auth/auth-user-queue";
import { ensureAlertReviewThread } from "@/lib/review/ensure-thread";
import { fetchReviewThreadIdForAlert } from "@/lib/review/fetch-review-thread-id";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import {
  deleteTraineeAlertAssignmentForUser,
  fetchAlertAssignees,
  insertTraineeAlertAssignment,
} from "@/lib/trainee-alert-assignments";
import { formatPostgrestError } from "@/lib/trainee-user-watchlist";
import type { AlertNoteRow, AlertRow } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Decision = "false_positive" | "true_positive" | "info_requested" | "escalated";

type AlertWithRuleCode = AlertRow & { rule_code?: string | null; rule_name?: string | null };
type KeyInfo = {
  annualIncomeMinUsd: number | null;
  annualIncomeMaxUsd: number | null;
  spend30dUsd: number | null;
};

const ALERT_DETAIL_COLS =
  "id, internal_id, user_id, alert_type, severity, status, description, rule_code, rule_name, created_at" as const;

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

function formatUsd(value: number | null, opts?: { fractionDigits?: number }): string {
  if (value == null) return "—";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: opts?.fractionDigits ?? 0,
    maximumFractionDigits: opts?.fractionDigits ?? 0,
  })} USD`;
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
  if (s === "open") return "bg-sky-100 text-sky-700";
  if (s === "in review") return "bg-emerald-100 text-emerald-700";
  if (s === "resolved") return "bg-slate-200 text-slate-700";
  if (s === "closed") return "bg-slate-200 text-slate-700";
  if (s === "monitoring") return "bg-slate-200 text-slate-700";
  if (s === "escalated") return "bg-slate-200 text-slate-700";
  return "bg-slate-200 text-slate-700";
};

const severityBadgeClass = (severity: string | null) => {
  const s = (severity ?? "").trim().toLowerCase();
  if (s === "critical") return "bg-rose-200 text-rose-800";
  if (s === "high") return "bg-rose-100 text-rose-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  if (s === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
};

const typeBadgeClass = (type: string | null) => {
  const s = (type ?? "").trim().toLowerCase();
  if (s === "aml") return "bg-indigo-100 text-indigo-700";
  if (s === "fraud") return "bg-cyan-100 text-cyan-700";
  return "bg-slate-200 text-slate-700";
};

const decisionBadgeClass = (decision: string | null | undefined) => {
  const d = (decision ?? "").trim();
  if (!d) return "bg-slate-200 text-slate-600";
  if (d === "false_positive") return "bg-emerald-100 text-emerald-700";
  if (d === "true_positive") return "bg-rose-100 text-rose-700";
  if (d === "info_requested") return "bg-cyan-100 text-cyan-700";
  if (d === "escalated") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-600";
};

const decisionOptionClass = (key: Decision, selected: boolean) => {
  if (key === "info_requested") {
    return selected
      ? "border-slate-400 bg-slate-100 text-slate-700"
      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50";
  }
  if (key === "escalated") {
    return selected
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50/60";
  }
  if (key === "false_positive") {
    return selected
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50/60";
  }
  return selected
    ? "border-rose-300 bg-rose-50 text-rose-700"
    : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50/60";
};

export default function AlertDetailsPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("thread");
  const { appUser } = useCurrentUser();
  const params = useParams<{ id: string }>();
  const alertId = params?.id ?? "a-unknown";

  const [predefinedNotes, setPredefinedNotes] = useState<AlertNoteRow[]>([]);
  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [otherAlerts, setOtherAlerts] = useState<AlertRow[]>([]);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  /** Latest review thread for this alert (canonical sidebar); RLS allows trainee/admin per policies. */
  const [canonicalAsideThreadId, setCanonicalAsideThreadId] = useState<string | null>(null);
  const [threadCheckDone, setThreadCheckDone] = useState(false);
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

  const reviewMode = Boolean(activeThreadId);
  /** Latest thread for this alert on canonical view; active thread in review mode. */
  const decisionsThreadId = reviewMode ? activeThreadId : canonicalAsideThreadId;
  const { decisions, loading: decisionsLoading, submitDecision, resetDecision } = useTraineeDecisions(decisionsThreadId);

  useEffect(() => {
    if (!alert) {
      setAssignees([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { assignees: list } = await fetchAlertAssignees(supabase, {
        internalId: alert.internal_id,
        publicId: alert.id,
      });
      if (!cancelled) setAssignees(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [alert?.id, alert?.internal_id, supabase, reloadTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      if (!row) {
        setAlert(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      const a = row as AlertRow;
      setAlert(a);
      setKeyInfo(null);
      const uid = a.user_id;
      const { data: notesData, error: notesErr } = await supabase
        .from("alerts_note")
        .select("id, alert_id, note_text, created_at, created_by")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!notesErr && notesData) {
          setPredefinedNotes(notesData as AlertNoteRow[]);
        } else {
          setPredefinedNotes([]);
        }
      }
      const ruleCode = (row as AlertWithRuleCode).rule_code?.trim() ?? "";
      if (uid) {
        const { data: others } = await supabase
          .from("alerts")
          .select(ALERT_DETAIL_COLS)
          .eq("user_id", uid)
          .neq("id", alertId)
          .order("created_at", { ascending: false });
        if (!cancelled) setOtherAlerts((others as AlertRow[]) ?? []);

        if (ruleCode === "AML_001") {
          try {
            const { data: userRow } = await supabase
              .from("users")
              .select("annual_income_min_usd, annual_income_max_usd")
              .eq("id", uid)
              .maybeSingle();

            const alertDate = new Date(a.created_at);
            const startDate = new Date(alertDate);
            startDate.setDate(startDate.getDate() - 30);

            let spend30dUsd: number | null = null;
            if (!Number.isNaN(alertDate.getTime())) {
              const dateCol = "transaction_date";
              const { data: txRows } = await supabase
                .from("transactions")
                .select("amount, amount_usd")
                .eq("user_id", uid)
                .eq("direction", "outbound")
                .gte(dateCol, startDate.toISOString().slice(0, 10))
                .lte(dateCol, alertDate.toISOString().slice(0, 10));

            const rows = (txRows ?? []) as { amount?: number | null; amount_usd?: number | null }[];
            spend30dUsd = rows.reduce((sum, tx) => sum + (tx.amount_usd ?? tx.amount ?? 0), 0);
            }

            if (!cancelled) {
              const income = (userRow ?? null) as
                | { annual_income_min_usd: number | null; annual_income_max_usd: number | null }
                | null;
              setKeyInfo({
                annualIncomeMinUsd: income?.annual_income_min_usd ?? null,
                annualIncomeMaxUsd: income?.annual_income_max_usd ?? null,
                spend30dUsd,
              });
            }
          } catch {
            if (!cancelled) setKeyInfo(null);
          }
        }
      } else {
        setOtherAlerts([]);
        setKeyInfo(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [alertId, reloadTick, supabase]);

  useEffect(() => {
    let cancelled = false;
    if (!threadParam || !alert?.internal_id) {
      setActiveThreadId(null);
      setThreadCheckDone(true);
      return;
    }
    if (!appUser) {
      setThreadCheckDone(false);
      return;
    }
    setThreadCheckDone(false);
    (async () => {
      const { data: th, error: thErr } = await supabase
        .from("review_threads")
        .select("id, app_user_id, alert_id, context_type")
        .eq("id", threadParam)
        .maybeSingle();
      if (cancelled) return;
      if (thErr || !th) {
        setActiveThreadId(null);
        setThreadCheckDone(true);
        return;
      }
      if (th.context_type !== "alert" || String(th.alert_id) !== String(alert.id)) {
        setActiveThreadId(null);
        setThreadCheckDone(true);
        return;
      }
      if (appUser.role === "user" && th.app_user_id !== appUser.id) {
        setActiveThreadId(null);
        setThreadCheckDone(true);
        return;
      }
      setActiveThreadId(String(th.id));
      setThreadCheckDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadParam, alert?.internal_id, appUser, supabase]);

  useEffect(() => {
    if (!alert?.internal_id) {
      setCanonicalAsideThreadId(null);
      return;
    }
    if (!appUser) {
      setCanonicalAsideThreadId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      if (appUser.role === "user") {
        const { threadId, error: thErr } = await ensureAlertReviewThread(
          supabase,
          appUser.id,
          String(alert.internal_id)
        );
        if (cancelled) return;
        if (thErr || !threadId) {
          setCanonicalAsideThreadId(null);
          return;
        }
        setCanonicalAsideThreadId(threadId);
        return;
      }
      const { threadId, error: thErr } = await fetchReviewThreadIdForAlert(
        supabase,
        String(alert.internal_id),
        null
      );
      if (cancelled) return;
      if (thErr || !threadId) {
        setCanonicalAsideThreadId(null);
        return;
      }
      setCanonicalAsideThreadId(threadId);
    })();
    return () => {
      cancelled = true;
    };
  }, [alert?.internal_id, appUser, supabase, reloadTick]);

  const onAssignToMe = useCallback(async () => {
    if (!appUser?.id || appUser.role !== "user" || !alert) return;
    if (!alert.internal_id && !alert.id) return;
    setAssignBusy(true);
    setAssignError(null);
    try {
      await runSerializedAuth(async () => {
        const { error: insErr } = await insertTraineeAlertAssignment(supabase, appUser.id, {
          internalId: alert.internal_id,
          publicId: alert.id,
        });
        if (insErr) throw insErr;
        const { assignees: list } = await fetchAlertAssignees(supabase, {
          internalId: alert.internal_id,
          publicId: alert.id,
        });
        setAssignees(list);
      });
    } catch (e) {
      setAssignError(formatPostgrestError(e));
    } finally {
      setAssignBusy(false);
    }
  }, [alert, appUser, supabase]);

  const onUnassignSelf = useCallback(async () => {
    if (!appUser?.id || appUser.role !== "user" || !alert) return;
    setUnassignBusy(true);
    setAssignError(null);
    try {
      await runSerializedAuth(async () => {
        const { error: delErr } = await deleteTraineeAlertAssignmentForUser(supabase, appUser.id, {
          internalId: alert.internal_id,
          publicId: alert.id,
        });
        if (delErr) throw delErr;
        const { assignees: list } = await fetchAlertAssignees(supabase, {
          internalId: alert.internal_id,
          publicId: alert.id,
        });
        setAssignees(list);
      });
    } catch (e) {
      setAssignError(formatPostgrestError(e));
    } finally {
      setUnassignBusy(false);
    }
  }, [alert, appUser, supabase]);

  const assignedToMe =
    Boolean(appUser?.id) && assignees.some((a) => a.app_user_id === appUser?.id);

  const assignmentSummaryLabel =
    assignees.length === 0 ? "Unassigned" : assignedToMe ? "Assigned to you" : "Assigned";

  const onSubmitDecision = useCallback(async () => {
    if (!appUser?.id || !pendingDecision || !decisionsThreadId || !alert) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      await submitDecision({
        appUserId: appUser.id,
        alertId: alert.id,
        userId: alert.user_id,
        decision: pendingDecision,
        proposedAlertStatus: proposedStatusForDecision(pendingDecision),
        rationale: rationale.trim() || null,
        reviewState: "submitted",
      });
      setRationale("");
      setPendingDecision(null);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitBusy(false);
    }
  }, [alert, appUser?.id, decisionsThreadId, pendingDecision, rationale, submitDecision]);

  const onPickDecision = useCallback(
    async (decision: Decision) => {
      setPendingDecision(decision);
      if (appUser?.role !== "user" || !appUser.id || !decisionsThreadId || !alert) return;
      setSubmitBusy(true);
      setSubmitError(null);
      try {
        await submitDecision({
          appUserId: appUser.id,
          alertId: alert.id,
          userId: alert.user_id,
          decision,
          proposedAlertStatus: proposedStatusForDecision(decision),
          rationale: rationale.trim() || null,
          reviewState: "submitted",
        });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setSubmitBusy(false);
      }
    },
    [alert, appUser, decisionsThreadId, rationale, submitDecision]
  );

  const onResetDecision = useCallback(async () => {
    if (appUser?.role !== "user" || !appUser.id) return;
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
  }, [appUser, resetDecision]);

  const ruleCode = ((alert as AlertWithRuleCode | null)?.rule_code ?? "").trim();
  const ruleName = ((alert as AlertWithRuleCode | null)?.rule_name ?? "").trim();
  const latestDecision = decisions.length > 0 ? decisions[decisions.length - 1]?.decision ?? null : null;
  const effectiveDecision = pendingDecision ?? (latestDecision as Decision | null);
  const displayStatus =
    effectiveDecision === "info_requested" || effectiveDecision === "escalated"
      ? "in review"
      : effectiveDecision === "false_positive" || effectiveDecision === "true_positive"
        ? "resolved"
        : (alert?.status ?? "open");
  const declaredIncomeLabel =
    keyInfo?.annualIncomeMinUsd != null || keyInfo?.annualIncomeMaxUsd != null
      ? `${keyInfo?.annualIncomeMinUsd != null ? keyInfo.annualIncomeMinUsd.toLocaleString("en-US") : "—"} - ${
          keyInfo?.annualIncomeMaxUsd != null ? keyInfo.annualIncomeMaxUsd.toLocaleString("en-US") : "—"
        } USD`
      : "—";

  const differencePct =
    keyInfo?.annualIncomeMaxUsd != null &&
    keyInfo?.spend30dUsd != null &&
    keyInfo.annualIncomeMaxUsd > 0
      ? Math.round(((keyInfo.spend30dUsd - keyInfo.annualIncomeMaxUsd) / keyInfo.annualIncomeMaxUsd) * 100)
      : null;
  const differenceLabel = differencePct != null ? (differencePct >= 0 ? `+${differencePct}%` : `${differencePct}%`) : "—";

  const threadInvalid = Boolean(threadParam && threadCheckDone && !activeThreadId && alert);

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
        <Link href="/alerts" className="text-sm text-[#264B5A] hover:underline">
          Back to Alerts
        </Link>
      </section>
    );
  }

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#264B5A]">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/alerts" className="hover:text-[#264B5A]">
          Alerts
        </Link>{" "}
        / <span className="font-mono text-slate-700">{alertId}</span>
      </nav>

      {threadInvalid ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This review link is invalid or you do not have access.{" "}
          <Link href={`/alerts/${alertId}`} className="font-medium text-[#264B5A] underline">
            View canonical alert
          </Link>
        </p>
      ) : null}

      {reviewMode ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <h2 className="heading-section mb-2">Review workspace</h2>
          <p className="mb-3 text-xs text-slate-600">
            Decisions and comments here are training-only and do not change simulator alert records.
          </p>
          {decisionsLoading ? (
            <p className="text-xs text-slate-500">Loading decisions…</p>
          ) : decisions.length > 0 ? (
            <ul className="mb-4 space-y-2 text-sm">
              {decisions.map((d) => (
                <li key={d.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="tabular-nums">{formatDateTime(d.created_at)}</span>
                    {d.proposed_alert_status ? (
                      <span>Proposed status: {formatStatusLabel(d.proposed_alert_status)}</span>
                    ) : null}
                  </div>
                  <p className="mb-1">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${decisionBadgeClass(d.decision)}`}>
                      {getDecisionLabel(d.decision)}
                    </span>
                  </p>
                  {d.rationale ? <p className="whitespace-pre-wrap text-slate-700">{d.rationale}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-xs text-slate-500">No decisions submitted in this thread yet.</p>
          )}

          {appUser?.role === "user" ? (
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <p className="text-xs font-medium text-slate-700">Submit a new decision (append-only)</p>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                placeholder="Rationale (optional)"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
              <button
                type="button"
                disabled={!pendingDecision || submitBusy}
                onClick={() => void onSubmitDecision()}
                className="rounded-lg bg-[#264B5A] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitBusy ? "Submitting…" : "Submit decision"}
              </button>
              {submitError ? <p className="text-xs text-rose-600">{submitError}</p> : null}
            </div>
          ) : null}

          <div className="mt-4 border-t border-slate-200 pt-4">
            <SimulatorCommentsPanel
              threadId={activeThreadId}
              reviewMode
              privateAlertInternalId={alert.internal_id ?? null}
              privateSimulatorUserId={null}
              predefinedNotes={predefinedNotes.map((n) => ({
                id: n.id,
                note_text: n.note_text,
                created_at: n.created_at,
                created_by: n.created_by,
              }))}
              title="Training thread & analyst notes"
              showTitle
              withTopBorder={false}
              emptyMessage="No thread messages yet."
              adminModeOverride={appUser?.role === "admin" ? "reply" : undefined}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm sm:p-5">
            <h2 className="heading-section mb-3">Alert Information</h2>
            <div className="space-y-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-slate-600">
                <span>{alert.id}</span>
                <span aria-hidden>·</span>
                <span>{formatDateTime(alert.created_at)}</span>
                {alert.user_id ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link href={`/users/${alert.user_id}`} className="text-[#264B5A] hover:underline">
                      {alert.user_id}
                    </Link>
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-sm text-slate-600">
                <span>{assignmentSummaryLabel}</span>
                {appUser?.role === "user" && !reviewMode && (Boolean(alert.internal_id) || Boolean(alert.id)) ? (
                  <>
                    <span aria-hidden>·</span>
                    {assignees.length === 0 ? (
                      <button
                        type="button"
                        disabled={assignBusy || unassignBusy}
                        onClick={() => void onAssignToMe()}
                        className="rounded-lg bg-[#264B5A] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1f3e4a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {assignBusy ? "Saving…" : "Assign to me"}
                      </button>
                    ) : null}
                    {assignedToMe ? (
                      <button
                        type="button"
                        disabled={assignBusy || unassignBusy}
                        onClick={() => void onUnassignSelf()}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {unassignBusy ? "Saving…" : "Unassign"}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{formatRuleDisplay(ruleCode, ruleName)}</h3>

              <div className="flex flex-wrap items-center gap-2">
                {reviewMode ? (
                  <Link
                    href={`/alerts/${alertId}`}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back to canonical view
                  </Link>
                ) : null}
                {assignError ? <span className="text-xs text-rose-600">{assignError}</span> : null}
              </div>

              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Status:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(displayStatus)}`}>
                    {formatStatusLabel(displayStatus)}
                  </span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Type:</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(alert?.alert_type ?? alert?.type ?? null)}`}
                  >
                    {formatStatusLabel(alert?.alert_type ?? alert?.type ?? "")}
                  </span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Severity:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(alert?.severity ?? null)}`}>
                    {formatSeverityLabel(alert?.severity)}
                  </span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Decision:</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${decisionBadgeClass(effectiveDecision)}`}
                  >
                    {getDecisionLabel(effectiveDecision)}
                  </span>
                </p>
              </div>

            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
            <h2 className="heading-section mb-3">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{alert.description ?? ""}</p>
          </div>

          {ruleCode === "AML_001" && (
            <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
              <h2 className="heading-section mb-3">Key Info</h2>
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm sm:flex-col sm:gap-0.5 sm:gap-x-0">
                  <span className="font-medium">Declared income:</span>
                  <span>{declaredIncomeLabel}</span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm sm:flex-col sm:gap-0.5 sm:gap-x-0">
                  <span className="font-medium">30d spend:</span>
                  <span>{formatUsd(keyInfo?.spend30dUsd ?? null, { fractionDigits: 2 })}</span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg bg-white/90 px-3 py-2 shadow-sm sm:flex-col sm:gap-0.5 sm:gap-x-0">
                  <span className="font-medium">Difference:</span>
                  <span>{differenceLabel}</span>
                </p>
              </div>
            </div>
          )}

          {appUser?.role === "user" || appUser?.role === "admin" ? (
            <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
              <h2 className="heading-section mb-3">Decision</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    onClick={() => void onPickDecision(key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${decisionOptionClass(
                      key,
                      pendingDecision === key
                    )}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {appUser?.role === "user" ? (
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
              {appUser?.role === "admin" ? (
                <p className="mt-2 text-[10px] leading-4 text-slate-400">
                  Admin view: status/decision buttons are demo-only and do not write to the database.
                </p>
              ) : null}
            </div>
          ) : null}

          {otherAlerts.length > 0 ? (
            <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
              <h2 className="heading-section mb-3">Other Alerts</h2>
              <TableSwipeHint />
              <div className="scroll-x-touch">
                <table className="min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Alert</th>
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Type</th>
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Status</th>
                      <th className={`text-right tabular-nums ${TABLE_PY_INNER}`}>Created</th>
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
                          <Link href={`/alerts/${a.id}`} className="font-mono text-xs text-[#264B5A] hover:underline">
                            {a.id}
                          </Link>
                        </td>
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>{formatStatusLabel(a.alert_type ?? a.type ?? "")}</td>
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>{formatStatusLabel(a.status ?? "")}</td>
                        <td className={`text-right tabular-nums ${TABLE_PY_INNER}`}>{formatDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-6">
            {appUser?.role === "admin" && alert.internal_id ? (
              <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
                <h2 className="heading-section mb-3">Admin internal notes</h2>
                <SimulatorCommentsPanel
                  privateAlertInternalId={alert.internal_id}
                  privateSimulatorUserId={null}
                  adminModeOverride="private"
                  showTitle={false}
                  withTopBorder={false}
                  emptyMessage="No notes yet."
                />
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
              <h2 className="heading-section mb-3">Analyst notes</h2>
              {appUser?.role === "admin" ? (
                <div className="mb-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  Go to{" "}
                  <Link href="/admin" className="font-medium text-[#264B5A] hover:underline">
                    Admin Panel
                  </Link>{" "}
                  to review trainee comments when review threads have messages.
                </div>
              ) : null}
              <SimulatorCommentsPanel
                threadId={appUser?.role === "admin" ? activeThreadId : canonicalAsideThreadId}
                reviewMode
                privateAlertInternalId={alert.internal_id ?? null}
                privateSimulatorUserId={null}
                predefinedNotes={predefinedNotes.map((n) => ({
                  id: n.id,
                  note_text: n.note_text,
                  created_at: n.created_at,
                  created_by: n.created_by,
                }))}
                adminModeOverride={appUser?.role === "admin" ? "reply" : undefined}
                showTitle={false}
                withTopBorder={false}
                emptyMessage="No notes yet. Open Review to start a trainee thread."
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
