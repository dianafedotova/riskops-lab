"use client";

import {
  ageFromIsoDate,
  formatDate,
  formatDateTime,
  formatEventType,
  formatMoneyUsd,
  formatTransactionAmount,
  formatTransactionAmountUsd,
  isUnsuccessfulTransactionStatus,
  maskIp,
} from "@/lib/format";
import { InternalNoteForm } from "@/components/internal-note-form";
import { ModalShell } from "@/components/modal-shell";
import { ObjectNotePanel } from "@/components/object-note-panel";
import { ReviewThreadInternalNotePanel } from "@/components/review-thread-internal-note-panel";
import { ReviewSubmissionsPanel } from "@/components/review-submissions-panel";
import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import { TransactionDetailsPanel } from "@/components/transaction-details-panel";
import { SimulatorPaymentMethodForm } from "@/components/simulator-payment-method-form";
import { TransactionActionsMenu } from "@/components/transaction-actions-menu";
import { SimulatorTransactionForm } from "@/components/simulator-transaction-form";
import { SimulatorUserSelfieUploader } from "@/components/simulator-user-selfie-uploader";
import { SimulatorUserForm } from "@/components/simulator-user-form";
import { SimulatorUserEventForm } from "@/components/simulator-user-event-form";
import { UserAccountLinkForm } from "@/components/user-account-link-form";
import { FilterSelect } from "@/components/filter-select";
import { markFirstCaseOpened, trackTraineeEvent } from "@/lib/amplitude";
import { useReviewSubmissions } from "@/lib/hooks/use-review-submissions";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { fetchReviewThreadIdForProfile } from "@/lib/review/fetch-review-thread-id";
import { listUserAccountLinksForUser } from "@/lib/services/user-account-links";
import { listReviewSubmissionsDirect } from "@/lib/services/review-submissions";
import { createProfileReviewThreadForContext, fetchProfileReviewThreadById } from "@/lib/services/review-threads";
import { reorderSimulatorTransactions } from "@/lib/services/simulator-transactions";
import { createClient } from "@/lib/supabase";
import type {
  AlertRow,
  InternalNoteRow,
  PaymentMethodRow,
  ReviewSubmissionRow,
  ReviewThreadRow,
  TraineeDecisionRow,
  TransactionRow,
  UserAccountLinkRow,
  UserEventRow,
  UserFinancialsRow,
  UserRow,
} from "@/lib/types";
import Link from "next/link";
import { QueryErrorBanner } from "@/components/query-error";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { UserProfileSkeleton } from "@/components/user-profile-skeleton";
import { listInternalNotesForSimulatorUser } from "@/lib/services/internal-notes";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import {
  formatMaskedCardReference,
  getTransactionChronologyConflictIds,
  getTransactionDescriptionFromRow,
} from "@/lib/transactions";
import { normalizeFinancialsRow } from "@/lib/user-financials";
import {
  addSimulatorUserToWatchlist,
  isSimulatorUserWatchedByTrainee,
  removeSimulatorUserFromWatchlist,
} from "@/lib/services/watchlist";
import {
  displayStatusFromTraineeDecisionOnAlert,
  listLatestTraineeDecisionsForAlertsByActor,
} from "@/lib/services/trainee-decisions";
import {
  getTraineeUserStatusOverride,
  upsertTraineeUserStatusOverride,
} from "@/lib/services/trainee-user-status-overrides";
import { formatPostgrestError } from "@/shared/lib/postgrest";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TabKey =
  | "overview"
  | "transactions"
  | "accounts"
  | "network"
  | "activity"
  | "alerts"
  | "notes";

type AccountStatus = "active" | "not_active" | "restricted" | "blocked" | "closed";
type CrudEditorState<T, M extends string = "create" | "edit"> = { mode: M; value: T | null };

const PROFILE_TABS: { key: TabKey; label: string; desktopLabel?: string; compactDesktopLabel?: string }[] = [
  { key: "transactions", label: "Transactions", desktopLabel: "Transactions", compactDesktopLabel: "Txns" },
  { key: "accounts", label: "Accounts", desktopLabel: "Accounts" },
  { key: "network", label: "Access & Links", desktopLabel: "Access & Links" },
  { key: "activity", label: "User Activity", desktopLabel: "Activity" },
  { key: "overview", label: "SOF Questionnaire", desktopLabel: "SOF" },
  { key: "alerts", label: "Linked Alerts", desktopLabel: "Alerts" },
  { key: "notes", label: "Notes", desktopLabel: "Notes" },
];

const TRANSACTION_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type UiPaymentMethod = PaymentMethodRow & {
  closedByClosure?: boolean;
  restrictedFrozen?: boolean;
  blockedByFullBlock?: boolean;
};

type LinkedDeviceOption = {
  value: string;
  label: string;
  deviceName: string;
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

function accountHeroToneClass(status: AccountStatus): string {
  switch (status) {
    case "active":
      return "border-[rgb(199_223_220_/_0.9)] bg-[linear-gradient(135deg,rgba(248,251,252,0.98)_0%,rgba(245,251,251,0.98)_55%,rgba(232,245,243,0.98)_100%)]";
    case "restricted":
      return "border-[rgb(232_213_175_/_0.9)] bg-[linear-gradient(135deg,rgba(248,251,252,0.985)_0%,rgba(250,249,245,0.985)_72%,rgba(246,241,225,0.985)_100%)]";
    case "blocked":
      return "border-[rgb(209_186_191_/_0.9)] bg-[linear-gradient(135deg,rgba(248,251,252,0.985)_0%,rgba(249,247,248,0.985)_72%,rgba(243,236,238,0.985)_100%)]";
    case "closed":
      return "border-[rgb(203_210_220_/_0.95)] bg-[linear-gradient(135deg,rgba(249,250,252,0.985)_0%,rgba(245,247,250,0.985)_72%,rgba(235,239,244,0.985)_100%)]";
    default:
      return "";
  }
}

function toTitleCase(v: string | null | undefined): string {
  const raw = (v ?? "").trim();
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

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
  if (!s) return "ui-badge-neutral";
  if (s === "aml") return "ui-badge-indigo";
  return "ui-badge-blue";
};
const linkedAlertSeverityBadgeClass = (severity: string | null) => {
  const s = normalizeStr(severity);
  if (s === "critical") return "ui-badge-rose";
  if (s === "high") return "ui-badge-rose";
  if (s === "medium") return "ui-badge-amber";
  if (s === "low") return "ui-badge-emerald";
  return "ui-badge-neutral";
};
const linkedAlertStatusBadgeClass = (status: string | null) => {
  const s = normalizeStr(status);
  if (s === "open") return "ui-badge-blue";
  if (s === "monitoring") return "ui-badge-amber";
  if (s === "escalated") return "ui-badge-violet";
  if (s === "closed") return "ui-badge-emerald";
  if (s === "in_review" || s === "in review") return "ui-badge-teal";
  if (s === "resolved") return "ui-badge-neutral";
  return "ui-badge-neutral";
};

function transactionStatusBadge(status: string | null): { label: string; className: string } {
  const raw = (status ?? "").trim();
  if (!raw) {
    return {
      label: "—",
      className: "ui-badge-neutral",
    };
  }
  const label = raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s === "completed" || s === "complete" || s === "success" || s === "settled" || s === "posted") {
    return { label, className: "ui-badge-emerald" };
  }
  if (
    s.includes("reject") ||
    s === "failed" ||
    s.includes("declin") ||
    s === "cancelled" ||
    s === "canceled" ||
    s.includes("revers")
  ) {
    return { label, className: "ui-badge-rose" };
  }
  if (
    s.includes("pending") ||
    s.includes("accept") ||
    s.includes("processing") ||
    s.includes("review") ||
    s.includes("hold") ||
    s.includes("authori")
  ) {
    return { label, className: "ui-badge-amber" };
  }
  return { label, className: "ui-badge-neutral" };
}

function transactionChannelBadge(channel: string | null): { label: string; className: string } {
  const channelRaw = channel ?? "";
  const channelUpper = channelRaw.toUpperCase();
  if (channelUpper.includes("SEPA")) return { label: "SEPA", className: "ui-badge-blue" };
  if (channelUpper.includes("SWIFT")) return { label: "SWIFT", className: "ui-badge-blue" };
  if (channelUpper.includes("FPS")) return { label: "FPS", className: "ui-badge-blue" };
  if (channelUpper.includes("EPOS")) return { label: "ePOS", className: "ui-badge-amber" };
  if (channelUpper.includes("REFUND")) return { label: "Refund", className: "ui-badge-amber" };
  if (channelUpper.includes("POS")) return { label: "POS", className: "ui-badge-neutral" };
  if (channelUpper.includes("P2P")) return { label: "P2P", className: "ui-badge-teal" };
  if (channelUpper.includes("CRYPTO")) return { label: "CRYPTO", className: "ui-badge-violet" };
  if (channelUpper.includes("C2C")) return { label: "C2C", className: "ui-badge-neutral" };
  if (channelUpper.includes("ATM")) return { label: "ATM", className: "ui-badge-neutral" };
  if (channelRaw.trim().length > 0) return { label: channelRaw, className: "ui-badge-neutral" };
  return { label: "—", className: "ui-badge-neutral" };
}

function duplicatedTransactionSeed(transaction: TransactionRow): TransactionRow {
  return {
    ...transaction,
    id: "",
    external_id: null,
    sort_order: null,
    created_at: null,
    updated_at: null,
  };
}

function duplicatedUserEventSeed(userEvent: UserEventRow): UserEventRow {
  return {
    ...userEvent,
    id: "",
    created_at: new Date().toISOString(),
  };
}

