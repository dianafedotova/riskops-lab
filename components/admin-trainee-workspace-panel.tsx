"use client";

import { formatAlertStatusForList, formatDate } from "@/lib/format";
import { listAssignedAlertsForTrainee, type TraineeAssignedAlertRow } from "@/lib/services/assignments";
import { listWatchlistUsersForTrainee, type TraineeWatchedUserRow } from "@/lib/services/watchlist";
import { createClient } from "@/lib/supabase";
import { formatTraineeCasePhaseLabel, loadTraineeCasesAndKpi, type TraineeCaseRow } from "@/lib/trainee-cases";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type WorkspaceTab = "alerts" | "watchlist" | "cases";

const TAB_OPTIONS: { value: WorkspaceTab; label: string }[] = [
  { value: "cases", label: "Cases" },
  { value: "alerts", label: "Alerts" },
  { value: "watchlist", label: "Watchlist" },
];

function paginationRange(totalPages: number, page: number): number[] {
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, start + 2);
  const normalizedStart = Math.max(1, end - 2);
  return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
}

export function AdminTraineeWorkspacePanel({ traineeAppUserId }: { traineeAppUserId: string }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("cases");
  const [alerts, setAlerts] = useState<TraineeAssignedAlertRow[]>([]);
  const [watchlist, setWatchlist] = useState<TraineeWatchedUserRow[]>([]);
  const [cases, setCases] = useState<TraineeCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<Record<WorkspaceTab, boolean>>({
    alerts: false,
    watchlist: false,
    cases: false,
  });
  const [pages, setPages] = useState<Record<WorkspaceTab, number>>({
    alerts: 1,
    watchlist: 1,
    cases: 1,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const [alertsResult, watchlistResult, casesResult] = await Promise.all([
        listAssignedAlertsForTrainee(supabase, traineeAppUserId),
        listWatchlistUsersForTrainee(supabase, traineeAppUserId),
        loadTraineeCasesAndKpi(supabase, traineeAppUserId, { threadLimit: null }),
      ]);

      if (cancelled) return;

      const nextError =
        alertsResult.error?.message ?? watchlistResult.error?.message ?? casesResult.error ?? null;
      setError(nextError);
      setAlerts(alertsResult.alerts);
      setWatchlist(watchlistResult.users);
      setCases(casesResult.cases);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [traineeAppUserId]);

  const currentExpanded = expandedTabs[activeTab];
  const pageSize = currentExpanded ? 20 : 5;

  const activeItems = useMemo(() => {
    if (activeTab === "alerts") return alerts;
    if (activeTab === "watchlist") return watchlist;
    return cases.filter((c) => c.casePhase !== "draft");
  }, [activeTab, alerts, watchlist, cases]);

  const totalPages = Math.max(1, Math.ceil(activeItems.length / (currentExpanded ? 20 : activeItems.length || 1)));
  const currentPage = currentExpanded ? Math.min(pages[activeTab], totalPages) : 1;
  const start = currentExpanded ? (currentPage - 1) * 20 : 0;
  const visibleItems = activeItems.slice(start, start + pageSize);

  const showMore = activeItems.length > 5 && !currentExpanded;
  const showPagination = currentExpanded && activeItems.length > 20;
  const pageButtons = paginationRange(totalPages, currentPage);

  return (
    <section className="workspace-shell space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="heading-section">Trainee&apos;s Cases</h2>
        </div>
        <div className="inline-flex rounded-[0.85rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(244,248,251,0.96),rgba(236,243,248,0.96))] p-[2px] shadow-[inset_0_1px_2px_rgba(169,188,201,0.18)]">
          {TAB_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveTab(option.value)}
              className={`rounded-[0.7rem] px-3 py-[0.42rem] text-sm font-medium transition ${
                activeTab === option.value
                  ? "border border-[rgba(20,63,67,0.92)] bg-[linear-gradient(180deg,rgba(41,95,101,0.98),rgba(28,77,82,0.98))] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(11,32,35,0.28)]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[5.25rem] animate-pulse rounded-[1rem] border border-slate-200/80 bg-slate-100/80"
            />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
          Nothing to show in this tab yet.
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === "alerts"
            ? (visibleItems as TraineeAssignedAlertRow[]).map((alert) => (
                <div
                  key={alert.id}
                  className="content-panel flex flex-nowrap items-center justify-between gap-3 p-3.5"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
                    <Link
                      href={`/alerts/${alert.id}`}
                      className="min-w-0 shrink font-semibold text-[var(--brand-700)] hover:underline"
                    >
                      Alert {alert.id}
                    </Link>
                    <span className="shrink-0 text-slate-500">-</span>
                    <span className="min-w-0 text-sm text-slate-600">{formatAlertStatusForList(alert.status)}</span>
                  </div>
                  <span className="shrink-0 text-[0.76rem] tabular-nums text-slate-500">
                    {formatDate(alert.created_at)}
                  </span>
                </div>
              ))
            : null}

          {activeTab === "watchlist"
            ? (visibleItems as TraineeWatchedUserRow[]).map((user) => (
                <div key={user.id} className="content-panel flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <Link href={`/users/${user.id}`} className="truncate text-sm font-semibold text-[var(--brand-700)] hover:underline">
                      {user.full_name?.trim() || user.email?.trim() || user.id}
                    </Link>
                    <p className="truncate text-sm text-slate-500">{user.email ?? user.id}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">{user.id.slice(0, 8)}</span>
                </div>
              ))
            : null}

          {activeTab === "cases"
            ? (visibleItems as TraineeCaseRow[]).map((row) => (
                <div key={row.threadId} className="content-panel p-3.5">
                  <div className="flex flex-nowrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
                      <Link
                        href={row.targetHref}
                        className="min-w-0 shrink font-semibold text-[var(--brand-700)] hover:underline"
                      >
                        {row.targetLabel}
                      </Link>
                      <span className="shrink-0 text-slate-500">-</span>
                      <span className="min-w-0 text-sm text-slate-600">
                        {formatTraineeCasePhaseLabel(row.casePhase)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[0.76rem] tabular-nums text-slate-500">
                      {formatDate(row.updatedAt)}
                    </span>
                  </div>
                </div>
              ))
            : null}
        </div>
      )}

      {showMore ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => {
              setExpandedTabs((prev) => ({ ...prev, [activeTab]: true }));
              setPages((prev) => ({ ...prev, [activeTab]: 1 }));
            }}
            className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-3.5 py-2 text-sm shadow-none"
          >
            Show 20
          </button>
        </div>
      ) : null}

      {showPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, activeItems.length)} of {activeItems.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPages((prev) => ({ ...prev, [activeTab]: Math.max(1, currentPage - 1) }))}
              disabled={currentPage === 1}
              className="ui-btn ui-btn-secondary min-h-0 rounded-[0.85rem] px-3 py-1.5 text-xs shadow-none disabled:opacity-50"
            >
              Prev
            </button>
            {pageButtons.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setPages((prev) => ({ ...prev, [activeTab]: page }))}
                className={`inline-flex min-h-0 min-w-[2.15rem] items-center justify-center rounded-[0.8rem] border px-2.5 py-1.5 text-xs font-semibold ${
                  page === currentPage
                    ? "border-[rgba(20,63,67,0.92)] bg-[linear-gradient(180deg,rgba(41,95,101,0.98),rgba(28,77,82,0.98))] text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPages((prev) => ({ ...prev, [activeTab]: Math.min(totalPages, currentPage + 1) }))}
              disabled={currentPage === totalPages}
              className="ui-btn ui-btn-secondary min-h-0 rounded-[0.85rem] px-3 py-1.5 text-xs shadow-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
