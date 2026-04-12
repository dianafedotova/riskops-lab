"use client";

import { formatDate } from "@/lib/format";
import { useCurrentUser } from "@/components/current-user-provider";
import { canSeeTraineeWorkspace } from "@/lib/permissions/checks";
import { createClient } from "@/lib/supabase";
import { getAmplitudeNavigationSource, trackTraineeEvent } from "@/lib/amplitude";
import { listAssignedAlertsForTrainee, unassignAlertFromTraineeSelf } from "@/lib/services/assignments";
import { listWatchlistUsersForTrainee, removeSimulatorUserFromWatchlist } from "@/lib/services/watchlist";
import {
  filterActiveCases,
  formatTraineeCasePhaseLabel,
  loadTraineeCasesAndKpi,
  sortTraineeCasesByUpdatedAt,
  type TraineeCaseRow,
  type TraineeCaseKpiCounts,
} from "@/lib/trainee-cases";
import { formatPostgrestError } from "@/shared/lib/postgrest";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
};

const KPI_STAT_TILE_CLASS =
  "surface-lift flex flex-col gap-1 rounded-[1rem] border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm";

/** Same as Drafts / Review cases section titles on alert & user review pages. */
const DASHBOARD_COLUMN_TITLE_CLASS =
  "text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]";

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