function moveTransactionRow(
  transactions: TransactionRow[],
  draggedTransactionId: string,
  targetTransactionId: string
): TransactionRow[] {
  const fromIndex = transactions.findIndex((transaction) => transaction.id === draggedTransactionId);
  const toIndex = transactions.findIndex((transaction) => transaction.id === targetTransactionId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return transactions;

  const nextTransactions = [...transactions];
  const [movedTransaction] = nextTransactions.splice(fromIndex, 1);
  nextTransactions.splice(toIndex, 0, movedTransaction);
  return nextTransactions.map((transaction, index) => ({ ...transaction, sort_order: index + 1 }));
}

function PaymentMethodStatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "—").toLowerCase();
  const styles =
    s === "active"
      ? "ui-badge-emerald"
      : s === "frozen"
        ? "ui-badge-amber"
        : s === "blocked"
          ? "ui-badge-rose"
          : s === "closed"
            ? "ui-badge-neutral"
            : "ui-badge-neutral";
  return (
    <span
      className={`ui-badge shrink-0 text-[11px] font-semibold capitalize ${styles}`}
    >
      {status ?? "—"}
    </span>
  );
}

const simulatorStaticFieldClass =
  "min-w-0 w-full break-words whitespace-normal rounded-[0.65rem] border border-slate-300/95 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(251,253,255,1))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_1px_2px_rgba(15,23,42,0.06)]";

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
          className="ui-btn min-h-0 rounded-[0.9rem] border border-[var(--brand-400)] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[var(--brand-700)] shadow-none hover:border-[var(--brand-400)] hover:bg-[var(--brand-400)] hover:text-white"
        >
          Reactivate Account
        </button>
      ) : accountStatus === "restricted" ? (
        <>
          <button
            type="button"
            onClick={onUnblockAccount}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-[var(--brand-400)] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[var(--brand-700)] shadow-none hover:border-[var(--brand-400)] hover:bg-[var(--brand-400)] hover:text-white"
          >
            Unblock
          </button>
          <button
            type="button"
            onClick={onApplyFullBlock}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-[var(--brand-dot)] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[var(--brand-dot)] shadow-none hover:bg-[var(--brand-dot)] hover:text-white"
          >
            Full Block
          </button>
          <button
            type="button"
            onClick={onCloseAccount}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-slate-400 bg-white px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-none hover:border-slate-600 hover:bg-slate-600 hover:text-white"
          >
            Account Closure
          </button>
        </>
      ) : accountStatus === "blocked" ? (
        <>
          <button
            type="button"
            onClick={onUnblockAccount}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-[var(--brand-400)] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[var(--brand-700)] shadow-none hover:border-[var(--brand-400)] hover:bg-[var(--brand-400)] hover:text-white"
          >
            Unblock
          </button>
          <button
            type="button"
            onClick={onCloseAccount}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-slate-400 bg-white px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-none hover:border-slate-600 hover:bg-slate-600 hover:text-white"
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
            className="ui-btn min-h-0 rounded-[0.9rem] border border-amber-300 bg-white px-3.5 py-1.5 text-[11px] font-medium text-[var(--warning-600)] shadow-none enabled:hover:border-[var(--warning-600)] enabled:hover:bg-[var(--warning-600)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Partial Block
          </button>
          <button
            type="button"
            onClick={onApplyFullBlock}
            disabled={!canOperate}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-[var(--brand-dot)] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[var(--brand-dot)] shadow-none enabled:hover:bg-[var(--brand-dot)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Full Block
          </button>
          <button
            type="button"
            onClick={onCloseAccount}
            disabled={!canOperate}
            className="ui-btn min-h-0 rounded-[0.9rem] border border-slate-400 bg-white px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-none enabled:hover:border-slate-600 enabled:hover:bg-slate-600 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Account Closure
          </button>
        </>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  const { appUser, hasStaffAccess, isTraineeActor } = useReviewWorkspaceActor();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reviewThreadFromUrl = searchParams.get("reviewThread");
  const userId = params?.id ?? "";
  const [activeTab, setActiveTab] = useState<TabKey>("transactions");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [predefinedNotes, setPredefinedNotes] = useState<InternalNoteRow[]>([]);

  const [user, setUser] = useState<UserRow | null>(null);
  const [userAlerts, setUserAlerts] = useState<AlertRow[]>([]);
  const [userEvents, setUserEvents] = useState<UserEventRow[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<UserAccountLinkRow[]>([]);
  const [linkedDeviceOptions, setLinkedDeviceOptions] = useState<LinkedDeviceOption[]>([]);
  const [userTransactions, setUserTransactions] = useState<TransactionRow[]>([]);
  const [financials, setFinancials] = useState<UserFinancialsRow | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<UiPaymentMethod[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [txError, setTxError] = useState<string | null>(null);
  const [transactionOrderError, setTransactionOrderError] = useState<string | null>(null);
  const [draggedTransactionId, setDraggedTransactionId] = useState<string | null>(null);
  const [dropTargetTransactionId, setDropTargetTransactionId] = useState<string | null>(null);
  const [transactionOrderSaving, setTransactionOrderSaving] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = useState<number>(10);
  const [linkedAccountsLoadError, setLinkedAccountsLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [userEditorOpen, setUserEditorOpen] = useState(false);
  const [userEditorMessage, setUserEditorMessage] = useState<string | null>(null);
  const [userEditorMessageVisible, setUserEditorMessageVisible] = useState(false);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [transactionEditor, setTransactionEditor] = useState<
    CrudEditorState<TransactionRow, "create" | "edit" | "duplicate"> | null
  >(null);
  const [paymentMethodEditor, setPaymentMethodEditor] = useState<CrudEditorState<PaymentMethodRow> | null>(null);
  const [userEventEditor, setUserEventEditor] = useState<CrudEditorState<UserEventRow> | null>(null);
  const [accountLinkEditor, setAccountLinkEditor] = useState<CrudEditorState<UserAccountLinkRow> | null>(null);
  const [internalNoteEditor, setInternalNoteEditor] = useState<CrudEditorState<InternalNoteRow> | null>(null);

  const [isWatching, setIsWatching] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [statusDraftError, setStatusDraftError] = useState<string | null>(null);
  const [latestTraineeDecisionByAlertId, setLatestTraineeDecisionByAlertId] = useState<
    Record<string, TraineeDecisionRow>
  >({});
  const [linkedAlertDecisionFetchError, setLinkedAlertDecisionFetchError] = useState<string | null>(null);
  const trackedProfileOpenRef = useRef<string | null>(null);

  const [notesTabThreadId, setNotesTabThreadId] = useState<string | null>(null);
  const [notesTabThreadError, setNotesTabThreadError] = useState<string | null>(null);
  const [activeProfileReviewThread, setActiveProfileReviewThread] = useState<{
    id: string;
    app_user_id: string;
    user_id: string | null;
    context_type: string | null;
    created_at: string;
  } | null>(null);
  const [reviewThreads, setReviewThreads] = useState<ReviewThreadRow[]>([]);
  const [reviewThreadsSubmissions, setReviewThreadsSubmissions] = useState<ReviewSubmissionRow[]>([]);
  const [reviewThreadsWithRootNotes, setReviewThreadsWithRootNotes] = useState<string[]>([]);
  const [reviewThreadsReloadTick, setReviewThreadsReloadTick] = useState(0);
  const [draftsExpanded, setDraftsExpanded] = useState(false);
  const [submittedExpanded, setSubmittedExpanded] = useState(false);
  const [internalNotesLoadError, setInternalNotesLoadError] = useState<string | null>(null);

  const staffSubmissionsThreadId = hasStaffAccess && !isTraineeActor ? notesTabThreadId : null;
  const { submissions: staffReviewSubmissions } = useReviewSubmissions(staffSubmissionsThreadId);
  const isStaffReviewMode = hasStaffAccess && !isTraineeActor && Boolean(reviewThreadFromUrl);
  const latestStaffSubmission = useMemo(() => {
    if (!staffReviewSubmissions.length) return null;
    return staffReviewSubmissions.reduce<ReviewSubmissionRow | null>((latest, submission) => {
      if (!latest) return submission;
      if (submission.submission_version > latest.submission_version) return submission;
      return latest;
    }, null);
  }, [staffReviewSubmissions]);

  useEffect(() => {
    if (!user?.selfie_path) {
      setSelfieUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
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
  }, [user?.selfie_path]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
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
        setLinkedDeviceOptions([]);
        setPredefinedNotes([]);
        setUserTransactions([]);
        setFinancials(null);
        setPaymentMethods([]);
        setAccountStatus("active");
        setLinkedAccountsLoadError(null);
        setTxError(null);
        setLoading(false);
        return;
      }
      if (!row) {
        setUser(null);
        setUserAlerts([]);
        setUserEvents([]);
        setLinkedAccounts([]);
        setLinkedDeviceOptions([]);
        setPredefinedNotes([]);
        setUserTransactions([]);
        setFinancials(null);
        setPaymentMethods([]);
        setAccountStatus("active");
        setLinkedAccountsLoadError(null);
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
      const [alertsRes, eventsRes, txRes, finRes, pmRes] = await Promise.all([
        supabase
          .from("alerts")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("alert_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("user_events")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("event_time", { ascending: false }),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("sort_order", { ascending: true })
          .order("transaction_date", { ascending: false }),
        supabase.from("user_financials").select("*").eq("user_id", canonicalUserId).maybeSingle(),
        supabase.from("user_payment_methods").select("*").eq("user_id", userIdInternal)
      ]);
      if (!cancelled) setUserAlerts((alertsRes.data as AlertRow[]) ?? []);
      const events = (eventsRes.data as UserEventRow[]) ?? [];
      if (!cancelled) setUserEvents(events);

      if (!cancelled) {
        setFinancials(normalizeFinancialsRow(finRes.data ?? null));
      }
      if (!cancelled) setPaymentMethods(((pmRes.data as PaymentMethodRow[]) ?? []) as UiPaymentMethod[]);
      const { notes: notesData, error: notesLoadErr } = await listInternalNotesForSimulatorUser(
        supabase,
        canonicalUserId
      );
      if (!cancelled) {
        setPredefinedNotes(notesData);
        setInternalNotesLoadError(notesLoadErr);
      }
      if (!cancelled) {
        setTxError(txRes.error?.message ?? null);
        setTransactionOrderError(null);
        const tx = txRes.error ? [] : (txRes.data as TransactionRow[]) ?? [];
        setUserTransactions(tx);
      }

        const viewerForLinks =
          appUser?.id && appUser?.role
            ? {
                id: appUser.id,
                role: appUser.role,
                organization_id: appUser.organization_id,
                email: appUser.email,
                full_name: appUser.full_name,
              }
            : null;

        if (viewerForLinks) {
          const { links, error: linksError } = await listUserAccountLinksForUser(
            supabase,
            viewerForLinks,
            canonicalUserId
          );
          if (!cancelled) {
            setLinkedAccounts(links);
            setLinkedAccountsLoadError(linksError);
          }
        } else if (!cancelled) {
          setLinkedAccounts([]);
          setLinkedDeviceOptions([]);
          setLinkedAccountsLoadError(null);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [appUser?.email, appUser?.full_name, appUser?.id, appUser?.organization_id, appUser?.role, reloadTick, userId]);

    useEffect(() => {
      if (!hasStaffAccess || !appUser || !user?.id) {
        setLinkedDeviceOptions([]);
        return;
      }

      const linkedUserIds = Array.from(
        new Set(
          linkedAccounts
            .map((link) => (link.user_id === user.id ? link.linked_user_id : link.user_id))
            .filter((value) => Boolean(value && value !== user.id))
        )
      );

      if (linkedUserIds.length === 0) {
        setLinkedDeviceOptions([]);
        return;
      }

      let cancelled = false;
      (async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_events")
          .select("user_id, device_id, device_name, event_time")
          .in("user_id", linkedUserIds)
          .not("device_id", "is", null)
          .order("event_time", { ascending: false });

        if (cancelled) return;
        if (error) {
          setLinkedDeviceOptions([]);
          return;
        }

        const uniqueDevices = new Map<string, LinkedDeviceOption>();
        for (const row of (data as Array<{
          user_id?: string | null;
          device_id?: string | null;
          device_name?: string | null;
        }> | null) ?? []) {
          const deviceId = String(row.device_id ?? "").trim();
          if (!deviceId || uniqueDevices.has(deviceId)) continue;
          const ownerId = String(row.user_id ?? "").trim();
          const deviceName = String(row.device_name ?? "").trim();
          uniqueDevices.set(deviceId, {
            value: deviceId,
            label: deviceName ? `${deviceId} · ${deviceName} · ${ownerId}` : `${deviceId} · Shared device · ${ownerId}`,
            deviceName: deviceName || "Shared device",
          });
        }

        setLinkedDeviceOptions(Array.from(uniqueDevices.values()));
      })();

      return () => {
        cancelled = true;
      };
    }, [appUser, hasStaffAccess, linkedAccounts, user?.id]);

  /** Notes tab: resolve review_threads.id. Trainees: own thread; staff: only when ?reviewThread= (matches this profile). */
  useEffect(() => {
    if (!userEditorMessage) return;
    setUserEditorMessageVisible(true);
    const fadeOutId = window.setTimeout(() => {
      setUserEditorMessageVisible(false);
    }, 1800);
    const timeoutId = window.setTimeout(() => {
      setUserEditorMessage(null);
    }, 2400);
    return () => {
      window.clearTimeout(fadeOutId);
      window.clearTimeout(timeoutId);
    };
  }, [userEditorMessage]);

  useEffect(() => {
    if (!user?.id || !appUser) {
      return;
    }
    let cancelled = false;
    setNotesTabThreadError(null);
    if (!hasStaffAccess && !isTraineeActor) {
      setNotesTabThreadId(null);
      setActiveProfileReviewThread(null);
      return;
    }
    (async () => {
      const supabase = createClient();
      if (isTraineeActor) {
        setActiveProfileReviewThread(null);
        const { threadId, error: thErr } = await fetchReviewThreadIdForProfile(supabase, user.id, appUser.id);
        if (cancelled) return;
        if (thErr) {
          setNotesTabThreadId(null);
          setNotesTabThreadError(thErr.message);
          return;
        }
        setNotesTabThreadId(threadId);
        return;
      }
      if (!reviewThreadFromUrl) {
        setNotesTabThreadId(null);
        setActiveProfileReviewThread(null);
        return;
      }
      const { thread, error: threadErr } = await fetchProfileReviewThreadById(supabase, reviewThreadFromUrl);
      if (cancelled) return;
      if (threadErr) {
        setNotesTabThreadId(null);
        setActiveProfileReviewThread(null);
        setNotesTabThreadError(threadErr.message);
        return;
      }
      if (
        !thread ||
        thread.context_type !== "profile" ||
        !thread.user_id ||
        thread.user_id !== user.id
      ) {
        setNotesTabThreadId(null);
        setActiveProfileReviewThread(null);
        setNotesTabThreadError("This review link does not match this profile.");
        return;
      }
      setNotesTabThreadId(thread.id);
      setActiveProfileReviewThread(thread);
    })();
    return () => {
      cancelled = true;
    };
  }, [appUser, hasStaffAccess, isTraineeActor, user?.id, reviewThreadFromUrl]);

  useEffect(() => {
    if (!user?.id || !appUser?.id || !isTraineeActor) {
      setReviewThreads([]);
      setReviewThreadsSubmissions([]);
      setReviewThreadsWithRootNotes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data, error: threadsError } = await supabase
        .from("review_threads")
        .select("id, app_user_id, alert_id, user_id, context_type, status, created_at, updated_at")
        .eq("app_user_id", appUser.id)
        .eq("user_id", user.id)
        .eq("context_type", "profile")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (threadsError) {
        setReviewThreads([]);
        setReviewThreadsSubmissions([]);
        setReviewThreadsWithRootNotes([]);
        setNotesTabThreadError(threadsError.message);
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
        setNotesTabThreadError(submissionsResult.error);
        return;
      }

      setReviewThreadsSubmissions(submissionsResult.rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [appUser?.id, isTraineeActor, user?.id, reviewThreadsReloadTick]);

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
    if (!user?.id || !appUser?.id || !isTraineeActor) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`profile-review-submissions:${appUser.id}:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_submissions",
          filter: `app_user_id=eq.${appUser.id}`,
        },
        (payload) => {
          const nextUserId =
            typeof payload.new === "object" && payload.new && "user_id" in payload.new
              ? String((payload.new as { user_id?: string | null }).user_id ?? "")
              : "";
          const prevUserId =
            typeof payload.old === "object" && payload.old && "user_id" in payload.old
              ? String((payload.old as { user_id?: string | null }).user_id ?? "")
              : "";

          if (nextUserId === user.id || prevUserId === user.id) {
            setReviewThreadsReloadTick((tick) => tick + 1);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appUser?.id, isTraineeActor, user?.id]);

  useEffect(() => {
    if (!appUser || !isTraineeActor || !user?.id) {
      setIsWatching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { watched, error } = await isSimulatorUserWatchedByTrainee(supabase, appUser.id, user.id);
      if (cancelled) return;
      if (error) {
        setIsWatching(false);
        return;
      }
      setIsWatching(watched);
    })();
    return () => {
      cancelled = true;
    };
  }, [appUser, isTraineeActor, user?.id]);

  useEffect(() => {
    if (!isTraineeActor || !user?.id) return;
    const trackingKey = `${user.id}:${appUser?.id ?? ""}`;
    if (trackedProfileOpenRef.current === trackingKey) return;
    trackedProfileOpenRef.current = trackingKey;
    const properties = {
      context_type: "profile" as const,
      alert_id: null,
      simulator_user_id: user.id,
      alert_type: null,
      severity: null,
      status: user.status,
    };
    trackTraineeEvent(appUser?.role, "profile_opened", properties);
    trackTraineeEvent(appUser?.role, "case_opened", properties);
    markFirstCaseOpened(appUser?.role, properties);
  }, [appUser?.id, appUser?.role, isTraineeActor, user?.id, user?.status]);

  useEffect(() => {
    if (!appUser?.id || !isTraineeActor || !user?.id) {
      setStatusDraftError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { override, error: overrideError } = await getTraineeUserStatusOverride(supabase, {
        appUserId: appUser.id,
        userId: user.id,
      });

      if (cancelled) return;

      if (overrideError) {
        setStatusDraftError(overrideError);
        return;
      }

      setStatusDraftError(null);
      setAccountStatus(normalizeAccountStatus(override?.status ?? user.status));
    })();

    return () => {
      cancelled = true;
    };
  }, [appUser?.id, isTraineeActor, user?.id, user?.status]);

  useEffect(() => {
    if (!isTraineeActor || !appUser?.id) {
      setLatestTraineeDecisionByAlertId({});
      setLinkedAlertDecisionFetchError(null);
      return;
    }
    if (userAlerts.length === 0) {
      setLatestTraineeDecisionByAlertId({});
      setLinkedAlertDecisionFetchError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const alertIds = userAlerts.map((a) => a.id).filter(Boolean);
      const { byAlertId, error: listErr } = await listLatestTraineeDecisionsForAlertsByActor(supabase, {
        appUserId: appUser.id,
        alertIds,
      });
      if (cancelled) return;
      if (listErr) {
        setLinkedAlertDecisionFetchError(listErr);
        setLatestTraineeDecisionByAlertId({});
        return;
      }
      setLinkedAlertDecisionFetchError(null);
      setLatestTraineeDecisionByAlertId(byAlertId);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, appUser?.id, isTraineeActor, userAlerts, reloadTick]);

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
    if (!appUser?.id || !isTraineeActor || !user?.id) return;
    setWatchBusy(true);
    setWatchError(null);
    try {
      const supabase = createClient();
      if (isWatching) {
        const { error: delErr } = await removeSimulatorUserFromWatchlist(supabase, appUser.id, user.id);
        if (delErr) throw delErr;
        setIsWatching(false);
        trackTraineeEvent(appUser.role, "watchlist_item_removed", {
          context_type: "profile",
          alert_id: null,
          simulator_user_id: user.id,
        });
      } else {
        const { error: insErr } = await addSimulatorUserToWatchlist(supabase, appUser.id, user.id);
        if (insErr) throw insErr;
        setIsWatching(true);
        trackTraineeEvent(appUser.role, "watchlist_item_added", {
          context_type: "profile",
          alert_id: null,
          simulator_user_id: user.id,
        });
      }
    } catch (e) {
      setWatchError(formatPostgrestError(e));
    } finally {
      setWatchBusy(false);
    }
  }, [appUser?.id, appUser?.role, isTraineeActor, isWatching, user?.id]);

  const createReviewThread = useCallback(async () => {
    if (!appUser?.id || !user?.id) return null;

    const supabase = createClient();
    const { threadId, error: threadError } = await createProfileReviewThreadForContext(supabase, appUser.id, user.id);

    if (threadError || !threadId) {
      setNotesTabThreadError(threadError?.message ?? "Could not create a new review case for this profile.");
      return null;
    }

    setNotesTabThreadError(null);
    setNotesTabThreadId(threadId);
    setReviewThreadsReloadTick((tick) => tick + 1);
    trackTraineeEvent(appUser?.role, "review_thread_created", {
      context_type: "profile",
      thread_id: threadId,
      alert_id: null,
      simulator_user_id: user.id,
      has_existing_thread: reviewThreads.length > 0,
    });
    return threadId;
  }, [appUser?.id, appUser?.role, reviewThreads.length, user?.id]);

  const reviewThreadsSubmissionsForUi = useMemo(() => {
    if (!isTraineeActor) return reviewThreadsSubmissions;
    const maxVersionByThread = new Map<string, number>();
    for (const s of reviewThreadsSubmissions) {
      const prev = maxVersionByThread.get(s.thread_id) ?? 0;
      if (s.submission_version > prev) maxVersionByThread.set(s.thread_id, s.submission_version);
    }
    return reviewThreadsSubmissions.filter(
      (s) => s.submission_version === (maxVersionByThread.get(s.thread_id) ?? 0)
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

      if (notesTabThreadId === threadId) {
        setNotesTabThreadId(null);
      }
      setReviewThreads((current) => current.filter((thread) => thread.id !== threadId));
      setReviewThreadsSubmissions((current) => current.filter((submission) => submission.thread_id !== threadId));
      setReviewThreadsReloadTick((tick) => tick + 1);
    },
    [appUser?.id, notesTabThreadId, submissionsByThreadId]
  );

  const staffPrimaryThreadId = hasStaffAccess && !isTraineeActor ? notesTabThreadId : null;

  const reviewWorkspacePanels = user?.id ? (
    <div className="space-y-5">
      {notesTabThreadError && !isStaffReviewMode ? (
        <p className="text-sm text-rose-600">{notesTabThreadError}</p>
      ) : null}
      {!isStaffReviewMode ? (
        <>
          <SimulatorCommentsPanel
            threadId={isTraineeActor ? null : staffPrimaryThreadId}
            reviewMode
            privateAlertInternalId={null}
            privateSimulatorUserId={null}
            analyticsContextType="profile"
            analyticsSimulatorUserId={user.id}
            submissions={staffPrimaryThreadId ? staffReviewSubmissions : []}
            createThread={isTraineeActor ? createReviewThread : null}
            adminModeOverride={hasStaffAccess ? "reply" : undefined}
            showItems={isTraineeActor ? false : Boolean(staffPrimaryThreadId)}
            showStatusMessages={false}
            showTitle={false}
            withTopBorder={false}
            flushTop
            emptyMessage="No notes in this workspace yet."
          />
          {hasStaffAccess && !isTraineeActor && notesTabThreadId ? (
            <ReviewSubmissionsPanel
              threadId={notesTabThreadId}
              showTraineeAction={false}
              title="Reviewer evaluation"
              withTopBorder={false}
            />
          ) : null}
        </>
      ) : null}
      {isTraineeActor ? (
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
          <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">Drafts</h3>
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
                analyticsContextType="profile"
                analyticsSimulatorUserId={user.id}
                analyticsHasExistingThread
                submissions={[]}
                showComposer={false}
                onDeleteDraftThread={deleteDraftReviewThread}
                adminModeOverride={hasStaffAccess ? "reply" : undefined}
                showTitle={false}
                withTopBorder={false}
                emptyMessage=""
              />
            ))
          ) : (
            <div className="empty-state">No drafts yet.</div>
          )}
        </div>
      </div>
      ) : null}
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
            <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">Review cases</h3>
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
                    analyticsContextType="profile"
                    analyticsSimulatorUserId={user.id}
                    analyticsHasExistingThread
                    submissions={threadSubmissions}
                    showComposer={false}
                    adminModeOverride={hasStaffAccess ? "reply" : undefined}
                    showTitle={false}
                    withTopBorder={false}
                    emptyMessage="Nothing has been submitted from this case yet."
                  />
                );
              })}
            </div>
        </div>
      ) : null}
    </div>
  ) : null;

  const persistTraineeStatusDraft = useCallback(
    async (nextStatus: AccountStatus) => {
      if (!isTraineeActor || !appUser?.id || !user?.id) return;

      const supabase = createClient();
      const { error: overrideError } = await upsertTraineeUserStatusOverride(supabase, {
        appUserId: appUser.id,
        userId: user.id,
        status: nextStatus,
      });

      setStatusDraftError(overrideError);
    },
    [appUser?.id, isTraineeActor, user?.id]
  );

  const totalTransactions = userTransactions.length;
  const totalTransactionPages = Math.max(1, Math.ceil(totalTransactions / transactionsPageSize));
  const safeTransactionsPage = Math.min(transactionsPage, totalTransactionPages);
  const transactionsPageStart = (safeTransactionsPage - 1) * transactionsPageSize;
  const paginatedTransactions = userTransactions.slice(
    transactionsPageStart,
    transactionsPageStart + transactionsPageSize
  );
  const visibleTransactions = paginatedTransactions;
  const chronologyConflictIds = useMemo(
    () => new Set(getTransactionChronologyConflictIds(userTransactions)),
    [userTransactions]
  );

  useEffect(() => {
    if (transactionsPage !== safeTransactionsPage) {
      setTransactionsPage(safeTransactionsPage);
    }
  }, [safeTransactionsPage, transactionsPage]);

  const persistTransactionOrder = useCallback(
    async (nextTransactions: TransactionRow[]) => {
      if (!appUser || !user?.id) return;
      const supabase = createClient();
      setTransactionOrderSaving(true);
      setTransactionOrderError(null);
      const { transactions, error: reorderError } = await reorderSimulatorTransactions(
        supabase,
        appUser,
        user.id,
        nextTransactions.map((transaction) => transaction.id)
      );
      if (reorderError) {
        setTransactionOrderError(reorderError);
        setReloadTick((value) => value + 1);
      } else if (transactions.length > 0) {
        setUserTransactions(transactions);
      }
      setTransactionOrderSaving(false);
    },
    [appUser, user?.id]
  );

  const handleTransactionDrop = useCallback(
    async (targetTransactionId: string) => {
      if (!hasStaffAccess || !draggedTransactionId || draggedTransactionId === targetTransactionId || transactionOrderSaving) {
        setDropTargetTransactionId(null);
        setDraggedTransactionId(null);
        return;
      }
      const nextTransactions = moveTransactionRow(userTransactions, draggedTransactionId, targetTransactionId);
      if (nextTransactions === userTransactions) {
        setDropTargetTransactionId(null);
        setDraggedTransactionId(null);
        return;
      }
      setUserTransactions(nextTransactions);
      setDropTargetTransactionId(null);
      setDraggedTransactionId(null);
      await persistTransactionOrder(nextTransactions);
    },
    [draggedTransactionId, hasStaffAccess, persistTransactionOrder, transactionOrderSaving, userTransactions]
  );

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
        <Link href="/users" className="text-sm text-[var(--brand-700)] hover:underline">
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
  const userCards = paymentMethods.filter((m) => {
    const type = (m.type ?? "").toLowerCase();
    return type === "card" || type.includes("card");
  });
  const userBankAccounts = paymentMethods.filter(
    (m) =>
      (m.type ?? "").toLowerCase() !== "card" &&
      !m.wallet_type &&
      !m.wallet_address &&
      (m.type ?? "").toLowerCase() !== "crypto" &&
      !(m.type ?? "").toLowerCase().match(/wallet|crypto/)
  );
  const userCryptoAccounts = paymentMethods.filter(
    (m) =>
      (m.type ?? "").toLowerCase() === "crypto" ||
      (!!m.wallet_type || !!m.wallet_address || !!(m.type ?? "").toLowerCase().match(/wallet|crypto/))
  );

  // Last Seen = most recent timestamp between latest user event and latest transaction.
  const latestEventTime = userEvents[0]?.event_time ?? null;
  const latestTransactionTime = userTransactions.reduce<string | null>((latest, transaction) => {
    const transactionTime = transaction.transaction_date ?? null;
    if (!transactionTime) return latest;
    if (!latest) return transactionTime;
    return new Date(transactionTime).getTime() > new Date(latest).getTime() ? transactionTime : latest;
  }, null);
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
      const byDevice = new Map<
        string,
        { deviceName: string; deviceId: string | null; lastSeen: string; countryCode: string | null }
      >();
      for (const e of userEvents) {
        const deviceLabel = e.device_name?.trim() || "Unknown device";
        const dedupeKey = e.device_id?.trim() || deviceLabel;
        const existing = byDevice.get(dedupeKey);
        const eventTime = e.event_time;
      if (!existing || new Date(eventTime) > new Date(existing.lastSeen)) {
        byDevice.set(dedupeKey, {
          deviceName: deviceLabel,
          deviceId: e.device_id?.trim() || null,
          lastSeen: eventTime,
          countryCode: e.country_code ?? null,
        });
      }
    }
    return Array.from(byDevice.values()).sort(
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
  const canManageRelatedData = hasStaffAccess;
  const getLinkedAccountOtherUserId = (link: UserAccountLinkRow) =>
    link.user_id === user.id ? link.linked_user_id : link.user_id;

  const applyPartialBlock = () => {
    if (!canOperate) return;
    setAccountStatus("restricted");
    void persistTraineeStatusDraft("restricted");
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
    void persistTraineeStatusDraft("blocked");
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
    void persistTraineeStatusDraft("active");
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
    void persistTraineeStatusDraft("closed");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if ((m.status ?? "").toLowerCase() === "closed") return m;
        return { ...m, status: "closed", closedByClosure: true };
      })
    );
  };

  const reactivateAccount = () => {
    setAccountStatus("active");
    void persistTraineeStatusDraft("active");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if (!m.closedByClosure) return m;
        return { ...m, status: "active", closedByClosure: false, blockedByFullBlock: false, restrictedFrozen: false };
      })
    );
  };

  const statusBadgeClass =
    accountStatus === "active"
      ? "ui-badge-emerald"
      : accountStatus === "blocked" || accountStatus === "closed"
        ? "ui-badge-rose"
        : accountStatus === "restricted"
          ? "ui-badge-amber"
          : accountStatus === "not_active"
            ? "ui-badge-neutral"
            : "ui-badge-neutral";
  const riskBadgeClass =
    riskLevel === "High"
      ? "ui-badge-rose"
      : riskLevel === "Medium"
        ? "ui-badge-amber"
        : riskLevel === "Low"
          ? "ui-badge-emerald"
          : "ui-badge-neutral";

  const activeThreadReference = activeProfileReviewThread?.id ?? notesTabThreadId;
  const activeThreadStatusLabel = latestStaffSubmission
    ? formatReviewSubmissionState(latestStaffSubmission.review_state)
    : "Draft case";
  const activeThreadEvaluationLabel = latestStaffSubmission
    ? formatReviewEvaluation(latestStaffSubmission.evaluation)
    : "Not graded";
  const activeThreadTimestampLabel = latestStaffSubmission?.submitted_at
    ? formatDateTime(latestStaffSubmission.submitted_at)
    : activeProfileReviewThread?.created_at
      ? formatDateTime(activeProfileReviewThread.created_at)
      : "Waiting for case details";
  const activeThreadSummary = latestStaffSubmission
    ? `Submission v${latestStaffSubmission.submission_version}`
    : activeThreadReference
      ? "Shared review case"
      : "Loading case";

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
            Review case workspace for this profile
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/review" className="ui-btn ui-btn-secondary min-h-0 rounded-[1rem] px-3.5 py-2 text-sm shadow-none">
            Back to Review queue
          </Link>
          {activeProfileReviewThread?.app_user_id ? (
            <Link
              href={`/admin/trainees/${activeProfileReviewThread.app_user_id}`}
              className="ui-btn ui-btn-secondary min-h-0 rounded-[1rem] px-3.5 py-2 text-sm shadow-none"
            >
              View trainee profile
            </Link>
          ) : null}
        </div>
      </div>

      {notesTabThreadError ? <p className="mt-4 text-sm text-rose-600">{notesTabThreadError}</p> : null}

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
          threadId={notesTabThreadId}
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
          showQaReplyAction={false}
        />
      </div>
    </div>
  ) : null;

  const staffReviewSidebar = isStaffReviewMode ? (
    <div className="space-y-4 lg:sticky lg:top-6">
      <div className="evidence-shell p-4 sm:p-5">
        <ReviewSubmissionsPanel
          threadId={notesTabThreadId}
          title="Reviewer Evaluation"
          showTraineeAction={false}
          showTitle
          sectionHeader
          withTopBorder={false}
          variant="admin"
        />
      </div>
      <ReviewThreadInternalNotePanel
        threadId={notesTabThreadId}
        title="Case Note"
        variant="drafts"
        noThreadMessage="Open a review case from Admin to keep one shared case note for this submission."
      />
      <ObjectNotePanel
        title="Source Profile Note"
        mode="read"
        simulatorUserId={user.id}
        emptyMessage="No profile note yet."
      />
    </div>
  ) : null;

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--brand-700)]">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/users" className="hover:text-[var(--brand-700)]">
            Users
          </Link>{" "}
          / <span className="text-slate-700">{displayName}</span>
        </nav>

        {hasStaffAccess ? (
          <button
            type="button"
            onClick={() => {
              setUserEditorOpen((open) => !open);
              setUserEditorMessage(null);
            }}
            className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
          >
            {userEditorOpen ? "Close editor" : "Edit user"}
          </button>
        ) : isTraineeActor ? (
          <div className="flex max-w-[18rem] flex-col items-end gap-1.5">
            <button
              type="button"
              disabled={watchBusy}
              onClick={() => void onToggleWatch()}
              aria-pressed={isWatching}
              className={`inline-flex min-h-9 items-center gap-2 rounded-[0.9rem] border px-3.5 py-1.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                isWatching
                  ? "border-[var(--brand-400)] bg-[var(--brand-400)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_14px_rgba(28,71,75,0.16)] hover:border-[var(--brand-700)] hover:bg-[var(--brand-700)]"
                  : "border-slate-300 bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:border-[var(--brand-400)] hover:bg-[rgb(241_248_247_/_0.98)] hover:text-[var(--brand-700)]"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M1.5 10s3.1-5 8.5-5 8.5 5 8.5 5-3.1 5-8.5 5-8.5-5-8.5-5Z" />
                <circle cx="10" cy="10" r="2.5" />
              </svg>
              <span>{watchBusy ? "Updating..." : isWatching ? "Watching" : "Watch user"}</span>
            </button>
            {watchError ? <p className="text-right text-[10px] text-rose-600">{watchError}</p> : null}
            {statusDraftError ? <p className="text-right text-[10px] text-rose-600">{statusDraftError}</p> : null}
          </div>
        ) : null}
      </div>

      {hasStaffAccess && userEditorMessage ? (
        <div className="pointer-events-none fixed right-6 top-6 z-50 flex justify-end">
          <div
            className={`rounded-[0.95rem] border border-emerald-200 bg-emerald-50/95 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-[0_14px_28px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out ${
              userEditorMessageVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
            role="status"
            aria-live="polite"
          >
            {userEditorMessage}
          </div>
        </div>
      ) : null}

      {hasStaffAccess && userEditorOpen ? (
          <div className="evidence-shell p-4 sm:p-5">
            <SimulatorUserForm
              key={`user-editor:${user.id}`}
              viewer={appUser}
              mode="edit"
              fieldset="full"
            initialValue={user}
            submitLabel="Save user"
            onSaved={(nextUser) => {
              setUser(nextUser);
              setAccountStatus(normalizeAccountStatus(nextUser.status));
              setUserEditorOpen(false);
              setUserEditorMessage("Profile details saved.");
            }}
            onCancel={() => setUserEditorOpen(false)}
          />
        </div>
      ) : null}

      <div
        className={`shell-card flex min-w-0 flex-row items-start gap-4 overflow-hidden px-4 py-3 sm:overflow-visible sm:p-5 ${accountHeroToneClass(accountStatus)} ${
          isTraineeActor ? "" : "sm:items-center"
        }`}
      >
        <SimulatorUserSelfieUploader
          canEdit={canManageRelatedData}
          displayName={displayName}
          selfiePath={user.selfie_path}
          selfieUrl={selfieUrl}
          userId={user.id}
          onUpdated={(nextPath) => {
            setUser((current) => (current ? { ...current, selfie_path: nextPath } : current));
            setUserEditorMessage("Selfie updated.");
          }}
        />
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
              <span className={`ui-badge text-[11px] ${statusBadgeClass}`}>
                {userStatus}
              </span>
              <span className="ui-badge ui-badge-blue text-[11px]">
                {tierLabel}
              </span>
              <span className={`ui-badge text-[11px] ${riskBadgeClass}`}>
                {riskLevel ? `${riskLevel} Risk` : "—"}
              </span>
              <span className="ui-badge ui-badge-neutral text-[11px]">
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
              {!isTraineeActor ? (
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
              {!isTraineeActor ? (
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
        {isTraineeActor ? (
          <div className="flex w-[min(100%,12.5rem)] shrink-0 flex-col items-end justify-end gap-2 self-stretch sm:w-auto sm:max-w-[min(100%,20rem)]">
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

      {isStaffReviewMode ? (
        <div className="space-y-4">
          {staffReviewModeHeader}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.95fr)]">
            <div className="min-w-0 space-y-4">
              <div className="xl:sticky xl:top-6">
                {staffReviewWorkspacePanel}
              </div>
            </div>
            <aside className="min-w-0">{staffReviewSidebar}</aside>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row">
        <aside className="min-w-0 shrink-0 space-y-4 lg:w-[320px] lg:min-w-[320px] xl:w-[340px] xl:min-w-[340px]">
          <div className="evidence-shell p-4">
            <h2 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
              Contact &amp; Details
            </h2>
            <div className="mt-3 flex min-w-0 flex-col gap-2 text-sm text-slate-700">
              <p className={simulatorStaticFieldClass}><span className="font-medium">Registration date:</span> {user.registration_date ?? "—"}</p>
              <p className={simulatorStaticFieldClass}><span className="font-medium">Email:</span> {user.email}</p>
              <p className={simulatorStaticFieldClass}><span className="font-medium">Phone:</span> {user.phone ?? "—"}</p>
              <p className={simulatorStaticFieldClass}><span className="font-medium">Date of birth:</span> {user.date_of_birth ?? "—"}</p>
              <p className={simulatorStaticFieldClass}><span className="font-medium">Age:</span> {age ?? "—"}</p>
              <p className={simulatorStaticFieldClass}><span className="font-medium">Nationality:</span> {user.nationality ?? "—"}</p>
              <p className={simulatorStaticFieldClass}><span className="font-medium">Address:</span> {user.address_text ?? "—"}</p>
            </div>
          </div>

          <div className="evidence-shell p-4">
            <h2 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
              Documents
            </h2>
            <ul className="mt-3 flex min-w-0 flex-col gap-2.5 text-sm text-slate-700">
              <li className={simulatorStaticFieldClass}><span className="font-medium">Proof of Identity:</span> {user.proof_of_identity ?? "—"}</li>
              <li className={simulatorStaticFieldClass}><span className="font-medium">Proof of Address:</span> {user.proof_of_address ?? "—"}</li>
              <li className={simulatorStaticFieldClass}>
                <span className="font-medium">Source of funds:</span>{" "}
                {user.source_of_funds_docs && user.source_of_funds_docs.trim().length > 0
                  ? user.source_of_funds_docs
                  : "—"}
              </li>
            </ul>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {!isStaffReviewMode && hasStaffAccess ? (
            <ObjectNotePanel
              title="Profile Note"
              mode="edit"
              simulatorUserId={user.id}
              emptyMessage="No profile note yet."
              placeholder="Add a personal note for this profile..."
              saveButtonLabel="Save profile note"
            />
          ) : null}
          {reviewWorkspacePanels}
          <div className="workspace-shell overflow-visible sm:overflow-hidden">
            <div className="bg-[linear-gradient(180deg,rgba(248,250,253,0.965),rgba(236,241,248,0.84))] px-2 py-3 sm:px-4 sm:py-3">
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
                  className="ui-btn ui-btn-primary flex w-full justify-between rounded-[0.9rem] px-4 py-2.5 text-left text-sm outline-none"
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
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[min(16rem,60vh)] overflow-y-auto rounded-[0.9rem] border border-slate-200 bg-white py-1 shadow-lg [-webkit-overflow-scrolling:touch]"
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
                              ? "bg-[var(--brand-700)] text-white"
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
                <div className="inline-flex w-full rounded-[0.95rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(244,248,251,0.96),rgba(236,243,248,0.96))] p-[2px] shadow-[inset_0_1px_2px_rgba(169,188,201,0.18)]">
                  <div className="grid w-full grid-cols-7 gap-[3px]">
                  {PROFILE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex h-[2.4rem] min-w-0 items-center justify-center whitespace-nowrap rounded-[0.72rem] border px-2.25 text-[0.78rem] font-semibold leading-none tracking-[-0.015em] transition-all duration-200 ${
                        activeTab === tab.key
                          ? "border border-[rgba(20,63,67,0.92)] bg-[linear-gradient(180deg,rgba(41,95,101,0.98),rgba(28,77,82,0.98))] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(11,32,35,0.28)]"
                          : "border-transparent bg-transparent text-slate-600 hover:border-[rgb(201_214_225_/_0.95)] hover:bg-white/85 hover:text-[var(--brand-600)]"
                      }`}
                      title={tab.label}
                    >
                      {tab.compactDesktopLabel ? (
                        <>
                          <span className="lg:hidden">{tab.compactDesktopLabel}</span>
                          <span className="hidden lg:inline">{tab.desktopLabel ?? tab.label}</span>
                        </>
                      ) : (
                        tab.desktopLabel ?? tab.label
                      )}
                    </button>
                  ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-white to-slate-50/80">
          {activeTab === "overview" && (
            <div className="p-4">
              {isTier1 ? (
                <p className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  SOF questionnaire not required for this tier.
                </p>
              ) : isTier2Or3 ? (
                (() => {
                  const sofItems = [
                    user.occupation?.trim()
                      ? { label: "Occupation", value: user.occupation.trim() }
                      : null,
                    user.employment_status?.trim()
                      ? { label: "Employment", value: user.employment_status.trim() }
                      : null,
                    user.annual_income_min_usd != null || user.annual_income_max_usd != null
                      ? {
                          label: "Annual income",
                          value:
                            [user.annual_income_min_usd, user.annual_income_max_usd]
                              .filter((n): n is number => n != null)
                              .map((n) => n.toLocaleString("en-US"))
                              .join(" – ") + " USD",
                        }
                      : null,
                    (user.primary_source_of_funds ?? user.source_of_funds_docs)?.trim()
                      ? {
                          label: "Primary source of funds",
                          value: (user.primary_source_of_funds ?? user.source_of_funds_docs ?? "").trim(),
                        }
                      : null,
                  ].filter((item): item is { label: string; value: string } => Boolean(item));

                  if (sofItems.length === 0) {
                    return (
                      <p className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                        No SOF questionnaire.
                      </p>
                    );
                  }

                  return (
                    <div className="grid gap-2.5 text-sm text-slate-700 md:grid-cols-2">
                      {sofItems.map((item) => (
                        <p key={item.label} className={`${simulatorStaticFieldClass} text-sm text-slate-700`}>
                          <span className="font-medium">{item.label}:</span> {item.value}
                        </p>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <p className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  SOF questionnaire not required for this tier.
                </p>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-end gap-3 p-4 pb-0">
                {canManageRelatedData ? (
                  <button
                    type="button"
                    onClick={() => setTransactionEditor({ mode: "create", value: null })}
                    className="ui-btn ui-btn-secondary ml-auto min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
                  >
                    Add transaction
                  </button>
                ) : null}
              </div>
              {!txError && visibleTransactions.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No transactions.
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {txError ? (
                    <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {txError}
                    </div>
                  ) : transactionOrderError ? (
                    <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {transactionOrderError}
                    </div>
                  ) : (
                    visibleTransactions.map((tx, idx) => {
                      const direction = tx.direction ?? "—";
                      const directionLower = direction.toLowerCase();
                      const inbound = directionLower === "inbound";
                      const outbound = directionLower === "outbound";
                      const unsuccessful = isUnsuccessfulTransactionStatus(tx.status);
                      const rejected = (tx.status ?? "").trim().toLowerCase() === "rejected";
                      const directionLabel = inbound ? "IN" : outbound ? "OUT" : direction;
                      const directionBadgeClass = unsuccessful
                        ? "ui-badge-neutral"
                        : inbound
                          ? "ui-badge-emerald"
                          : outbound
                            ? "ui-badge-rose"
                            : "ui-badge-neutral";
                      const amountClass = rejected
                        ? "text-slate-700"
                        : inbound
                          ? "text-emerald-600"
                          : outbound
                            ? "text-rose-600"
                            : "text-slate-800";
                      const txDescription =
                        tx.type === "Card top-up"
                          ? (() => {
                              const maskedCard =
                                formatMaskedCardReference(tx.funding_card_masked) ?? formatMaskedCardReference(tx.card_masked);
                              return maskedCard ?? null;
                            })()
                          : getTransactionDescriptionFromRow(tx);
                      const channelBadge = transactionChannelBadge(tx.channel);
                      const txStatus = transactionStatusBadge(tx.status_display ?? tx.status);
                      const hasChronologyConflict = chronologyConflictIds.has(tx.id);
                      const isDropTarget = dropTargetTransactionId === tx.id && draggedTransactionId !== tx.id;
                      const expanded = expandedTransactionId === tx.id;

                      return (
                        <article
                          key={tx.id}
                          draggable={canManageRelatedData && !transactionOrderSaving}
                          onDragStart={(event) => {
                            if (!canManageRelatedData) return;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", tx.id);
                            setDraggedTransactionId(tx.id);
                            setTransactionOrderError(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTransactionId(null);
                            setDropTargetTransactionId(null);
                          }}
                          onDragOver={(event) => {
                            if (!canManageRelatedData) return;
                            event.preventDefault();
                            if (draggedTransactionId && draggedTransactionId !== tx.id) {
                              setDropTargetTransactionId(tx.id);
                            }
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            await handleTransactionDrop(tx.id);
                          }}
                          className={`group relative rounded-[1rem] border px-3 py-2.5 shadow-[0_6px_14px_rgba(148,163,184,0.07)] transition-all duration-150 hover:shadow-[0_10px_18px_rgba(148,163,184,0.10)] ${
                            hasChronologyConflict
                              ? "border-rose-300/90 bg-[linear-gradient(180deg,rgba(255,250,250,0.99),rgba(255,243,244,0.98))] hover:border-rose-400/90"
                              : "border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,249,251,0.98))] hover:border-[rgb(191_209_215_/_0.96)]"
                          } ${
                            idx % 2 === 1 && !hasChronologyConflict
                              ? "bg-[linear-gradient(180deg,rgba(252,253,255,0.99),rgba(245,248,250,0.98))]"
                              : ""
                          } ${
                            canManageRelatedData
                              ? draggedTransactionId === tx.id
                                ? "cursor-grabbing opacity-80"
                                : "cursor-grab"
                              : ""
                          } ${
                            isDropTarget ? "ring-2 ring-[rgba(56,120,128,0.22)] ring-offset-2 ring-offset-white" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {canManageRelatedData ? (
                              <span
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-400 shadow-sm"
                                title="Drag to reorder"
                                aria-hidden="true"
                              >
                                ⋮⋮
                              </span>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => setExpandedTransactionId((current) => (current === tx.id ? null : tx.id))}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-[0.85rem] px-1 py-0.5 text-left transition-[transform,color] duration-150 hover:text-slate-950"
                              aria-expanded={expanded}
                            >
                              <span
                                className={`text-[12px] text-slate-400 transition-[transform,color] duration-150 group-hover:text-[var(--brand-700)] ${expanded ? "rotate-90" : ""}`}
                                aria-hidden="true"
                              >
                                ▶
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">
                                    {formatDate(tx.transaction_date)}
                                  </span>
                                  <span className={`ui-badge px-1.5 py-0.5 text-[10px] font-semibold ${directionBadgeClass}`}>
                                    {directionLabel}
                                  </span>
                                  <h3 className="min-w-0 text-[14px] font-semibold tracking-[-0.01em] text-slate-900 transition-colors duration-150 group-hover:text-[var(--brand-700)]">
                                    {tx.type ?? "—"}
                                  </h3>
                                  {tx.type !== "Card top-up" && tx.type !== "Crypto transfer" ? (
                                    <span className={`ui-badge px-1.5 py-0.5 text-[10px] font-semibold ${channelBadge.className}`}>
                                      {channelBadge.label}
                                    </span>
                                  ) : null}
                                  <span className={`ui-badge px-1.5 py-0.5 text-[10px] font-semibold ${txStatus.className}`}>
                                    {txStatus.label}
                                  </span>
                                </div>

                                {txDescription ? (
                                  <p className="mt-0.5 truncate text-[13px] font-medium text-slate-600 transition-colors duration-150 group-hover:text-slate-700">
                                    {txDescription}
                                  </p>
                                ) : null}
                              </div>

                              <div className="shrink-0 text-right">
                                <p className={`text-[15px] font-semibold tracking-[-0.02em] ${amountClass}`}>
                                  {formatTransactionAmount(tx.amount, tx.currency, tx.direction, tx.status)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  {tx.amount_usd != null
                                    ? formatTransactionAmountUsd(tx.amount_usd, tx.direction, tx.status)
                                    : "USD value unavailable"}
                                </p>
                              </div>
                            </button>

                            {canManageRelatedData ? (
                              <div className="shrink-0">
                                <TransactionActionsMenu
                                  onView={() => setExpandedTransactionId((current) => (current === tx.id ? null : tx.id))}
                                  onDuplicate={() => setTransactionEditor({ mode: "duplicate", value: duplicatedTransactionSeed(tx) })}
                                  onEdit={() => setTransactionEditor({ mode: "edit", value: tx })}
                                />
                              </div>
                            ) : null}
                          </div>

                          {expanded ? (
                            <div className="mt-3 pl-9">
                              <TransactionDetailsPanel transaction={tx} />
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}

                  {totalTransactions > 0 ? (
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200/80 bg-slate-50/70 px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>Show</span>
                        <div className="w-[9.5rem]">
                          <FilterSelect
                            ariaLabel="Transactions per page"
                            value={String(transactionsPageSize)}
                            onChange={(nextValue) => {
                              setTransactionsPageSize(Number(nextValue));
                              setTransactionsPage(1);
                            }}
                            options={TRANSACTION_PAGE_SIZE_OPTIONS.map((pageSize) => ({
                              value: String(pageSize),
                              label: `${pageSize} per page`,
                            }))}
                            className="h-10 rounded-[0.9rem] bg-white text-sm font-medium"
                            menuClassName="rounded-[0.9rem]"
                          />
                        </div>
                        {totalTransactions > 0 ? (
                          <span className="text-slate-500">
                            {transactionsPageStart + 1}-{Math.min(transactionsPageStart + transactionsPageSize, totalTransactions)} of{" "}
                            {totalTransactions}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {totalTransactions > transactionsPageSize ? (
                          <span className="hidden text-sm text-slate-500 sm:inline">
                            Page {safeTransactionsPage} of {totalTransactionPages}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setTransactionsPage((current) => Math.max(1, current - 1))}
                          disabled={safeTransactionsPage <= 1}
                          className="rounded-[0.8rem] border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTransactionsPage((current) => Math.min(totalTransactionPages, current + 1))
                          }
                          disabled={safeTransactionsPage >= totalTransactionPages}
                          className="rounded-[0.8rem] border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="space-y-4 p-4">
              {canManageRelatedData ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodEditor({ mode: "create", value: null })}
                    className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
                  >
                    Add method
                  </button>
                </div>
              ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Cards
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {userCards.length === 0 ? (
                    <li className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No cards.
                    </li>
                  ) : (
                    userCards.map((card) => (
                      <li
                        key={card.id}
                        className="flex flex-col gap-2 border-b border-slate-200/80 px-1 py-2.5 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {card.card_network ?? card.type ?? "Card"}
                          </p>
                          <div className="flex items-center gap-2">
                            <PaymentMethodStatusBadge status={card.status} />
                            {canManageRelatedData ? (
                              <button
                                type="button"
                                onClick={() => setPaymentMethodEditor({ mode: "edit", value: card })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="font-mono text-xs tracking-tight text-slate-600">
                          {card.masked_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Bank Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {userBankAccounts.length === 0 ? (
                    <li className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No bank accounts.
                    </li>
                  ) : (
                    userBankAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex flex-col gap-2 border-b border-slate-200/80 px-1 py-2.5 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {acc.bank_type ?? acc.type ?? "Account"}
                          </p>
                          <div className="flex items-center gap-2">
                            <PaymentMethodStatusBadge status={acc.status} />
                            {canManageRelatedData ? (
                              <button
                                type="button"
                                onClick={() => setPaymentMethodEditor({ mode: "edit", value: acc })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="font-mono text-xs tracking-tight text-slate-600">
                          {acc.account_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Crypto Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {userCryptoAccounts.length === 0 ? (
                    <li className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No crypto accounts.
                    </li>
                  ) : (
                    userCryptoAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex flex-col gap-2 border-b border-slate-200/80 px-1 py-2.5 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {acc.wallet_type ?? acc.type ?? "Wallet"}
                          </p>
                          <div className="flex items-center gap-2">
                            <PaymentMethodStatusBadge status={acc.status} />
                            {canManageRelatedData ? (
                              <button
                                type="button"
                                onClick={() => setPaymentMethodEditor({ mode: "edit", value: acc })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
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
            </div>
          )}

          {activeTab === "network" && (
            <div className="space-y-4 p-4">
              {canManageRelatedData ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountLinkEditor({ mode: "create", value: null })}
                    className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
                  >
                    Add linked account
                  </button>
                </div>
              ) : null}
              {linkedAccountsLoadError ? (
                <QueryErrorBanner
                  message={`Could not load linked accounts: ${linkedAccountsLoadError}`}
                  onRetry={() => setReloadTick((n) => n + 1)}
                />
              ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Devices
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {uniqueDevices.length === 0 ? (
                    <li className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No devices.
                    </li>
                  ) : (
                    uniqueDevices.map((d, i) => (
                        <li
                          key={i}
                          className="border-b border-slate-200/80 px-1 py-2.5 last:border-b-0"
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
              <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  IP Addresses
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {uniqueIps.length === 0 ? (
                    <li className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No IP addresses.
                    </li>
                  ) : (
                    uniqueIps.map(({ ip, usageCount, lastSeen, country }, i) => (
                      <li
                        key={i}
                        className="border-b border-slate-200/80 px-1 py-2.5 last:border-b-0"
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
              <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Linked Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {linkedAccounts.length === 0 ? (
                    <li className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No linked accounts.
                    </li>
                  ) : (
                    linkedAccounts.map((link) => {
                      const otherUserId = getLinkedAccountOtherUserId(link);
                      return (
                        <li
                          key={link.id}
                          className="border-b border-slate-200/80 px-1 py-2.5 last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">
                              <Link
                                href={`/users/${otherUserId}`}
                                className="font-mono text-[var(--brand-700)] hover:underline"
                              >
                                {otherUserId}
                              </Link>
                            </p>
                            {canManageRelatedData ? (
                              <button
                                type="button"
                                onClick={() => setAccountLinkEditor({ mode: "edit", value: link })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {link.link_reason.trim() ? link.link_reason : "Linked account"}
                          </p>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="overflow-hidden">
              {canManageRelatedData ? (
                <div className="flex flex-wrap items-center justify-end gap-3 p-4 pb-0">
                  <button
                    type="button"
                    onClick={() => setUserEventEditor({ mode: "create", value: null })}
                    className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
                  >
                    Add event
                  </button>
                </div>
              ) : null}
              {userEvents.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
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
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)] backdrop-blur-sm">
                    <th className={`w-[165px] shrink-0 px-4 ${TABLE_PY_INNER}`}>Date & Time</th>
                    <th className={`min-w-0 px-4 text-center ${TABLE_PY_INNER}`}>Event</th>
                    <th className={`w-[110px] px-4 ${TABLE_PY_INNER}`}>IP</th>
                    <th className={`w-[80px] px-4 ${TABLE_PY_INNER}`}>Country</th>
                    <th className={`w-[120px] px-4 ${TABLE_PY_INNER}`}>Device</th>
                    {canManageRelatedData ? (
                      <th className={`w-[150px] px-4 text-right ${TABLE_PY_INNER}`}>Action</th>
                    ) : null}
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
                        {canManageRelatedData ? (
                          <td className={`px-4 text-right ${TABLE_PY_INNER}`}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setUserEventEditor({ mode: "create", value: duplicatedUserEventSeed(evt) })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => setUserEventEditor({ mode: "edit", value: evt })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="w-full min-w-0">
              {userAlerts.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No linked alerts.
                  </div>
                </div>
              ) : (
                <>
              {linkedAlertDecisionFetchError ? (
                <p className="px-4 pb-2 text-sm text-rose-600" role="alert">
                  Could not load your alert decision context: {linkedAlertDecisionFetchError}
                </p>
              ) : null}
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
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)] backdrop-blur-sm">
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Alert ID</th>
                    <th className={`whitespace-nowrap px-3 text-right tabular-nums ${TABLE_PY_INNER}`}>Alert Date</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Type</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Severity</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Status</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {userAlerts.map((a, idx) => {
                    const latestDecisionRow = latestTraineeDecisionByAlertId[a.id];
                    const linkedStatusDisplay = isTraineeActor
                      ? displayStatusFromTraineeDecisionOnAlert(latestDecisionRow?.decision, a.status)
                      : (a.status ?? "");
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-200 text-slate-800 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                          idx % 2 === 1 ? "bg-slate-50/60" : ""
                        }`}
                      >
                        <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                          <Link
                            href={`/alerts/${a.id}`}
                            className="font-mono text-xs text-[var(--brand-700)] hover:underline"
                          >
                            {a.id}
                          </Link>
                        </td>
                        <td className={`whitespace-nowrap px-3 text-right text-slate-600 tabular-nums ${TABLE_PY_INNER}`}>
                          {formatDate(a.alert_date ?? a.created_at)}
                        </td>
                        <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                          <span className={`ui-badge text-[11px] ${linkedAlertTypeBadgeClass(getAlertType(a))}`}>
                            {getAlertType(a) ? normalizeStr(getAlertType(a)).toUpperCase() : "—"}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                          <span className={`ui-badge text-[11px] ${linkedAlertSeverityBadgeClass(a.severity)}`}>
                            {toTitleCase(a.severity)}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>
                          <span
                            className={`ui-badge text-[11px] ${linkedAlertStatusBadgeClass(linkedStatusDisplay)}`}
                          >
                            {toTitleCase(linkedStatusDisplay)}
                          </span>
                        </td>
                        <td className={`min-w-0 px-3 ${TABLE_PY_INNER} whitespace-normal break-words`} title={getAlertDescription(a)}>
                          {getAlertDescription(a)}
                        </td>
                      </tr>
                    );
                  })}
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
                  {canManageRelatedData ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setInternalNoteEditor({ mode: "create", value: null })}
                        className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
                      >
                        Add note
                      </button>
                    </div>
                  ) : null}
                  {internalNotesLoadError ? (
                    <p className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Could not load internal notes: {internalNotesLoadError}. In Supabase, ensure{" "}
                      <span className="font-mono">internal_notes</span> allows <span className="font-mono">select</span> for{" "}
                      <span className="font-mono">authenticated</span> (see <span className="font-mono">supabase/schema.sql</span>
                      ).
                    </p>
                  ) : null}
                  {predefinedNotes.length === 0 ? (
                    <p className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No predefined notes for this profile.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {predefinedNotes.map((note) => (
                        <li key={note.id} className="content-panel p-3 text-sm text-slate-800">
                          <div className="mb-1 flex flex-wrap items-start justify-between gap-2 text-[10px] text-slate-500">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{note.created_by ?? "—"}</span>
                              <span className="tabular-nums">{formatDateTime(note.updated_at ?? note.created_at)}</span>
                            </div>
                            {canManageRelatedData ? (
                              <button
                                type="button"
                                onClick={() => setInternalNoteEditor({ mode: "edit", value: note })}
                                className="rounded-[0.75rem] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-700)]"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                          <p className="whitespace-pre-wrap text-slate-900">{note.note_text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {transactionEditor ? (
        <ModalShell
          title={
            transactionEditor.mode === "edit"
              ? "Edit Transaction"
              : transactionEditor.mode === "duplicate"
                ? "Duplicate Transaction"
                : "Add Transaction"
          }
          description={
            transactionEditor.mode === "duplicate"
              ? "Start from an existing transaction, adjust the fields you need, and save it as a new record."
              : "Maintain the full transaction details used in the simulator profile."
          }
          onClose={() => setTransactionEditor(null)}
        >
          <SimulatorTransactionForm
            viewer={appUser}
            mode={transactionEditor.mode === "edit" ? "edit" : "create"}
            userId={user.id}
            paymentMethods={paymentMethods}
            initialValue={transactionEditor.value}
            submitLabel={
              transactionEditor.mode === "edit"
                ? "Save transaction"
                : transactionEditor.mode === "duplicate"
                  ? "Create duplicate"
                  : "Create transaction"
            }
            onSaved={() => {
              setTransactionEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onDeleted={() => {
              setTransactionEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onCancel={() => setTransactionEditor(null)}
          />
        </ModalShell>
      ) : null}

      {paymentMethodEditor ? (
        <ModalShell
          title={paymentMethodEditor.mode === "create" ? "Add Payment Method" : "Edit Payment Method"}
          description="Update the top-level payment method record for this simulator user."
          onClose={() => setPaymentMethodEditor(null)}
        >
          <SimulatorPaymentMethodForm
            viewer={appUser}
            mode={paymentMethodEditor.mode}
            userId={user.id}
            initialValue={paymentMethodEditor.value}
            submitLabel={paymentMethodEditor.mode === "create" ? "Create method" : "Save method"}
            onSaved={() => {
              setPaymentMethodEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onDeleted={() => {
              setPaymentMethodEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onCancel={() => setPaymentMethodEditor(null)}
          />
        </ModalShell>
      ) : null}

      {userEventEditor ? (
        <ModalShell
          title={userEventEditor.mode === "create" ? "Add Activity Event" : "Edit Activity Event"}
          description="These events feed the device and IP surfaces in Access & Links."
          onClose={() => setUserEventEditor(null)}
        >
          <SimulatorUserEventForm
            viewer={appUser}
            mode={userEventEditor.mode}
            userId={user.id}
            linkedDeviceOptions={linkedDeviceOptions.map(({ value, label }) => ({ value, label }))}
            linkedDeviceNameById={Object.fromEntries(
              linkedDeviceOptions.map((device) => [device.value, device.deviceName])
            )}
            initialValue={userEventEditor.value}
            submitLabel={userEventEditor.mode === "create" ? "Create event" : "Save event"}
            onSaved={() => {
              setUserEventEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onDeleted={() => {
              setUserEventEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onCancel={() => setUserEventEditor(null)}
          />
        </ModalShell>
      ) : null}

      {accountLinkEditor ? (
        <ModalShell
          title={accountLinkEditor.mode === "create" ? "Add Linked Account" : "Edit Linked Account"}
          description="Link another simulator user to this profile and capture the analyst reason."
          onClose={() => setAccountLinkEditor(null)}
          widthClassName="max-w-2xl"
        >
          <UserAccountLinkForm
            viewer={appUser}
            mode={accountLinkEditor.mode}
            currentUserId={user.id}
            initialValue={accountLinkEditor.value}
            submitLabel={accountLinkEditor.mode === "create" ? "Create link" : "Save link"}
            onSaved={() => {
              setAccountLinkEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onDeleted={() => {
              setAccountLinkEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onCancel={() => setAccountLinkEditor(null)}
          />
        </ModalShell>
      ) : null}

      {internalNoteEditor ? (
        <ModalShell
          title={internalNoteEditor.mode === "create" ? "Add Predefined Note" : "Edit Predefined Note"}
          description="These notes stay on the simulator profile and are separate from private notes and review thread notes."
          onClose={() => setInternalNoteEditor(null)}
          widthClassName="max-w-2xl"
        >
          <InternalNoteForm
            viewer={appUser}
            mode={internalNoteEditor.mode}
            userId={user.id}
            initialValue={internalNoteEditor.value}
            submitLabel={internalNoteEditor.mode === "create" ? "Create note" : "Save note"}
            onSaved={() => {
              setInternalNoteEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onDeleted={() => {
              setInternalNoteEditor(null);
              setReloadTick((n) => n + 1);
            }}
            onCancel={() => setInternalNoteEditor(null)}
          />
        </ModalShell>
      ) : null}

    </section>
  );
}
