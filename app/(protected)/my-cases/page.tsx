"use client";

import { FilterSelect } from "@/components/filter-select";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { useCurrentUser } from "@/components/current-user-provider";
import { formatAlertStatusForList, formatDate } from "@/lib/format";
import { canSeeTraineeWorkspace } from "@/lib/permissions/checks";
import { listAssignedAlertsForTrainee, unassignAlertFromTraineeSelf } from "@/lib/services/assignments";
import { createClient } from "@/lib/supabase";
import { TABLE_PY } from "@/lib/table-padding";
import { simulatorUserStatusBadgeClass, traineeCasePhaseBadgeClass } from "@/lib/trainee-case-badges";
import {
  filterTraineeCasesForWorkspace,
  formatTraineeCasePhaseLabel,
  loadTraineeCasesAndKpi,
  parseWorkspaceCasePhaseParam,
  parseWorkspaceCaseTypeParam,
  sortTraineeCasesByUpdatedAt,
  type TraineeCaseRow,
} from "@/lib/trainee-cases";
import { formatPostgrestError } from "@/lib/trainee-user-watchlist";
import { listWatchlistUsersForTrainee, removeSimulatorUserFromWatchlist } from "@/lib/services/watchlist";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type MyAlertRow = {
  id: string;
  internal_id?: string | null;
  user_id: string | null;
  status: string | null;
  severity: string | null;
  alert_type: string | null;
  created_at: string;
  assignment_source: "self" | "staff" | "self_and_staff";
  priority: "low" | "normal" | "high" | "urgent" | null;
  due_at: string | null;
  assignment_created_at: string;
};

type WatchedUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
};

type WorkspaceTab = "alerts" | "watchlist" | "cases";

const TAB_OPTIONS = [
  { value: "cases" as const, label: "Cases" },
  { value: "alerts" as const, label: "Alerts" },
  { value: "watchlist" as const, label: "Watchlist" },
];

const ALERT_STATUS_FILTER = [
  { value: "all", label: "All alert statuses" },
  { value: "Open", label: "Open" },
  { value: "Monitoring", label: "Monitoring" },
  { value: "Escalated", label: "Escalated" },
  { value: "Closed", label: "Closed" },
] as const;

const USER_STATUS_FILTER = [
  { value: "all", label: "All user statuses" },
  { value: "active", label: "Active" },
  { value: "not_active", label: "Not active" },
  { value: "restricted", label: "Restricted" },
  { value: "blocked", label: "Blocked" },
  { value: "closed", label: "Closed" },
] as const;

const CASE_TYPE_FILTER = [
  { value: "all", label: "All types" },
  { value: "alert", label: "Alert" },
  { value: "user", label: "User" },
] as const;

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
] as const;

/** Shown in the Case phase dropdown (no aggregate "done" row — use Approved + Closed separately). */
const CASE_PHASE_MENU = [
  { value: "all", label: "All case phases" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "closed", label: "Closed" },
] as const;

/** Includes `done` so `?casePhase=done` in the URL still resolves the filter trigger label. */
const CASE_PHASE_OPTIONS = [
  ...CASE_PHASE_MENU,
  { value: "done", label: "Done (approved or closed)" },
] as const;

const ADMIN_SEGMENT_TRACK_CLASS =
  "inline-flex max-w-full flex-wrap rounded-[0.78rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(244,248,251,0.96),rgba(236,243,248,0.96))] p-[2px] shadow-[inset_0_1px_2px_rgba(169,188,201,0.18)]";

const ADMIN_SEGMENT_BTN_ACTIVE_CLASS =
  "rounded-[0.64rem] px-3 py-[0.42rem] text-[0.92rem] font-medium transition border border-[rgba(20,63,67,0.92)] bg-[linear-gradient(180deg,rgba(41,95,101,0.98),rgba(28,77,82,0.98))] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(11,32,35,0.28)]";

