"use client";

import { ageFromIsoDate, formatDate, formatDateTime, formatEventType, formatMoneyUsd, formatTransactionAmount, maskIp } from "@/lib/format";
import { getOpsEventLabel } from "@/lib/ops-events";
import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import { useTraineeDecisions } from "@/lib/hooks/use-trainee-decisions";
import { ensureUserReviewThread } from "@/lib/review/ensure-thread";
import { fetchReviewThreadIdForProfile } from "@/lib/review/fetch-review-thread-id";
import { createClient } from "@/lib/supabase";
import type { AlertRow, OpsEventRow, PaymentMethodRow, TransactionRow, UserEventRow, UserFinancialsRow, UserNoteRow, UserRow } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { QueryErrorBanner } from "@/components/query-error";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { UserProfileSkeleton } from "@/components/user-profile-skeleton";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import { normalizeFinancialsRow } from "@/lib/user-financials";
import {
  buildTraineeWatchlistInsertRow,
  formatPostgrestError,
  resolveTraineeWatchlistSimulatorColumn,
} from "@/lib/trainee-user-watchlist";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TabKey =
  | "overview"
  | "transactions"
  | "accounts"
  | "network"
  | "activity"
  | "opslog"
  | "alerts"
  | "notes";

type TraineeDecisionChoice = "false_positive" | "true_positive" | "info_requested" | "escalated";

function proposedStatusForUserDecision(decision: TraineeDecisionChoice): string {
  if (decision === "false_positive") return "closed";
  if (decision === "true_positive") return "escalated";
  if (decision === "info_requested") return "open";
  return "escalated";
}

function getTraineeDecisionLabel(decision: string | null | undefined): string {
  const d = (decision ?? "").trim();
  if (!d) return "Not set";
  if (d === "false_positive") return "False Positive";
  if (d === "true_positive") return "True Positive";
  if (d === "info_requested") return "Info requested";
  if (d === "escalated") return "Escalated";
  return d;
}

function traineeDecisionBadgeClass(decision: string | null | undefined): string {
  const d = (decision ?? "").trim();
  if (!d) return "bg-slate-200 text-slate-600";
  if (d === "false_positive") return "bg-emerald-100 text-emerald-700";
  if (d === "true_positive") return "bg-rose-100 text-rose-700";
  if (d === "info_requested") return "bg-slate-100 text-slate-600";
  if (d === "escalated") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-600";
}

type AccountStatus = "active" | "not_active" | "restricted" | "blocked" | "closed";

const PROFILE_TABS: { key: TabKey; label: string }[] = [
  { key: "transactions", label: "Transactions" },
  { key: "accounts", label: "Cards & Accounts" },
  { key: "network", label: "Devices & Links" },
  { key: "activity", label: "User Activity" },
  { key: "overview", label: "SOF Questionnaire" },
  { key: "alerts", label: "Linked Alerts" },
  { key: "opslog", label: "Operations Log" },
  { key: "notes", label: "Internal Notes" },
];

type UiPaymentMethod = PaymentMethodRow & {
  closedByClosure?: boolean;
  restrictedFrozen?: boolean;
  blockedByFullBlock?: boolean;
};

function normalizeAccountStatus(value: string | null | undefined): AccountStatus {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "active" || v === "not_active" || v === "restricted" || v === "blocked" || v === "closed") {
    return v;
  }
  return "active";
}