export default function DashboardPage() {
  const { appUser, loading: userLoading } = useCurrentUser();
  const [myAlerts, setMyAlerts] = useState<MyAlertRow[]>([]);
  const [watchedUsers, setWatchedUsers] = useState<WatchedUserRow[]>([]);
  const [cases, setCases] = useState<TraineeCaseRow[]>([]);
  const [kpi, setKpi] = useState<TraineeCaseKpiCounts>({
    initiated: 0,
    underReview: 0,
    needsAttention: 0,
    done: 0,
  });
  const [traineeLoading, setTraineeLoading] = useState(false);
  const [traineeError, setTraineeError] = useState<string | null>(null);
  const [watchRemoveBusyId, setWatchRemoveBusyId] = useState<string | null>(null);
  const [alertUnassignBusyId, setAlertUnassignBusyId] = useState<string | null>(null);
  const canViewTraineeWorkspace = canSeeTraineeWorkspace(appUser?.role);

  const loadTraineeSections = useCallback(async () => {
    if (!appUser || !canViewTraineeWorkspace) {
      setMyAlerts([]);
      setWatchedUsers([]);
      setCases([]);
      setKpi({ initiated: 0, underReview: 0, needsAttention: 0, done: 0 });
      return;
    }
    const supabase = createClient();
    setTraineeLoading(true);
    setTraineeError(null);
    const sectionErrors: string[] = [];

    try {
      try {
        const { alerts, error } = await listAssignedAlertsForTrainee(supabase, appUser.id);
        if (error) throw error;
        setMyAlerts(alerts as MyAlertRow[]);
      } catch (e) {
        sectionErrors.push(`Alerts: ${formatPostgrestError(e)}`);
        setMyAlerts([]);
      }

      try {
        const { users, error } = await listWatchlistUsersForTrainee(supabase, appUser.id);
        if (error) throw error;
        setWatchedUsers(users as WatchedUserRow[]);
      } catch (e) {
        sectionErrors.push(`Watched users: ${formatPostgrestError(e)}`);
        setWatchedUsers([]);
      }

      try {
        const { cases: caseRows, kpi: kpiCounts, error: caseErr } = await loadTraineeCasesAndKpi(
          supabase,
          appUser.id,
          { threadLimit: null }
        );
        if (caseErr) {
          sectionErrors.push(`Cases: ${caseErr}`);
          setCases([]);
          setKpi({ initiated: 0, underReview: 0, needsAttention: 0, done: 0 });
        } else {
          setCases(caseRows);
          setKpi(kpiCounts);
        }
      } catch (e) {
        sectionErrors.push(`Cases: ${formatPostgrestError(e)}`);
        setCases([]);
        setKpi({ initiated: 0, underReview: 0, needsAttention: 0, done: 0 });
      }

      setTraineeError(sectionErrors.length > 0 ? sectionErrors.join(" · ") : null);
    } finally {
      setTraineeLoading(false);
    }
  }, [appUser, canViewTraineeWorkspace]);

  const removeSimulatorFromWatchlist = useCallback(async (simulatorUserId: string) => {
    if (!appUser || !canViewTraineeWorkspace) return;
    setWatchRemoveBusyId(simulatorUserId);
    setTraineeError(null);
    try {
      const supabase = createClient();
      const { error } = await removeSimulatorUserFromWatchlist(supabase, appUser.id, simulatorUserId);
      if (error) throw error;
      setWatchedUsers((prev) => prev.filter((row) => row.id !== simulatorUserId));
    } catch (e) {
      setTraineeError(formatPostgrestError(e) || "Could not remove user from watchlist");
    } finally {
      setWatchRemoveBusyId(null);
    }
  }, [appUser, canViewTraineeWorkspace]);

  const unassignAlertSelf = useCallback(
    async (alert: MyAlertRow) => {
      if (!appUser || !canViewTraineeWorkspace) return;
      setAlertUnassignBusyId(alert.id);
      setTraineeError(null);
      try {
        const supabase = createClient();
        const { error } = await unassignAlertFromTraineeSelf(supabase, appUser.id, {
          publicId: alert.id,
          internalId: alert.internal_id ?? null,
        });
        if (error) throw error;
        await loadTraineeSections();
      } catch (e) {
        setTraineeError(formatPostgrestError(e) || "Could not unassign this alert.");
      } finally {
        setAlertUnassignBusyId(null);
      }
    },
    [appUser, canViewTraineeWorkspace, loadTraineeSections]
  );

  useEffect(() => {
    if (userLoading) return;
    void loadTraineeSections();
  }, [userLoading, loadTraineeSections]);

  useEffect(() => {
    if (!canViewTraineeWorkspace) return;
    trackTraineeEvent(appUser?.role, "dashboard_viewed", {
      is_first_time: false,
      source: getAmplitudeNavigationSource(),
    });
  }, [appUser?.role, canViewTraineeWorkspace]);

  const dashboardCases = sortTraineeCasesByUpdatedAt(filterActiveCases(cases)).slice(0, 5);

  return (
    <div className="main-content-shell p-3 sm:p-5 md:p-6">
      <div className="space-y-5">
        {canViewTraineeWorkspace ? (
          <section className="workspace-stage surface-lift space-y-5 p-5 sm:p-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">My Cases</h2>
            {traineeError ? <p className="text-sm text-rose-600">{traineeError}</p> : null}
            {userLoading || traineeLoading ? (
              <p className="text-sm text-slate-600">Loading your assignments…</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={KPI_STAT_TILE_CLASS} aria-label={`Initiated cases: ${kpi.initiated}`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Initiated</span>
                    <span className="text-2xl font-semibold tabular-nums text-slate-900">{kpi.initiated}</span>
                  </div>
                  <div className={KPI_STAT_TILE_CLASS} aria-label={`Cases under review: ${kpi.underReview}`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Under review</span>
                    <span className="text-2xl font-semibold tabular-nums text-slate-900">{kpi.underReview}</span>
                  </div>
                  <div className={KPI_STAT_TILE_CLASS} aria-label={`Cases needing your attention: ${kpi.needsAttention}`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Needs your attention</span>
                    <span className="text-2xl font-semibold tabular-nums text-slate-900">{kpi.needsAttention}</span>
                  </div>
                  <div className={KPI_STAT_TILE_CLASS} aria-label={`Completed cases: ${kpi.done}`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Done</span>
                    <span className="text-2xl font-semibold tabular-nums text-slate-900">{kpi.done}</span>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <article className="evidence-shell surface-lift p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={DASHBOARD_COLUMN_TITLE_CLASS}>Alerts</h3>
                      <Link href="/my-cases?tab=alerts" className="text-xs font-medium text-[var(--brand-700)] hover:underline">
                        View all
                      </Link>
                    </div>
                    {myAlerts.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        No alert assignments yet. Use “Assign to me” on an alert or wait for a staff assignment.
                      </p>
                    ) : (
                      <ul className="mt-3 divide-y divide-slate-200/80 border-t border-slate-200/80 text-sm">
                        {myAlerts.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/alerts/${a.id}`}
                                className="min-w-0 truncate font-semibold text-[var(--brand-700)] hover:underline"
                              >
                                Alert {a.id}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className={`ui-badge ${assignmentSourceBadgeClass(a.assignment_source)}`}>
                                  {formatAssignmentSourceLabel(a.assignment_source)}
                                </span>
                                {a.priority ? (
                                  <span className={`ui-badge ${assignmentPriorityBadgeClass(a.priority)}`}>
                                    {a.priority}
                                  </span>
                                ) : null}
                                {a.due_at ? <span className="ui-badge ui-badge-amber">Due {formatDate(a.due_at)}</span> : null}
                              </div>
                            </div>
                            {canUnassignSelf(a.assignment_source) ? (
                              <button
                                type="button"
                                disabled={alertUnassignBusyId === a.id}
                                onClick={() => void unassignAlertSelf(a)}
                                className="ui-btn ui-btn-secondary h-auto min-h-0 shrink-0 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {alertUnassignBusyId === a.id ? "…" : "Unassign"}
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">Staff-managed</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                  <article className="evidence-shell surface-lift p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={DASHBOARD_COLUMN_TITLE_CLASS}>Watchlist</h3>
                      <Link href="/my-cases?tab=watchlist" className="text-xs font-medium text-[var(--brand-700)] hover:underline">
                        View all
                      </Link>
                    </div>
                    {watchedUsers.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        No users on your watchlist. Add one with “Watch user” on a simulator profile. Remove entries here with Unwatch.
                      </p>
                    ) : (
                      <ul className="mt-3 divide-y divide-slate-200/80 border-t border-slate-200/80 text-sm">
                        {watchedUsers.map((u) => (
                          <li key={u.id} className="flex items-center justify-between gap-2 py-2.5">
                            <Link
                              href={`/users/${u.id}`}
                              className="min-w-0 truncate font-semibold text-[var(--brand-700)] hover:underline"
                            >
                              {u.full_name?.trim() || u.email || u.id}
                            </Link>
                            <button
                              type="button"
                              disabled={watchRemoveBusyId === u.id}
                              onClick={() => void removeSimulatorFromWatchlist(u.id)}
                              aria-label={`Unwatch ${u.full_name?.trim() || u.email || u.id}`}
                              className="ui-btn ui-btn-secondary h-auto min-h-0 shrink-0 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {watchRemoveBusyId === u.id ? "…" : "Unwatch"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                  <article className="evidence-shell surface-lift p-5 xl:col-span-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={DASHBOARD_COLUMN_TITLE_CLASS}>Cases</h3>
                      <Link href="/my-cases" className="text-xs font-medium text-[var(--brand-700)] hover:underline">
                        View all
                      </Link>
                    </div>
                    {dashboardCases.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">Open Review from an alert or user to start a case.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-slate-200/80 border-t border-slate-200/80 text-sm">
                        {dashboardCases.map((t) => (
                          <li key={t.threadId} className="flex flex-nowrap items-center justify-between gap-3 py-2.5">
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <Link
                                href={t.targetHref}
                                className="min-w-0 truncate font-semibold text-[var(--brand-700)] hover:underline"
                              >
                                {t.targetLabel}
                              </Link>
                              <span className="shrink-0 text-slate-500">-</span>
                              <span className="text-slate-600">{formatTraineeCasePhaseLabel(t.casePhase)}</span>
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-slate-500">{formatDate(t.updatedAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </div>
              </>
            )}
          </section>
        ) : (
          <p className="text-sm text-slate-600">
            Use the navigation to open{" "}
            <Link href="/alerts" className="font-medium text-[var(--brand-700)] hover:underline">
              Alerts
            </Link>
            ,{" "}
            <Link href="/users" className="font-medium text-[var(--brand-700)] hover:underline">
              Users
            </Link>
            , or other tools available for your role.
          </p>
        )}
      </div>
    </div>
  );
}