const ADMIN_SEGMENT_BTN_IDLE_CLASS =
  "rounded-[0.64rem] px-3 py-[0.42rem] text-[0.92rem] font-medium transition text-slate-500 hover:text-slate-700";

const DASHED_EMPTY_CLASS =
  "rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500";

function tabFromParam(v: string | null): WorkspaceTab {
  if (v === "alerts" || v === "watchlist" || v === "cases") return v;
  return "cases";
}

function normalizeStr(v: unknown) {
  return (v == null ? "" : String(v)).trim().toLowerCase();
}

function formatAccountStatusLabel(status: string | null | undefined) {
  const raw = status ?? "";
  const v = normalizeStr(raw);
  if (!v) return "—";
  if (v === "active") return "Active";
  if (v === "restricted") return "Restricted";
  if (v === "blocked") return "Blocked";
  if (v === "closed") return "Closed";
  if (v === "not_active") return "Not Active";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function formatAssignmentSourceLabel(source: MyAlertRow["assignment_source"]) {
  if (source === "staff") return "Assigned by staff";
  if (source === "self_and_staff") return "Staff + self";
  return "Self-assigned";
}

function assignmentSourceBadgeClass(source: MyAlertRow["assignment_source"]) {
  if (source === "staff") return "ui-badge-blue";
  if (source === "self_and_staff") return "ui-badge-teal";
  return "ui-badge-neutral";
}

function assignmentPriorityBadgeClass(priority: MyAlertRow["priority"]) {
  if (priority === "urgent") return "ui-badge-rose";
  if (priority === "high") return "ui-badge-amber";
  if (priority === "low") return "ui-badge-neutral";
  return "ui-badge-blue";
}

function canUnassignSelf(source: MyAlertRow["assignment_source"]) {
  return source === "self" || source === "self_and_staff";
}

export default function MyCasesPage() {
  const { appUser, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canView = canSeeTraineeWorkspace(appUser?.role);

  const tab = tabFromParam(searchParams.get("tab"));
  const casePhase = parseWorkspaceCasePhaseParam(searchParams.get("casePhase"));
  const caseType = parseWorkspaceCaseTypeParam(searchParams.get("caseType"));
  const alertStatus = (searchParams.get("alertStatus") ?? "all").trim() || "all";
  const userStatus = (searchParams.get("userStatus") ?? "all").trim().toLowerCase() || "all";
  const q = searchParams.get("q") ?? "";

  const [myAlerts, setMyAlerts] = useState<MyAlertRow[]>([]);
  const [watchedUsers, setWatchedUsers] = useState<WatchedUserRow[]>([]);
  const [cases, setCases] = useState<TraineeCaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchBusyId, setWatchBusyId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(q);
  const [alertsQuery, setAlertsQuery] = useState("");
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [listPage, setListPage] = useState(1);
  const [unassignBusyId, setUnassignBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSearch(q);
  }, [q]);

  const loadAll = useCallback(async () => {
    if (!appUser || !canView) {
      setMyAlerts([]);
      setWatchedUsers([]);
      setCases([]);
      return;
    }
    const supabase = createClient();
    setLoading(true);
    setError(null);
    const errs: string[] = [];
    try {
      try {
        const { alerts, error: e } = await listAssignedAlertsForTrainee(supabase, appUser.id);
        if (e) throw e;
        setMyAlerts(alerts as MyAlertRow[]);
      } catch (e) {
        errs.push(`My alerts: ${formatPostgrestError(e)}`);
        setMyAlerts([]);
      }
      try {
        const { users, error: e } = await listWatchlistUsersForTrainee(supabase, appUser.id);
        if (e) throw e;
        setWatchedUsers(users as WatchedUserRow[]);
      } catch (e) {
        errs.push(`Watchlist: ${formatPostgrestError(e)}`);
        setWatchedUsers([]);
      }
      try {
        const { cases: rows, error: ce } = await loadTraineeCasesAndKpi(supabase, appUser.id, {
          threadLimit: null,
        });
        if (ce) {
          errs.push(`Cases: ${ce}`);
          setCases([]);
        } else {
          setCases(rows);
        }
      } catch (e) {
        errs.push(`Cases: ${formatPostgrestError(e)}`);
        setCases([]);
      }
      setError(errs.length ? errs.join(" · ") : null);
    } finally {
      setLoading(false);
    }
  }, [appUser, canView]);

  useEffect(() => {
    if (userLoading) return;
    void loadAll();
  }, [userLoading, loadAll]);

  useEffect(() => {
    setListPage(1);
  }, [tab, alertsQuery, watchlistQuery, casePhase, caseType, alertStatus, userStatus, q]);

  const setQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, val] of Object.entries(updates)) {
        if (val == null || val === "") next.delete(k);
        else next.set(k, val);
      }
      const qs = next.toString();
      router.push(qs ? `/my-cases?${qs}` : "/my-cases");
    },
    [router, searchParams]
  );

  const onTabChange = (nextTab: WorkspaceTab) => {
    setQuery({ tab: nextTab === "cases" ? null : nextTab });
  };

  const filteredCases = useMemo(() => {
    return sortTraineeCasesByUpdatedAt(
      filterTraineeCasesForWorkspace(cases, {
        phase: casePhase,
        caseType,
        alertStatus,
        userStatus,
        searchQuery: q,
      })
    );
  }, [cases, casePhase, caseType, alertStatus, userStatus, q]);

  const filteredAlerts = useMemo(() => {
    const qq = alertsQuery.trim().toLowerCase();
    if (!qq) return myAlerts;
    return myAlerts.filter(
      (a) => normalizeStr(a.id).includes(qq) || normalizeStr(a.user_id).includes(qq)
    );
  }, [myAlerts, alertsQuery]);

  const filteredWatchlist = useMemo(() => {
    const qq = watchlistQuery.trim().toLowerCase();
    if (!qq) return watchedUsers;
    return watchedUsers.filter(
      (u) =>
        normalizeStr(u.id).includes(qq) ||
        normalizeStr(u.email).includes(qq) ||
        normalizeStr(u.full_name).includes(qq)
    );
  }, [watchedUsers, watchlistQuery]);

  const casesClearEnabled =
    casePhase !== "all" ||
    caseType !== "all" ||
    alertStatus !== "all" ||
    userStatus !== "all" ||
    q.trim().length > 0 ||
    localSearch.trim().length > 0;

  const alertsTotalPages = Math.max(1, Math.ceil(filteredAlerts.length / itemsPerPage));
  const alertsCurrentPage = Math.min(listPage, alertsTotalPages);
  const pagedAlerts = useMemo(() => {
    const start = (alertsCurrentPage - 1) * itemsPerPage;
    return filteredAlerts.slice(start, start + itemsPerPage);
  }, [filteredAlerts, alertsCurrentPage, itemsPerPage]);

  const watchTotalPages = Math.max(1, Math.ceil(filteredWatchlist.length / itemsPerPage));
  const watchCurrentPage = Math.min(listPage, watchTotalPages);
  const pagedWatchlist = useMemo(() => {
    const start = (watchCurrentPage - 1) * itemsPerPage;
    return filteredWatchlist.slice(start, start + itemsPerPage);
  }, [filteredWatchlist, watchCurrentPage, itemsPerPage]);

  const casesTotalPages = Math.max(1, Math.ceil(filteredCases.length / itemsPerPage));
  const casesCurrentPage = Math.min(listPage, casesTotalPages);
  const pagedCases = useMemo(() => {
    const start = (casesCurrentPage - 1) * itemsPerPage;
    return filteredCases.slice(start, start + itemsPerPage);
  }, [filteredCases, casesCurrentPage, itemsPerPage]);

  const removeFromWatchlist = useCallback(
    async (simulatorUserId: string) => {
      if (!appUser || !canView) return;
      setWatchBusyId(simulatorUserId);
      setError(null);
      try {
        const supabase = createClient();
        const { error: rmErr } = await removeSimulatorUserFromWatchlist(supabase, appUser.id, simulatorUserId);
        if (rmErr) throw rmErr;
        setWatchedUsers((prev) => prev.filter((row) => row.id !== simulatorUserId));
      } catch (e) {
        setError(formatPostgrestError(e) || "Could not update watchlist");
      } finally {
        setWatchBusyId(null);
      }
    },
    [appUser, canView]
  );

  const applySearchToUrl = () => {
    setQuery({ q: localSearch.trim() || null });
  };

  const copyAlertId = async (alertId: string) => {
    await navigator.clipboard.writeText(alertId);
    setCopiedAlertId(alertId);
    setTimeout(() => {
      setCopiedAlertId((cur) => (cur === alertId ? null : cur));
    }, 1500);
  };

  const copyUserId = async (userId: string) => {
    await navigator.clipboard.writeText(userId);
    setCopiedUserId(userId);
    setTimeout(() => {
      setCopiedUserId((cur) => (cur === userId ? null : cur));
    }, 1500);
  };

  const unassignSelf = async (alert: MyAlertRow) => {
    if (!appUser) return;
    setUnassignBusyId(alert.id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: uErr } = await unassignAlertFromTraineeSelf(supabase, appUser.id, {
        publicId: alert.id,
        internalId: alert.internal_id ?? null,
      });
      if (uErr) throw uErr;
      await loadAll();
    } catch (e) {
      setError(formatPostgrestError(e) || "Could not unassign this alert.");
    } finally {
      setUnassignBusyId(null);
    }
  };

  if (userLoading) {
    return (
      <div className="main-content-shell p-3 sm:p-5 md:p-6">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="main-content-shell p-3 sm:p-5 md:p-6">
        <p className="text-sm text-slate-600">This page is only available with the trainee role.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm font-medium text-[var(--brand-700)] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="w-full min-w-0 space-y-4">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className={ADMIN_SEGMENT_TRACK_CLASS} role="tablist" aria-label="My Cases sections">
          {TAB_OPTIONS.map((opt) => {
            const active = tab === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(opt.value)}
                className={active ? ADMIN_SEGMENT_BTN_ACTIVE_CLASS : ADMIN_SEGMENT_BTN_IDLE_CLASS}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {tab === "alerts" ? (
          <>
            <div className="workspace-shell flex flex-col gap-3 p-4 sm:p-5">
              <div className="min-w-0 w-full max-w-md">
                <label htmlFor="my-cases-alerts-search" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
                  Search alerts
                </label>
                <input
                  id="my-cases-alerts-search"
                  type="text"
                  placeholder="Alert ID or user ID…"
                  value={alertsQuery}
                  onChange={(e) => setAlertsQuery(e.target.value)}
                  className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                />
              </div>
            </div>

            <div className="workspace-shell overflow-hidden p-0">
              <TableSwipeHint />
              <div className="scroll-x-touch">
                <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[55%]" />
                    <col className="w-[22%]" />
                    <col className="w-[23%]" />
                  </colgroup>
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                      <th className={`px-4 ${TABLE_PY}`}>Alert</th>
                      <th className={`px-4 ${TABLE_PY}`}>Assigned</th>
                      <th className={`px-4 text-right ${TABLE_PY}`}>Actions</th>
                    </tr>
                  </thead>
                  {loading ? (
                    <TableSkeleton rows={6} cols={3} />
                  ) : (
                    <tbody>
                      {filteredAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8">
                            <div className={DASHED_EMPTY_CLASS}>
                              {myAlerts.length === 0
                                ? "No alert assignments yet. Use “Assign to me” on an alert or wait for a staff assignment."
                                : "No alerts match your search."}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedAlerts.map((a, idx) => (
                          <tr
                            key={a.id}
                            className={`border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 ${
                              idx % 2 === 1 ? "bg-slate-50/60" : "bg-white/55"
                            }`}
                          >
                            <td className={`px-4 ${TABLE_PY}`}>
                              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                                <Link
                                  href={`/alerts/${a.id}`}
                                  className="min-w-0 shrink font-mono text-xs font-semibold text-[var(--brand-700)] hover:underline"
                                >
                                  Alert {a.id}
                                </Link>
                                <span className="shrink-0 text-slate-500">-</span>
                                <span className="min-w-0 text-sm text-slate-600">
                                  {formatAlertStatusForList(a.status)}
                                </span>
                                <span className={`ui-badge ${assignmentSourceBadgeClass(a.assignment_source)}`}>
                                  {formatAssignmentSourceLabel(a.assignment_source)}
                                </span>
                                {a.priority ? (
                                  <span className={`ui-badge ${assignmentPriorityBadgeClass(a.priority)}`}>
                                    {a.priority}
                                  </span>
                                ) : null}
                                {a.due_at ? <span className="ui-badge ui-badge-amber">Due {formatDate(a.due_at)}</span> : null}
                                <button
                                  type="button"
                                  onClick={() => void copyAlertId(a.id)}
                                  className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                  title={copiedAlertId === a.id ? "Copied" : "Copy alert ID"}
                                  aria-label={copiedAlertId === a.id ? "Copied alert ID" : "Copy alert ID"}
                                >
                                  {copiedAlertId === a.id ? (
                                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                      <path d="m3.5 8 2.6 2.6 6.4-6.4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                      <rect x="5" y="3.5" width="7" height="9" rx="1.3" />
                                      <path d="M3.5 10.5h-.3A1.7 1.7 0 0 1 1.5 8.8V3.2c0-.94.76-1.7 1.7-1.7h4.6c.94 0 1.7.76 1.7 1.7v.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className={`px-4 tabular-nums text-xs text-slate-500 ${TABLE_PY}`}>
                              <div className="space-y-1">
                                <p>Added {formatDate(a.assignment_created_at || a.created_at)}</p>
                                {a.due_at ? <p>Due {formatDate(a.due_at)}</p> : null}
                              </div>
                            </td>
                            <td className={`px-4 text-right ${TABLE_PY}`}>
                              {canUnassignSelf(a.assignment_source) ? (
                                <button
                                  type="button"
                                  disabled={unassignBusyId === a.id}
                                  onClick={() => void unassignSelf(a)}
                                  className="ui-btn ui-btn-secondary h-9 min-h-0 rounded-[0.65rem] px-3 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {unassignBusyId === a.id ? "…" : "Unassign"}
                                </button>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">Staff-managed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-600">
              <p>
                {loading
                  ? "…"
                  : filteredAlerts.length === 0
                    ? "Showing 0 of 0 alerts"
                    : `Showing ${(alertsCurrentPage - 1) * itemsPerPage + 1}-${Math.min(alertsCurrentPage * itemsPerPage, filteredAlerts.length)} of ${filteredAlerts.length} alert${filteredAlerts.length === 1 ? "" : "s"}`}
              </p>
              <div className="flex items-center gap-2">
                <span>Items per page</span>
                <FilterSelect
                  ariaLabel="Alerts items per page"
                  value={String(itemsPerPage)}
                  onChange={(nextValue) => {
                    setItemsPerPage(Number(nextValue));
                    setListPage(1);
                  }}
                  options={[...PAGE_SIZE_OPTIONS]}
                  className="ui-page-size min-w-[4.25rem]"
                  menuClassName="left-auto right-0 min-w-[4.5rem]"
                />
              </div>
              {alertsTotalPages > 1 ? (
                <div className="flex items-center gap-2">
                  {alertsCurrentPage > 1 ? (
                    <button type="button" onClick={() => setListPage((p) => Math.max(1, p - 1))} className="ui-pager-btn">
                      Previous
                    </button>
                  ) : null}
                  <button type="button" className="ui-pager-current">
                    {alertsCurrentPage}
                  </button>
                  <button
                    type="button"
                    disabled={alertsCurrentPage >= alertsTotalPages}
                    onClick={() => setListPage((p) => Math.min(alertsTotalPages, p + 1))}
                    className="ui-pager-btn"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {tab === "watchlist" ? (
          <>
            <div className="workspace-shell flex flex-col gap-3 p-4 sm:p-5">
              <div className="min-w-0 w-full max-w-md">
                <label htmlFor="my-cases-watch-search" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
                  Search watchlist
                </label>
                <input
                  id="my-cases-watch-search"
                  type="text"
                  placeholder="User ID, name, or email…"
                  value={watchlistQuery}
                  onChange={(e) => setWatchlistQuery(e.target.value)}
                  className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                />
              </div>
            </div>

            <div className="workspace-shell overflow-hidden p-0">
              <TableSwipeHint />
              <div className="scroll-x-touch">
                <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[18%]" />
                    <col className="w-[24%]" />
                    <col className="w-[16%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                      <th className={`px-4 ${TABLE_PY}`}>User ID</th>
                      <th className={`px-4 ${TABLE_PY}`}>Full name</th>
                      <th className={`px-4 ${TABLE_PY}`}>Email</th>
                      <th className={`px-4 ${TABLE_PY}`}>Account status</th>
                      <th className={`px-4 ${TABLE_PY}`}>Actions</th>
                    </tr>
                  </thead>
                  {loading ? (
                    <TableSkeleton rows={6} cols={5} />
                  ) : (
                    <tbody>
                      {filteredWatchlist.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8">
                            <div className={DASHED_EMPTY_CLASS}>
                              {watchedUsers.length === 0
                                ? "No users on your watchlist. Add one with “Watch user” on a simulator profile."
                                : "No users match your search."}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedWatchlist.map((u, idx) => (
                          <tr
                            key={u.id}
                            onClick={() => router.push(`/users/${u.id}`)}
                            className={`cursor-pointer border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-100/85 ${
                              idx % 2 === 1 ? "bg-slate-50/60" : "bg-white/55"
                            }`}
                          >
                            <td className={`px-4 font-mono text-xs text-slate-600 ${TABLE_PY}`}>
                              <div className="flex items-start gap-1.5">
                                <span className="min-w-0 break-all">{u.id}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void copyUserId(u.id);
                                  }}
                                  className="mt-0.5 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                  title={copiedUserId === u.id ? "Copied" : "Copy user ID"}
                                  aria-label={copiedUserId === u.id ? "Copied user ID" : "Copy user ID"}
                                >
                                  {copiedUserId === u.id ? (
                                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                      <path d="m3.5 8 2.6 2.6 6.4-6.4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                      <rect x="5" y="3.5" width="7" height="9" rx="1.3" />
                                      <path d="M3.5 10.5h-.3A1.7 1.7 0 0 1 1.5 8.8V3.2c0-.94.76-1.7 1.7-1.7h4.6c.94 0 1.7.76 1.7 1.7v.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className={`px-4 ${TABLE_PY}`}>{u.full_name?.trim() || "—"}</td>
                            <td className={`px-4 ${TABLE_PY} min-w-0 break-all`}>{u.email ?? "—"}</td>
                            <td className={`px-4 ${TABLE_PY}`}>
                              <span className={`ui-badge text-[11px] ${simulatorUserStatusBadgeClass(u.status)}`}>
                                {formatAccountStatusLabel(u.status)}
                              </span>
                            </td>
                            <td className={`px-4 ${TABLE_PY}`}>
                              <button
                                type="button"
                                disabled={watchBusyId === u.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void removeFromWatchlist(u.id);
                                }}
                                aria-label={`Unwatch ${u.full_name?.trim() || u.email || u.id}`}
                                className="ui-btn ui-btn-secondary h-9 min-h-0 rounded-[0.65rem] px-3 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {watchBusyId === u.id ? "…" : "Unwatch"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-600">
              <p>
                {loading
                  ? "…"
                  : filteredWatchlist.length === 0
                    ? "Showing 0 of 0 users"
                    : `Showing ${(watchCurrentPage - 1) * itemsPerPage + 1}-${Math.min(watchCurrentPage * itemsPerPage, filteredWatchlist.length)} of ${filteredWatchlist.length} user${filteredWatchlist.length === 1 ? "" : "s"}`}
              </p>
              <div className="flex items-center gap-2">
                <span>Items per page</span>
                <FilterSelect
                  ariaLabel="Watchlist items per page"
                  value={String(itemsPerPage)}
                  onChange={(nextValue) => {
                    setItemsPerPage(Number(nextValue));
                    setListPage(1);
                  }}
                  options={[...PAGE_SIZE_OPTIONS]}
                  className="ui-page-size min-w-[4.25rem]"
                  menuClassName="left-auto right-0 min-w-[4.5rem]"
                />
              </div>
              {watchTotalPages > 1 ? (
                <div className="flex items-center gap-2">
                  {watchCurrentPage > 1 ? (
                    <button type="button" onClick={() => setListPage((p) => Math.max(1, p - 1))} className="ui-pager-btn">
                      Previous
                    </button>
                  ) : null}
                  <button type="button" className="ui-pager-current">
                    {watchCurrentPage}
                  </button>
                  <button
                    type="button"
                    disabled={watchCurrentPage >= watchTotalPages}
                    onClick={() => setListPage((p) => Math.min(watchTotalPages, p + 1))}
                    className="ui-pager-btn"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {tab === "cases" ? (
          <>
            <div className="workspace-shell flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
                <div className="min-w-0 w-full max-w-md flex-1">
                  <label htmlFor="my-cases-cases-search" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
                    Search cases
                  </label>
                  <input
                    id="my-cases-cases-search"
                    type="search"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onBlur={() => applySearchToUrl()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearchToUrl();
                    }}
                    placeholder="Alert ID, name, email…"
                    className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-x-2.5 gap-y-2.5 sm:gap-x-3 lg:flex-nowrap lg:justify-end">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="pl-3 text-sm font-medium text-slate-600">Case phase</span>
                    <FilterSelect
                      ariaLabel="Case phase filter"
                      value={casePhase}
                      onChange={(v) => setQuery({ casePhase: v === "all" ? null : v })}
                      options={[...CASE_PHASE_OPTIONS]}
                      menuOptions={[...CASE_PHASE_MENU]}
                      className="w-[min(100%,12rem)] min-w-[10rem]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="pl-3 text-sm font-medium text-slate-600">Type</span>
                    <FilterSelect
                      ariaLabel="Case type filter"
                      value={caseType}
                      onChange={(v) => setQuery({ caseType: v === "all" ? null : v })}
                      options={[...CASE_TYPE_FILTER]}
                      className="w-[min(100%,9rem)] min-w-[7.5rem]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="pl-3 text-sm font-medium text-slate-600">Alert status</span>
                    <FilterSelect
                      ariaLabel="Related alert status"
                      value={alertStatus}
                      onChange={(v) => setQuery({ alertStatus: v === "all" ? null : v })}
                      options={[...ALERT_STATUS_FILTER]}
                      className="w-[min(100%,10rem)] min-w-[8rem]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="pl-3 text-sm font-medium text-slate-600">User status</span>
                    <FilterSelect
                      ariaLabel="Simulator user status"
                      value={userStatus}
                      onChange={(v) => setQuery({ userStatus: v === "all" ? null : v })}
                      options={[...USER_STATUS_FILTER]}
                      className="w-[min(100%,10rem)] min-w-[8rem]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearch("");
                      router.push("/my-cases");
                    }}
                    disabled={!casesClearEnabled}
                    className="ui-btn ui-btn-secondary ui-filter-reset h-10 min-h-0 shrink-0 self-end rounded-[0.65rem] px-4 text-sm font-medium disabled:cursor-default"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </div>

            <div className="workspace-shell overflow-hidden p-0">
              <TableSwipeHint />
              <div className="scroll-x-touch">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[36%]" />
                    <col className="w-[18%]" />
                    <col className="w-[14%]" />
                    <col className="w-[32%]" />
                  </colgroup>
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                      <th className={`px-4 ${TABLE_PY}`}>Case</th>
                      <th className={`px-4 ${TABLE_PY}`}>Phase</th>
                      <th className={`px-4 ${TABLE_PY}`}>Type</th>
                      <th className={`px-4 ${TABLE_PY}`}>Updated</th>
                    </tr>
                  </thead>
                  {loading ? (
                    <TableSkeleton rows={6} cols={4} />
                  ) : (
                    <tbody>
                      {filteredCases.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8">
                            <div className={DASHED_EMPTY_CLASS}>
                              {cases.length === 0
                                ? "Open Review from an alert or user to start a case."
                                : "No cases match the current filters."}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedCases.map((c, idx) => (
                          <tr
                            key={c.threadId}
                            onClick={() => router.push(c.targetHref)}
                            className={`cursor-pointer border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-100/85 ${
                              idx % 2 === 1 ? "bg-slate-50/60" : "bg-white/55"
                            }`}
                          >
                            <td className={`px-4 font-medium text-[var(--brand-700)] ${TABLE_PY} min-w-0`}>
                              <span className="hover:underline">{c.targetLabel}</span>
                            </td>
                            <td className={`px-4 ${TABLE_PY}`}>
                              <span className={`ui-badge text-[11px] ${traineeCasePhaseBadgeClass(c.casePhase)}`}>
                                {formatTraineeCasePhaseLabel(c.casePhase)}
                              </span>
                            </td>
                            <td className={`px-4 ${TABLE_PY}`}>
                              {c.alertPublicId ? (
                                <span className="ui-badge text-[11px] ui-badge-blue">Alert</span>
                              ) : c.profileUserId ? (
                                <span className="ui-badge text-[11px] ui-badge-indigo">User</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className={`px-4 tabular-nums text-xs text-slate-500 ${TABLE_PY}`}>
                              {formatDate(c.updatedAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  )}
                </table>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-600">
              <p>
                {loading
                  ? "…"
                  : filteredCases.length === 0
                    ? "Showing 0 of 0 cases"
                    : `Showing ${(casesCurrentPage - 1) * itemsPerPage + 1}-${Math.min(casesCurrentPage * itemsPerPage, filteredCases.length)} of ${filteredCases.length} case${filteredCases.length === 1 ? "" : "s"}`}
                {cases.length !== filteredCases.length && filteredCases.length > 0
                  ? ` (${cases.length} total loaded)`
                  : null}
              </p>
              <div className="flex items-center gap-2">
                <span>Items per page</span>
                <FilterSelect
                  ariaLabel="Cases items per page"
                  value={String(itemsPerPage)}
                  onChange={(nextValue) => {
                    setItemsPerPage(Number(nextValue));
                    setListPage(1);
                  }}
                  options={[...PAGE_SIZE_OPTIONS]}
                  className="ui-page-size min-w-[4.25rem]"
                  menuClassName="left-auto right-0 min-w-[4.5rem]"
                />
              </div>
              {casesTotalPages > 1 ? (
                <div className="flex items-center gap-2">
                  {casesCurrentPage > 1 ? (
                    <button type="button" onClick={() => setListPage((p) => Math.max(1, p - 1))} className="ui-pager-btn">
                      Previous
                    </button>
                  ) : null}
                  <button type="button" className="ui-pager-current">
                    {casesCurrentPage}
                  </button>
                  <button
                    type="button"
                    disabled={casesCurrentPage >= casesTotalPages}
                    onClick={() => setListPage((p) => Math.min(casesTotalPages, p + 1))}
                    className="ui-pager-btn"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