function accountStatusLabel(status: AccountStatus): string {
  if (status === "not_active") return "Not Active";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toTitleCase(v: string | null | undefined): string {
  const raw = (v ?? "").trim();
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function getAlertType(a: AlertRow & { rule_code?: string | null }): string {
  const t = (a.alert_type ?? a.type ?? "").trim();
  if (t) return t;
  const code = (a.rule_code ?? "").trim();
  if (code) return code.split("_")[0] ?? "";
  return "";
}

function getAlertDescription(a: AlertRow & { rule_name?: string | null }): string {
  const rn = (a.rule_name ?? "").trim();
  if (rn) return rn;
  const d = (a.description ?? "").trim();
  return d || "—";
}

const normalizeStr = (v: unknown) => (v == null ? "" : String(v)).trim().toLowerCase();
const linkedAlertTypeBadgeClass = (type: string | null | undefined) => {
  const s = normalizeStr(type);
  if (!s) return "bg-slate-200 text-slate-700";
  if (s === "aml") return "bg-indigo-100 text-indigo-700";
  return "bg-cyan-100 text-cyan-700";
};
const linkedAlertSeverityBadgeClass = (severity: string | null) => {
  const s = normalizeStr(severity);
  if (s === "critical") return "bg-rose-200 text-rose-800";
  if (s === "high") return "bg-rose-100 text-rose-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  if (s === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
};
const linkedAlertStatusBadgeClass = (status: string | null) => {
  const s = normalizeStr(status);
  if (s === "open") return "bg-sky-100 text-sky-700";
  if (s === "monitoring") return "bg-amber-100 text-amber-700";
  if (s === "escalated") return "bg-violet-100 text-violet-700";
  if (s === "closed") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
};

function transactionStatusBadge(status: string | null): { label: string; className: string } {
  const raw = (status ?? "").trim();
  if (!raw) {
    return {
      label: "—",
      className: "bg-slate-50 text-slate-500 ring-slate-200",
    };
  }
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s === "completed" || s === "complete" || s === "success" || s === "settled" || s === "posted") {
    return { label: raw, className: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  }
  if (
    s.includes("reject") ||
    s === "failed" ||
    s.includes("declin") ||
    s === "cancelled" ||
    s === "canceled" ||
    s.includes("revers")
  ) {
    return { label: raw, className: "bg-rose-50 text-rose-800 ring-rose-200" };
  }
  if (
    s.includes("pending") ||
    s.includes("processing") ||
    s.includes("review") ||
    s.includes("hold") ||
    s.includes("authori")
  ) {
    return { label: raw, className: "bg-amber-50 text-amber-900 ring-amber-200" };
  }
  return { label: raw, className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function PaymentMethodStatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "—").toLowerCase();
  const styles =
    s === "active"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : s === "frozen"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : s === "blocked"
          ? "bg-rose-50 text-rose-900 ring-rose-200"
          : s === "closed"
            ? "bg-slate-200/80 text-slate-700 ring-slate-300"
            : "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${styles}`}
    >
      {status ?? "—"}
    </span>
  );
}

type SimulatorAccountActionButtonsProps = {
  accountStatus: AccountStatus;
  canOperate: boolean;
  onReactivateAccount: () => void;
  onUnblockAccount: () => void;
  onApplyPartialBlock: () => void;
  onApplyFullBlock: () => void;
  onCloseAccount: () => void;
  className?: string;
};

function SimulatorAccountActionButtons({
  accountStatus,
  canOperate,
  onReactivateAccount,
  onUnblockAccount,
  onApplyPartialBlock,
  onApplyFullBlock,
  onCloseAccount,
  className,
}: SimulatorAccountActionButtonsProps) {
  const wrap = className ?? "flex flex-wrap items-center gap-1.5";
  return (
    <div className={wrap}>
      {accountStatus === "not_active" ? (
        <span className="text-xs text-slate-500">KYC required</span>
      ) : accountStatus === "closed" ? (
        <button
          type="button"
          onClick={onReactivateAccount}
          className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50/50"
        >
          Reactivate Account
        </button>
      ) : accountStatus === "restricted" ? (
        <>
          <button
            type="button"
            onClick={onUnblockAccount}
            className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50/50"
          >
            Unblock
          </button>
          <button
            type="button"
            onClick={onApplyFullBlock}
            className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50/50"
          >
            Full Block
          </button>
          <button
            type="button"
            onClick={onCloseAccount}
            className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50"
          >
            Account Closure
          </button>
        </>
      ) : accountStatus === "blocked" ? (
        <>
          <button
            type="button"
            onClick={onUnblockAccount}
            className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50/50"
          >
            Unblock
          </button>
          <button
            type="button"
            onClick={onCloseAccount}
            className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50"
          >
            Account Closure
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onApplyPartialBlock}
            disabled={!canOperate}
            className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-medium text-amber-700 enabled:hover:bg-amber-50/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Partial Block
          </button>
          <button
            type="button"
            onClick={onApplyFullBlock}
            disabled={!canOperate}
            className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 enabled:hover:bg-rose-50/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Full Block
          </button>
          <button
            type="button"
            onClick={onCloseAccount}
            disabled={!canOperate}
            className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 enabled:hover:bg-slate-100/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Account Closure
          </button>
        </>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("thread");
  const { appUser } = useCurrentUser();
  const params = useParams<{ id: string }>();
  const userId = params?.id ?? "";
  const [activeTab, setActiveTab] = useState<TabKey>("transactions");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [predefinedNotes, setPredefinedNotes] = useState<UserNoteRow[]>([]);

  const [user, setUser] = useState<UserRow | null>(null);
  const [userAlerts, setUserAlerts] = useState<AlertRow[]>([]);
  const [userEvents, setUserEvents] = useState<UserEventRow[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<{ userId: string; deviceName: string }[]>([]);
  const [opsEvents, setOpsEvents] = useState<OpsEventRow[]>([]);
  const [userTransactions, setUserTransactions] = useState<TransactionRow[]>([]);
  const [financials, setFinancials] = useState<UserFinancialsRow | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<UiPaymentMethod[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [txError, setTxError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selfieLoadFailed, setSelfieLoadFailed] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadCheckDone, setThreadCheckDone] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<TraineeDecisionChoice | null>(null);
  const [rationale, setRationale] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [notesTabThreadId, setNotesTabThreadId] = useState<string | null>(null);
  const [notesTabThreadError, setNotesTabThreadError] = useState<string | null>(null);
  const [internalNotesLoadError, setInternalNotesLoadError] = useState<string | null>(null);

  const reviewMode = Boolean(activeThreadId);
  const { decisions, loading: decisionsLoading, submitDecision } = useTraineeDecisions(reviewMode ? activeThreadId : null);

  useEffect(() => {
    setSelfieLoadFailed(false);
    setSelfieUrl(null);
  }, [user?.id, user?.selfie_path]);

  useEffect(() => {
    if (!user?.selfie_path) {
      setSelfieUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from("selfie")
        .createSignedUrl(user.selfie_path!, 3600);
      if (cancelled) return;
      if (error) {
        const fallback = supabase.storage.from("selfie").getPublicUrl(user.selfie_path!).data.publicUrl;
        setSelfieUrl(fallback);
        return;
      }
      setSelfieUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.selfie_path]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setTxError(null);
      setInternalNotesLoadError(null);
      const { data: row, error: qError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setUser(null);
        setUserAlerts([]);
        setUserEvents([]);
        setLinkedAccounts([]);
        setOpsEvents([]);
        setPredefinedNotes([]);
        setUserTransactions([]);
        setFinancials(null);
        setPaymentMethods([]);
        setAccountStatus("active");
        setTxError(null);
        setLoading(false);
        return;
      }
      if (!row) {
        setUser(null);
        setUserAlerts([]);
        setUserEvents([]);
        setLinkedAccounts([]);
        setOpsEvents([]);
        setPredefinedNotes([]);
        setUserTransactions([]);
        setFinancials(null);
        setPaymentMethods([]);
        setAccountStatus("active");
        setTxError(null);
        setLoading(false);
        return;
      }
      const userRow = row as UserRow;
      setUser(userRow);
      setAccountStatus(normalizeAccountStatus(userRow.status));
      const canonicalUserId = userRow.id;
      if (!canonicalUserId) {
        setError("User record has no id");
        setLoading(false);
        return;
      }
      const userIdInternal = canonicalUserId;
      const [alertsRes, eventsRes, txRes, finRes, pmRes, opsRes] = await Promise.all([
        supabase.from("alerts").select("*").eq("user_id", userIdInternal).order("created_at", { ascending: false }),
        supabase
          .from("user_events")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("event_time", { ascending: false }),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("transaction_date", { ascending: false }),
        supabase.from("user_financials").select("*").eq("user_id", canonicalUserId).maybeSingle(),
        supabase.from("user_payment_methods").select("*").eq("user_id", userIdInternal),
        supabase
          .from("ops_events")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("event_time", { ascending: false })
      ]);
      if (!cancelled) setUserAlerts((alertsRes.data as AlertRow[]) ?? []);
      const events = (eventsRes.data as UserEventRow[]) ?? [];
      if (!cancelled) setUserEvents(events);

      const myDeviceIds = [...new Set(events.filter((e) => e.device_id).map((e) => e.device_id!))];
      if (!cancelled && myDeviceIds.length > 0) {
        const { data: linkedRows } = await supabase
          .from("user_events")
          .select("user_id, device_name")
          .in("device_id", myDeviceIds)
          .neq("user_id", userIdInternal);
        const byUser = new Map<string, string>();
        for (const r of linkedRows ?? []) {
          const row = r as { user_id: string; device_name: string | null };
          if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, row.device_name ?? "Unknown device");
          }
        }
        setLinkedAccounts(Array.from(byUser.entries()).map(([userId, deviceName]) => ({ userId, deviceName })));
      } else if (!cancelled) {
        setLinkedAccounts([]);
      }

      if (!cancelled) {
        setFinancials(normalizeFinancialsRow(finRes.data ?? null));
      }
      if (!cancelled) setPaymentMethods(((pmRes.data as PaymentMethodRow[]) ?? []) as UiPaymentMethod[]);
      if (!cancelled) setOpsEvents((opsRes.data as OpsEventRow[]) ?? []);
      // internal_notes: column `text` is a PostgREST reserved token — must be selected as "text".
      type RawNote = {
        id: string;
        user_id: string;
        note_text?: string | null;
        text?: string | null;
        created_at: string;
        created_by: string | null;
      };
      const mapRawNotes = (rows: RawNote[]): UserNoteRow[] =>
        rows.map((r) => {
          const body = (r.note_text ?? r.text ?? "").trim();
          return {
            id: r.id,
            user_id: r.user_id,
            note_text: body.length ? body : "—",
            created_at: r.created_at,
            created_by: r.created_by,
          };
        });
      let notesData: UserNoteRow[] = [];
      let notesLoadErr: string | null = null;
      const noteSelectAttempts = [
        'id, user_id, note_text, "text", created_at, created_by',
        "id, user_id, note_text, created_at, created_by",
        'id, user_id, "text", created_at, created_by',
        "*",
      ] as const;
      const userIdsForNotes = Array.from(
        new Set(
          [canonicalUserId, canonicalUserId.trim(), canonicalUserId.trim().toLowerCase()].filter(
            (id) => id.length > 0
          )
        )
      );
      outerNotes: for (const uid of userIdsForNotes) {
        for (const cols of noteSelectAttempts) {
          const { data, error } = await supabase
            .from("internal_notes")
            .select(cols)
            .eq("user_id", uid)
            .order("created_at", { ascending: false });
          if (error) {
            notesLoadErr = error.message;
            continue;
          }
          const mapped = mapRawNotes(((data ?? []) as unknown) as RawNote[]);
          notesLoadErr = null;
          if (mapped.length > 0) {
            notesData = mapped;
            break outerNotes;
          }
          break;
        }
      }
      if (!cancelled) {
        setPredefinedNotes(notesData);
        setInternalNotesLoadError(notesLoadErr);
      }
      if (!cancelled) {
        setTxError(txRes.error?.message ?? null);
        const tx = txRes.error ? [] : (txRes.data as TransactionRow[]) ?? [];
        setUserTransactions(tx);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadTick]);

  useEffect(() => {
    let cancelled = false;
    if (!threadParam || !user?.id) {
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
        .select("id, app_user_id, user_id, context_type")
        .eq("id", threadParam)
        .maybeSingle();
      if (cancelled) return;
      if (thErr || !th) {
        setActiveThreadId(null);
        setThreadCheckDone(true);
        return;
      }
      if (th.context_type !== "profile" || String(th.user_id) !== user.id) {
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
  }, [threadParam, user?.id, appUser, supabase]);

  /** Notes tab: resolve review_threads.id (thread-scoped simulator_comments). Trainees: own thread for this profile; admins: latest thread on profile. */
  useEffect(() => {
    if (activeTab !== "notes" || !user?.id || !appUser) {
      return;
    }
    let cancelled = false;
    setNotesTabThreadError(null);
    if (appUser.role !== "admin" && appUser.role !== "user") {
      setNotesTabThreadId(null);
      return;
    }
    (async () => {
      if (appUser.role === "user") {
        const { threadId, error: thErr } = await ensureUserReviewThread(supabase, appUser.id, user.id);
        if (cancelled) return;
        if (thErr || !threadId) {
          setNotesTabThreadId(null);
          setNotesTabThreadError(thErr?.message ?? "Could not open a review thread for this profile.");
          return;
        }
        setNotesTabThreadId(threadId);
        return;
      }
      const { threadId, error: thErr } = await fetchReviewThreadIdForProfile(supabase, user.id, null);
      if (cancelled) return;
      if (thErr) {
        setNotesTabThreadId(null);
        setNotesTabThreadError(thErr.message);
        return;
      }
      setNotesTabThreadId(threadId);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, appUser, user?.id, supabase]);

  useEffect(() => {
    if (!appUser || appUser.role !== "user" || !user?.id) {
      setIsWatching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const simCol = await resolveTraineeWatchlistSimulatorColumn(supabase);
      if (cancelled) return;
      let q = supabase
        .from("trainee_user_watchlist")
        .select("id")
        .eq("app_user_id", appUser.id);
      q = q.eq(simCol, user.id);
      const { data } = await q.maybeSingle();
      if (!cancelled) setIsWatching(Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [appUser, user?.id, supabase]);

  const copyUserId = async () => {
    await navigator.clipboard.writeText(user?.id ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      closeDropdown();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [dropdownOpen, closeDropdown]);

  const onToggleWatch = useCallback(async () => {
    if (!appUser?.id || appUser.role !== "user" || !user?.id) return;
    setWatchBusy(true);
    setSubmitError(null);
    try {
      const simCol = await resolveTraineeWatchlistSimulatorColumn(supabase);
      if (isWatching) {
        let dq = supabase.from("trainee_user_watchlist").delete().eq("app_user_id", appUser.id);
        dq = dq.eq(simCol, user.id);
        const { error: delErr } = await dq;
        if (delErr) throw delErr;
        setIsWatching(false);
      } else {
        const row = buildTraineeWatchlistInsertRow(appUser.id, user.id, simCol);
        const { error: insErr } = await supabase.from("trainee_user_watchlist").insert(row);
        if (insErr && (insErr as { code?: string }).code !== "23505") throw insErr;
        setIsWatching(true);
      }
    } catch (e) {
      setSubmitError(formatPostgrestError(e));
    } finally {
      setWatchBusy(false);
    }
  }, [appUser?.id, appUser?.role, isWatching, supabase, user?.id]);

  const onSubmitUserDecision = useCallback(async () => {
    if (!appUser?.id || !pendingDecision || !activeThreadId || !user) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      await submitDecision({
        appUserId: appUser.id,
        alertId: null,
        userId: user.id,
        decision: pendingDecision,
        proposedAlertStatus: proposedStatusForUserDecision(pendingDecision),
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
  }, [activeThreadId, appUser?.id, pendingDecision, rationale, submitDecision, user]);

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (error) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <QueryErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
          hint={
            <p className="text-xs text-rose-800/90">
              Ensure <code className="rounded bg-rose-100 px-1 font-mono">supabase/schema.sql</code> is applied and
              env keys in <code className="rounded bg-rose-100 px-1 font-mono">.env.local</code> are correct.
            </p>
          }
        />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-slate-600">
          User not found. Run <code className="font-mono text-xs">supabase/schema.sql</code> or check the ID.
        </p>
        <Link href="/users" className="text-sm text-[#264B5A] hover:underline">
          Back to Users
        </Link>
      </section>
    );
  }

  const userStatus = accountStatusLabel(accountStatus);
  const tierNum = accountStatus === "not_active" ? "0" : user.tier?.match(/\d+/)?.[0];
  const isTier1 = tierNum === "1";
  const isTier2Or3 = tierNum === "2" || tierNum === "3";
  const isTier0 = tierNum === "0";
  const canOperate = accountStatus !== "closed" && accountStatus !== "not_active";
  const riskLevel = user.risk_level ?? "";
  const tierLabel = `Tier ${tierNum ?? "—"}`;
  const displayName = user.full_name ?? user.email ?? "—";
  const age = ageFromIsoDate(user.date_of_birth);
  const countryLabel = user.country_name ?? "—";
  const threadInvalid = Boolean(threadParam && threadCheckDone && !activeThreadId);

  const riskClass =
    riskLevel === "High"
      ? "text-rose-600"
      : riskLevel === "Medium"
        ? "text-amber-600"
        : riskLevel === "Low"
          ? "text-emerald-600"
          : "text-slate-700";

  const userCards = paymentMethods.filter((m) => m.type?.toLowerCase().includes("card"));
  const userBankAccounts = paymentMethods.filter(
    (m) =>
      !m.type?.toLowerCase().includes("card") &&
      !m.wallet_type &&
      !m.wallet_address &&
      !m.type?.toLowerCase().match(/wallet|crypto/)
  );
  const userCryptoAccounts = paymentMethods.filter(
    (m) =>
      !m.type?.toLowerCase().includes("card") &&
      (!!m.wallet_type || !!m.wallet_address || !!m.type?.toLowerCase().match(/wallet|crypto/))
  );
  const visibleTransactions = isTier0 ? [] : userTransactions;

  // Last Seen = most recent timestamp between latest user event and latest transaction.
  const latestEventTime = userEvents[0]?.event_time ?? null;
  const latestTransactionTime = userTransactions[0]?.transaction_date ?? null;
  const toMs = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : t;
  };
  const latestEventMs = toMs(latestEventTime);
  const latestTxMs = toMs(latestTransactionTime);
  const lastSeenIso =
    latestEventMs == null && latestTxMs == null
      ? null
      : latestEventMs != null && (latestTxMs == null || latestEventMs >= latestTxMs)
        ? latestEventTime
        : latestTransactionTime;

  const uniqueDevices = (() => {
    const byName = new Map<
      string,
      { deviceName: string; lastSeen: string; countryCode: string | null }
    >();
    for (const e of userEvents) {
      const name = e.device_name ?? "Unknown device";
      const existing = byName.get(name);
      const eventTime = e.event_time;
      if (!existing || new Date(eventTime) > new Date(existing.lastSeen)) {
        byName.set(name, {
          deviceName: name,
          lastSeen: eventTime,
          countryCode: e.country_code ?? null,
        });
      }
    }
    return Array.from(byName.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  })();

  const uniqueIps = (() => {
    const byIp = new Map<
      string,
      { ip: string; usageCount: number; lastSeen: string; countryCode: string | null }
    >();
    for (const e of userEvents) {
      if (!e.ip_address) continue;
      const existing = byIp.get(e.ip_address);
      const eventTime = e.event_time;
      if (!existing) {
        byIp.set(e.ip_address, {
          ip: e.ip_address,
          usageCount: 1,
          lastSeen: eventTime,
          countryCode: e.country_code ?? null,
        });
      } else {
        existing.usageCount += 1;
        if (new Date(eventTime) > new Date(existing.lastSeen)) {
          existing.lastSeen = eventTime;
          existing.countryCode = e.country_code ?? null;
        }
      }
    }
    return Array.from(byIp.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .map(({ ip, usageCount, lastSeen, countryCode }) => ({
        ip,
        usageCount,
        lastSeen,
        country: countryCode ?? "—",
      }));
  })();

  const applyPartialBlock = () => {
    if (!canOperate) return;
    setAccountStatus("restricted");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if ((m.status ?? "").toLowerCase() !== "active") return m;
        return { ...m, status: "frozen", restrictedFrozen: true };
      })
    );
  };

  const applyFullBlock = () => {
    if (!canOperate) return;
    setAccountStatus("blocked");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        const st = (m.status ?? "").toLowerCase();
        if (st === "closed") return m;
        return { ...m, status: "blocked", blockedByFullBlock: true };
      })
    );
  };

  const unblockAccount = () => {
    setAccountStatus("active");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        const next = { ...m };
        if (next.restrictedFrozen && (next.status ?? "").toLowerCase() === "frozen") {
          next.status = "active";
          next.restrictedFrozen = false;
        }
        if (next.blockedByFullBlock && (next.status ?? "").toLowerCase() === "blocked") {
          next.status = "active";
          next.blockedByFullBlock = false;
        }
        return next;
      })
    );
  };

  const closeAccount = () => {
    if (!canOperate) return;
    setAccountStatus("closed");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if ((m.status ?? "").toLowerCase() === "closed") return m;
        return { ...m, status: "closed", closedByClosure: true };
      })
    );
  };

  const reactivateAccount = () => {
    setAccountStatus("active");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if (!m.closedByClosure) return m;
        return { ...m, status: "active", closedByClosure: false, blockedByFullBlock: false, restrictedFrozen: false };
      })
    );
  };

  const statusBadgeClass =
    accountStatus === "active"
      ? "bg-emerald-100 text-emerald-800"
      : accountStatus === "blocked" || accountStatus === "closed"
        ? "bg-rose-100 text-rose-800"
        : accountStatus === "restricted"
          ? "bg-amber-100 text-amber-800"
          : accountStatus === "not_active"
            ? "bg-slate-200 text-slate-700"
            : "bg-slate-200 text-slate-700";
  const riskBadgeClass =
    riskLevel === "High"
      ? "bg-rose-100 text-rose-800"
      : riskLevel === "Medium"
        ? "bg-amber-100 text-amber-800"
        : riskLevel === "Low"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-700";

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#264B5A]">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/users" className="hover:text-[#264B5A]">
          Users
        </Link>{" "}
        / <span className="text-slate-700">{displayName}</span>
      </nav>

      {threadInvalid ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This review link is invalid or you do not have access.{" "}
          <Link href={`/users/${user.id}`} className="font-medium text-[#264B5A] underline">
            View canonical profile
          </Link>
        </p>
      ) : null}

      {reviewMode ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <h2 className="heading-section mb-2">Review workspace</h2>
          <p className="mb-3 text-xs text-slate-600">
            Profile review notes and decisions are training-only and do not change simulator user records.
          </p>
          {decisionsLoading ? (
            <p className="text-xs text-slate-500">Loading decisions…</p>
          ) : decisions.length > 0 ? (
            <ul className="mb-4 space-y-2 text-sm">
              {decisions.map((d) => (
                <li key={d.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="tabular-nums">{formatDateTime(d.created_at)}</span>
                    {d.proposed_alert_status ? <span>Proposed: {d.proposed_alert_status}</span> : null}
                  </div>
                  <p className="mb-1">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${traineeDecisionBadgeClass(d.decision)}`}
                    >
                      {getTraineeDecisionLabel(d.decision)}
                    </span>
                  </p>
                  {d.rationale ? <p className="whitespace-pre-wrap text-slate-700">{d.rationale}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-xs text-slate-500">No decisions in this thread yet.</p>
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
                    onClick={() => setPendingDecision(key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      pendingDecision === key
                        ? "border-slate-500 bg-slate-100 text-slate-900"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!pendingDecision || submitBusy}
                onClick={() => void onSubmitUserDecision()}
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
              privateAlertInternalId={null}
              privateSimulatorUserId={user.id}
              predefinedNotes={predefinedNotes.map((n) => ({
                id: n.id,
                note_text: n.note_text,
                created_at: n.created_at,
                created_by: n.created_by,
              }))}
              title="Canonical notes & training thread"
              showTitle
              withTopBorder={false}
              emptyMessage="No thread messages yet."
              adminModeOverride={appUser?.role === "admin" ? "reply" : undefined}
            />
          </div>
        </div>
      ) : null}

      <div
        className={`flex min-w-0 flex-row items-start gap-4 overflow-hidden rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 px-4 py-3 shadow-sm sm:overflow-visible sm:p-5 ${
          appUser?.role === "user" ? "" : "sm:items-center"
        }`}
      >
        <div className="shrink-0 sm:self-center">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-300 bg-slate-200 shadow-sm sm:h-[7.5rem] sm:w-[7.5rem]">
          {selfieUrl && !selfieLoadFailed ? (
            <img
              src={selfieUrl}
              alt=""
              role="presentation"
              onError={() => setSelfieLoadFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src="/user-maya-chen-placeholder.svg"
              alt={`${displayName} profile photo`}
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden sm:px-0">
            <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">{displayName}</p>
            <button
              type="button"
              onClick={copyUserId}
              className="group -mt-0.5 flex min-w-0 max-w-full items-center gap-1 overflow-hidden text-left font-mono text-xs text-slate-500 hover:text-slate-700"
              title="Copy ID"
            >
              <span className="block min-w-0 break-all sm:max-w-[14rem] sm:truncate sm:break-normal lg:max-w-none lg:overflow-visible lg:whitespace-normal">{user.id}</span>
              <span className={copied ? "text-emerald-600" : "opacity-0 transition group-hover:opacity-100"}>
                {copied ? "✓" : "📋"}
              </span>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass}`}>
                {userStatus}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                {tierLabel}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${riskBadgeClass}`}>
                {riskLevel ? `${riskLevel} Risk` : "—"}
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {countryLabel}
              </span>
              <div className="flex shrink-0 gap-x-3 sm:hidden">
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Balance</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                    {formatMoneyUsd(
                      isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.current_balance ?? user.current_balance_usd ?? 0))
                    )}
                  </p>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Turnover</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                    {formatMoneyUsd(
                      isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.total_turnover ?? user.total_turnover_usd ?? 0))
                    )}
                  </p>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Last Seen</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                    {formatDate(lastSeenIso)}
                  </p>
                </div>
              </div>
              {appUser?.role !== "user" ? (
                <div className="flex w-full basis-full shrink-0 flex-wrap items-center gap-1.5 sm:hidden">
                  <SimulatorAccountActionButtons
                    accountStatus={accountStatus}
                    canOperate={canOperate}
                    onReactivateAccount={reactivateAccount}
                    onUnblockAccount={unblockAccount}
                    onApplyPartialBlock={applyPartialBlock}
                    onApplyFullBlock={applyFullBlock}
                    onCloseAccount={closeAccount}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-3 hidden min-w-0 flex-col gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="mx-auto w-fit max-w-full sm:mx-0">
                <div className="grid grid-cols-3 gap-x-6 gap-y-0.5">
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Balance</p>
                    <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                      {formatMoneyUsd(
                        isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.current_balance ?? user.current_balance_usd ?? 0))
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Turnover</p>
                    <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                      {formatMoneyUsd(
                        isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.total_turnover ?? user.total_turnover_usd ?? 0))
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Last Seen</p>
                    <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                      {formatDate(lastSeenIso)}
                    </p>
                  </div>
                </div>
              </div>
              {appUser?.role !== "user" ? (
                <div className="flex min-w-0 shrink-0 flex-wrap items-end justify-end gap-1.5">
                  <SimulatorAccountActionButtons
                    accountStatus={accountStatus}
                    canOperate={canOperate}
                    onReactivateAccount={reactivateAccount}
                    onUnblockAccount={unblockAccount}
                    onApplyPartialBlock={applyPartialBlock}
                    onApplyFullBlock={applyFullBlock}
                    onCloseAccount={closeAccount}
                  />
                </div>
              ) : null}
            </div>
          </div>
        {appUser?.role === "user" ? (
          <div className="flex w-[min(100%,12.5rem)] shrink-0 flex-col items-end justify-between gap-2 self-stretch sm:w-auto sm:max-w-[min(100%,20rem)]">
            {!reviewMode ? (
              <button
                type="button"
                disabled={watchBusy}
                onClick={() => void onToggleWatch()}
                className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {watchBusy ? "…" : isWatching ? "Unwatch" : "Watch user"}
              </button>
            ) : (
              <Link
                href={`/users/${user.id}`}
                className="max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-[10px] font-medium leading-snug text-slate-700 shadow-sm hover:bg-slate-50 sm:max-w-[12rem] sm:px-2.5 sm:text-[11px]"
              >
                Back to canonical view
              </Link>
            )}
            <SimulatorAccountActionButtons
              accountStatus={accountStatus}
              canOperate={canOperate}
              onReactivateAccount={reactivateAccount}
              onUnblockAccount={unblockAccount}
              onApplyPartialBlock={applyPartialBlock}
              onApplyFullBlock={applyFullBlock}
              onCloseAccount={closeAccount}
              className="flex w-full flex-wrap items-center justify-end gap-1.5"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <aside className="min-w-0 shrink-0 space-y-4 lg:w-[320px] lg:min-w-[320px] xl:w-[340px] xl:min-w-[340px]">
          <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
            <h2 className="heading-section">
              Contact &amp; Details
            </h2>
            <div className="mt-3 flex min-w-0 flex-col gap-2 text-sm text-slate-700">
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Registration date:</span> {user.registration_date ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Email:</span> {user.email}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Phone:</span> {user.phone ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Date of birth:</span> {user.date_of_birth ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Age:</span> {age ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Nationality:</span> {user.nationality ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Address:</span> {user.address_text ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
            <h2 className="heading-section">
              Documents
            </h2>
            <ul className="mt-3 flex min-w-0 flex-col gap-2.5 text-sm text-slate-700">
              <li className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Proof of Identity:</span> {user.proof_of_identity ?? "—"}</li>
              <li className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm"><span className="font-medium">Proof of Address:</span> {user.proof_of_address ?? "—"}</li>
                <li className="min-w-0 w-full break-words whitespace-normal rounded-lg bg-white px-3 py-2 shadow-sm">
                  <span className="font-medium">Source of funds:</span>{" "}
                  {user.source_of_funds_docs && user.source_of_funds_docs.trim().length > 0 ? (
                    user.source_of_funds_docs
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      N/A
                    </span>
                  )}
                </li>
            </ul>
          </div>

        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="overflow-visible rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:overflow-hidden">
            <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 px-2 py-3 sm:px-4 sm:py-3">
              <label id="profile-section-label" className="sr-only">
                Profile section
              </label>
              <div ref={dropdownRef} className="relative sm:hidden">
                <button
                  type="button"
                  id="profile-section"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-labelledby="profile-section-label"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex w-full min-h-10 items-center justify-between rounded-lg bg-[#244651] px-4 py-2.5 text-left text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100"
                >
                  {PROFILE_TABS.find((t) => t.key === activeTab)?.label ?? "Transactions"}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-white/90 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <ul
                    role="listbox"
                    aria-labelledby="profile-section-label"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[min(16rem,60vh)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg [-webkit-overflow-scrolling:touch]"
                  >
                    {PROFILE_TABS.map((tab) => (
                      <li key={tab.key} role="option" aria-selected={activeTab === tab.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.key);
                            setDropdownOpen(false);
                          }}
                          className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                            activeTab === tab.key
                              ? "bg-[#264B5A] text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {PROFILE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`min-w-0 rounded-xl px-3 py-2.5 text-center text-xs font-medium transition-all ${
                        activeTab === tab.key
                          ? "bg-[#264B5A] text-white shadow-md shadow-[#264B5A]/25 ring-1 ring-slate-900/10"
                          : "border border-slate-200/80 bg-white/90 text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <span className="block truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-white to-slate-50/80">
          {activeTab === "overview" && (
            <div className="p-4">
              {isTier1 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  SOF questionnaire not required for this tier.
                </p>
              ) : isTier2Or3 ? (
                <div className="grid gap-2.5 text-sm text-slate-700 md:grid-cols-2">
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Occupation:</span> {user.occupation ?? "—"}
                  </p>
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Employment:</span> {user.employment_status ?? "—"}
                  </p>
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Annual income:</span>{" "}
                    {user.annual_income_min_usd != null || user.annual_income_max_usd != null
                      ? [user.annual_income_min_usd, user.annual_income_max_usd]
                          .filter((n): n is number => n != null)
                          .map((n) => n.toLocaleString("en-US"))
                          .join(" – ") + " USD"
                      : "—"}
                  </p>
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Primary source of funds:</span>{" "}
                    {user.primary_source_of_funds ?? user.source_of_funds_docs ?? "—"}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  SOF questionnaire not required for this tier.
                </p>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="min-w-0">
              {!txError && visibleTransactions.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No transactions.
                  </div>
                </div>
              ) : (
                <>
              <TableSwipeHint />
              <div className="scroll-x-touch w-full min-w-0 overflow-x-auto xl:overflow-x-visible">
              <table className="w-full min-w-[600px] table-fixed border-collapse text-[11px] sm:text-xs">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[28%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#264B5A] backdrop-blur-sm sm:text-[11px]">
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Date</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Direction</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Type</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Channel</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Counterparty</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Status</th>
                    <th className={`px-1.5 sm:px-2 text-right tabular-nums ${TABLE_PY_INNER} whitespace-nowrap`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txError ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-rose-600">
                        {txError}
                      </td>
                    </tr>
                  ) : (
                    visibleTransactions.map((tx, idx) => {
                      const direction = tx.direction ?? "—";
                      const directionLower = direction.toLowerCase();
                      const inbound = directionLower === "inbound";
                      const outbound = directionLower === "outbound";
                      const directionLabel = inbound ? "IN" : outbound ? "OUT" : direction;
                      const directionClass = inbound
                        ? "font-medium text-emerald-700"
                        : outbound
                          ? "font-medium text-rose-600"
                          : "text-slate-800";
                      const amountClass = inbound
                        ? "font-medium text-emerald-600"
                        : outbound
                          ? "font-medium text-rose-600"
                          : "font-medium text-slate-800";

                      const channelRaw = tx.channel ?? "";
                      const channelUpper = channelRaw.toUpperCase();
                      let channelLabel = "—";
                      let channelBadgeClass = "bg-slate-50 text-slate-600 ring-slate-200";
                      if (channelUpper.includes("SEPA")) {
                        channelLabel = "SEPA";
                        channelBadgeClass = "bg-sky-50 text-sky-700 ring-sky-200";
                      } else if (channelUpper.includes("EPOS")) {
                        channelLabel = "ePOS";
                        channelBadgeClass = "bg-amber-50 text-amber-800 ring-amber-200";
                      } else if (channelUpper.includes("POS")) {
                        channelLabel = "POS";
                        channelBadgeClass = "bg-slate-100 text-slate-700 ring-slate-200";
                      } else if (channelRaw.trim().length > 0) {
                        channelLabel = channelRaw;
                      }
                      const txStatus = transactionStatusBadge(tx.status);
                      return (
                        <tr
                          key={tx.id}
                          className={`border-b border-slate-200 text-slate-800 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                            idx % 2 === 1 ? "bg-slate-50/60" : ""
                          }`}
                        >
                          <td className={`px-1.5 tabular-nums sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            {formatDate(tx.transaction_date)}
                          </td>
                          <td className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            <span className={directionClass}>{directionLabel}</span>
                          </td>
                          <td
                            className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} overflow-hidden text-ellipsis whitespace-nowrap`}
                            title={tx.type ?? undefined}
                          >
                            {tx.type ?? "—"}
                          </td>
                          <td className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            <span
                              className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 sm:text-[10px] ${channelBadgeClass}`}
                            >
                              {channelLabel}
                            </span>
                          </td>
                          <td
                            className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} overflow-hidden text-ellipsis whitespace-nowrap`}
                            title={tx.counterparty_name ?? undefined}
                          >
                            {tx.counterparty_name ?? "—"}
                          </td>
                          <td className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            <span
                              className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ring-1 sm:text-[10px] ${txStatus.className}`}
                            >
                              {txStatus.label}
                            </span>
                          </td>
                          <td
                            className={`px-1.5 text-right tabular-nums sm:px-2 ${amountClass} ${TABLE_PY_INNER} whitespace-nowrap`}
                          >
                            {formatTransactionAmount(tx.amount, tx.currency, tx.direction)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Cards
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {isTier0 || userCards.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No cards.
                    </li>
                  ) : (
                    userCards.map((card) => (
                      <li
                        key={card.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {card.card_network ?? card.type ?? "Card"}
                          </p>
                          <PaymentMethodStatusBadge status={card.status} />
                        </div>
                        <p className="font-mono text-xs tracking-tight text-slate-600">
                          {card.masked_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Bank Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {isTier0 || userBankAccounts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No bank accounts.
                    </li>
                  ) : (
                    userBankAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {acc.bank_type ?? acc.type ?? "Account"}
                          </p>
                          <PaymentMethodStatusBadge status={acc.status} />
                        </div>
                        <p className="font-mono text-xs tracking-tight text-slate-600">
                          {acc.account_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Crypto Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {isTier0 || userCryptoAccounts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No crypto accounts.
                    </li>
                  ) : (
                    userCryptoAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {acc.wallet_type ?? acc.type ?? "Wallet"}
                          </p>
                          <PaymentMethodStatusBadge status={acc.status} />
                        </div>
                        <p className="break-all font-mono text-[11px] leading-relaxed text-slate-600">
                          {acc.wallet_address ?? acc.account_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "network" && (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Devices
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {uniqueDevices.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No devices.
                    </li>
                  ) : (
                    uniqueDevices.map((d, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-800">{d.deviceName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {d.countryCode ?? "—"} • {formatDate(d.lastSeen)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  IP Addresses
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {uniqueIps.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No IP addresses.
                    </li>
                  ) : (
                    uniqueIps.map(({ ip, usageCount, lastSeen, country }, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                      >
                        <p className="font-mono text-sm font-medium text-slate-800">{maskIp(ip)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {country} • {usageCount} events • {formatDate(lastSeen)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Linked Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {linkedAccounts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No linked accounts.
                    </li>
                  ) : (
                    linkedAccounts.map(({ userId, deviceName }) => (
                      <li
                        key={userId}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          <Link
                            href={`/users/${userId}`}
                            className="font-mono text-[#264B5A] hover:underline"
                          >
                            {userId}
                          </Link>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Shared device: {deviceName}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="overflow-hidden">
              {userEvents.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No activity.
                  </div>
                </div>
              ) : (
                <>
              <div className="px-2 sm:px-0">
                <TableSwipeHint />
              </div>
              <div className="scroll-x-touch">
              <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#264B5A] backdrop-blur-sm">
                    <th className={`w-[165px] shrink-0 px-4 ${TABLE_PY_INNER}`}>Date & Time</th>
                    <th className={`min-w-0 px-4 text-center ${TABLE_PY_INNER}`}>Event</th>
                    <th className={`w-[110px] px-4 ${TABLE_PY_INNER}`}>IP</th>
                    <th className={`w-[80px] px-4 ${TABLE_PY_INNER}`}>Country</th>
                    <th className={`w-[120px] px-4 ${TABLE_PY_INNER}`}>Device</th>
                  </tr>
                </thead>
                <tbody>
                    {userEvents.map((evt, idx) => (
                      <tr
                        key={evt.id}
                        className={`border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                          idx % 2 === 1 ? "bg-slate-50/60" : ""
                        }`}
                      >
                        <td className={`whitespace-nowrap px-4 tabular-nums ${TABLE_PY_INNER}`}>
                          {formatDateTime(evt.event_time)}
                        </td>
                        <td className={`px-4 text-center ${TABLE_PY_INNER}`}>{formatEventType(evt.event_type)}</td>
                        <td className={`px-4 font-mono text-xs ${TABLE_PY_INNER}`}>{maskIp(evt.ip_address)}</td>
                        <td className={`px-4 ${TABLE_PY_INNER}`}>{evt.country_code ?? "—"}</td>
                        <td className={`px-4 ${TABLE_PY_INNER}`}>{evt.device_name ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "opslog" && (
            <div className="p-4">
              {opsEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  No operations logged.
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5 text-sm text-slate-700">
                  {opsEvents.map((op) => (
                    <li
                      key={op.id}
                      className="flex w-full flex-col gap-0.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {getOpsEventLabel(op.action_type)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDateTime(op.event_time)}
                        {op.performed_by ? ` · ${op.performed_by}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="w-full min-w-0">
              {userAlerts.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No linked alerts.
                  </div>
                </div>
              ) : (
                <>
              <TableSwipeHint />
              <div className="scroll-x-touch w-full min-w-0">
              <table className="w-full min-w-[680px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="min-w-[140px] w-[42%]" />
                </colgroup>
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#264B5A] backdrop-blur-sm">
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Alert ID</th>
                    <th className={`whitespace-nowrap px-3 text-right tabular-nums ${TABLE_PY_INNER}`}>Created</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Type</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Severity</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Status</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {userAlerts.map((a, idx) => (
                    <tr
                      key={a.id}
                      className={`border-b border-slate-200 text-slate-800 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                        idx % 2 === 1 ? "bg-slate-50/60" : ""
                      }`}
                    >
                      <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                        <Link
                          href={`/alerts/${a.id}`}
                          className="font-mono text-xs text-[#264B5A] hover:underline"
                        >
                          {a.id}
                        </Link>
                      </td>
                      <td className={`whitespace-nowrap px-3 text-right text-slate-600 tabular-nums ${TABLE_PY_INNER}`}>
                        {formatDate(a.created_at)}
                      </td>
                      <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${linkedAlertTypeBadgeClass(getAlertType(a))}`}>
                          {getAlertType(a) ? normalizeStr(getAlertType(a)).toUpperCase() : "—"}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${linkedAlertSeverityBadgeClass(a.severity)}`}>
                          {toTitleCase(a.severity)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${linkedAlertStatusBadgeClass(a.status)}`}>
                          {toTitleCase(a.status)}
                        </span>
                      </td>
                      <td className={`min-w-0 px-3 ${TABLE_PY_INNER} whitespace-normal break-words`} title={getAlertDescription(a)}>
                        {getAlertDescription(a)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4 p-4">
              {user?.id ? (
                <>
                  {internalNotesLoadError ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Could not load internal notes: {internalNotesLoadError}. In Supabase, ensure{" "}
                      <span className="font-mono">internal_notes</span> allows <span className="font-mono">select</span> for{" "}
                      <span className="font-mono">authenticated</span> (see <span className="font-mono">supabase/schema.sql</span>
                      ).
                    </p>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-slate-100/80 p-4 shadow-sm">
                    {appUser?.role === "admin" ? (
                      <>
                        <SimulatorCommentsPanel
                          privateSimulatorUserId={user.id}
                          privateAlertInternalId={null}
                          adminModeOverride="private"
                          showTitle={false}
                          withTopBorder={false}
                          emptyMessage="No notes yet."
                        />
                        <div className="my-4 border-t border-slate-200" />
                      </>
                    ) : null}
                    {notesTabThreadError ? <p className="mb-2 text-sm text-rose-600">{notesTabThreadError}</p> : null}
                    <SimulatorCommentsPanel
                      threadId={activeThreadId ?? notesTabThreadId}
                      reviewMode
                      privateAlertInternalId={null}
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
                      emptyMessage="No notes in this workspace yet."
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
