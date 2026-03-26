"use client";

import { formatDate } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createClient } from "@/lib/supabase";
import {
  loadReviewThreadSummariesForDashboard,
  type DashboardThreadSummary,
} from "@/lib/dashboard-review-thread-summaries";
import { resolveTraineeAssignmentAlertColumn } from "@/lib/trainee-alert-assignments";
import {
  formatPostgrestError,
  resolveTraineeWatchlistSimulatorColumn,
} from "@/lib/trainee-user-watchlist";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MyAlertRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  severity: string | null;
  alert_type: string | null;
  created_at: string;
};

type WatchedUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ThreadSummary = DashboardThreadSummary;

export default function DashboardPage() {
  const { appUser, loading: userLoading } = useCurrentUser();
  const [myAlerts, setMyAlerts] = useState<MyAlertRow[]>([]);
  const [watchedUsers, setWatchedUsers] = useState<WatchedUserRow[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<ThreadSummary[]>([]);
  const [traineeLoading, setTraineeLoading] = useState(false);
  const [traineeError, setTraineeError] = useState<string | null>(null);
  const [watchRemoveBusyId, setWatchRemoveBusyId] = useState<string | null>(null);

  const loadTraineeSections = useCallback(async () => {
    if (!appUser || appUser.role !== "user") {
      setMyAlerts([]);
      setWatchedUsers([]);
      setThreadSummaries([]);
      return;
    }
    const supabase = createClient();
    setTraineeLoading(true);
    setTraineeError(null);
    const sectionErrors: string[] = [];

    try {
      try {
        const alertCol = await resolveTraineeAssignmentAlertColumn(supabase);
        const { data: assigns, error: aErr } = await supabase
          .from("trainee_alert_assignments")
          .select(`${alertCol}, created_at`)
          .eq("app_user_id", appUser.id)
          .order("created_at", { ascending: false });
        if (aErr) throw aErr;
        const assignIds = (assigns ?? [])
          .map((r) => (r as Record<string, string>)[alertCol])
          .filter(Boolean);
        if (assignIds.length === 0) {
          setMyAlerts([]);
        } else {
          const alertsFilterCol = alertCol === "alert_internal_id" ? "internal_id" : "id";
          const { data: alerts, error: alErr } = await supabase
            .from("alerts")
            .select("id, user_id, status, severity, alert_type, created_at")
            .in(alertsFilterCol, assignIds);
          if (alErr) throw alErr;
          setMyAlerts((alerts as MyAlertRow[]) ?? []);
        }
      } catch (e) {
        sectionErrors.push(`My alerts: ${formatPostgrestError(e)}`);
        setMyAlerts([]);
      }

      try {
        const simCol = await resolveTraineeWatchlistSimulatorColumn(supabase);
        const { data: watches, error: wErr } = await supabase
          .from("trainee_user_watchlist")
          .select(`${simCol}, created_at`)
          .eq("app_user_id", appUser.id)
          .order("created_at", { ascending: false });
        if (wErr) throw wErr;
        const simIds = (watches ?? [])
          .map((r) => (r as Record<string, string>)[simCol])
          .filter(Boolean);
        if (simIds.length === 0) {
          setWatchedUsers([]);
        } else {
          const { data: users, error: uErr } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", simIds);
          if (uErr) throw uErr;
          setWatchedUsers((users as WatchedUserRow[]) ?? []);
        }
      } catch (e) {
        sectionErrors.push(`Watched users: ${formatPostgrestError(e)}`);
        setWatchedUsers([]);
      }

      try {
        const threads = await loadReviewThreadSummariesForDashboard(supabase, appUser.id);
        if (threads.error) {
          sectionErrors.push(`Review threads: ${threads.error}`);
          setThreadSummaries([]);
        } else {
          setThreadSummaries(threads.summaries);
        }
      } catch (e) {
        sectionErrors.push(`Review threads: ${formatPostgrestError(e)}`);
        setThreadSummaries([]);
      }

      setTraineeError(sectionErrors.length > 0 ? sectionErrors.join(" · ") : null);
    } finally {
      setTraineeLoading(false);
    }
  }, [appUser]);

  const removeSimulatorFromWatchlist = useCallback(async (simulatorUserId: string) => {
    if (!appUser || appUser.role !== "user") return;
    setWatchRemoveBusyId(simulatorUserId);
    setTraineeError(null);
    try {
      const supabase = createClient();
      const simCol = await resolveTraineeWatchlistSimulatorColumn(supabase);
      let dq = supabase.from("trainee_user_watchlist").delete().eq("app_user_id", appUser.id);
      dq = dq.eq(simCol, simulatorUserId);
      const { error } = await dq;
      if (error) throw error;
      setWatchedUsers((prev) => prev.filter((row) => row.id !== simulatorUserId));
    } catch (e) {
      setTraineeError(formatPostgrestError(e) || "Could not remove user from watchlist");
    } finally {
      setWatchRemoveBusyId(null);
    }
  }, [appUser]);

  useEffect(() => {
    void loadTraineeSections();
  }, [loadTraineeSections]);

  const metricCards = [
    { title: "Open Fraud Alerts", value: "24" },
    { title: "Open AML Alerts", value: "11" },
    { title: "Users Under Review", value: "37" },
    { title: "Review Completed", value: "78" },
  ];

  return (
    <div className="main-content-shell p-3 sm:p-5 md:p-6">
      <div className="space-y-4">
        <section className="page-panel surface-lift p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="heading-page">Simulation Overview</h1>
              <p className="mt-1 text-sm text-slate-600">
                Internal simulator for fraud and AML analyst workflows.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Link
                href="/users"
                className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-brand-500 active:bg-[#1F3E49] sm:min-h-0 sm:px-3 sm:py-1.5"
              >
                Open Users
              </Link>
              <Link
                href="/alerts"
                className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors duration-150 hover:bg-slate-200 sm:min-h-0 sm:px-3 sm:py-1.5"
              >
                Open Alerts
              </Link>
            </div>
          </div>
        </section>

        {appUser?.role === "user" ? (
          <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">My workspace</h2>
            {traineeError ? <p className="text-sm text-rose-600">{traineeError}</p> : null}
            {userLoading || traineeLoading ? (
              <p className="text-sm text-slate-600">Loading your assignments…</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-3">
                <article className="surface-lift rounded-xl bg-slate-50 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">My alerts</h3>
                  {myAlerts.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No personal assignments. Use “Assign to me” on an alert.</p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {myAlerts.map((a) => (
                        <li key={a.id}>
                          <Link href={`/alerts/${a.id}`} className="font-mono text-xs text-[#264B5A] hover:underline">
                            {a.id}
                          </Link>
                          <span className="text-slate-500"> · {a.status ?? "—"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
                <article className="surface-lift rounded-xl bg-slate-50 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Watched users</h3>
                  {watchedUsers.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No users on your watchlist. Add one with “Watch user” on a simulator profile. Remove entries here with Delete.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {watchedUsers.map((u) => (
                        <li key={u.id} className="flex items-center justify-between gap-2">
                          <Link href={`/users/${u.id}`} className="min-w-0 truncate text-[#264B5A] hover:underline">
                            {u.full_name?.trim() || u.email || u.id}
                          </Link>
                          <button
                            type="button"
                            disabled={watchRemoveBusyId === u.id}
                            onClick={() => void removeSimulatorFromWatchlist(u.id)}
                            aria-label={`Delete ${u.full_name?.trim() || u.email || u.id} from watchlist`}
                            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {watchRemoveBusyId === u.id ? "…" : "Delete"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
                <article className="surface-lift rounded-xl bg-slate-50 p-4 shadow-sm xl:col-span-1">
                  <h3 className="text-sm font-semibold text-slate-900">Review threads</h3>
                  {threadSummaries.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">Open Review from an alert or user to start a thread.</p>
                  ) : (
                    <ul className="mt-2 space-y-3 text-sm">
                      {threadSummaries.map((t) => (
                        <li key={t.threadId} className="rounded-lg border border-slate-200 bg-white p-2">
                          <Link href={t.targetHref} className="font-medium text-[#264B5A] hover:underline">
                            {t.targetLabel}
                          </Link>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{t.lastSnippet}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400 tabular-nums">{formatDate(t.updatedAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            )}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <article
              key={card.title}
              className="surface-lift rounded-xl bg-slate-50 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.09)] transition-shadow duration-150"
            >
              <p className="field-label">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-800">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="surface-lift rounded-xl bg-slate-100 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-shadow duration-150">
            <h2 className="text-lg font-semibold text-slate-900">Simulator Scope</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Practice triage, profile reviews, and alert decisions with synthetic risk data in a controlled environment. This
              is an internal training UI and not connected to production controls.
            </p>
          </article>
          <article className="surface-lift rounded-xl bg-slate-100 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-shadow duration-150">
            <h2 className="text-lg font-semibold text-slate-900">Quick Access</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/guide"
                className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200"
              >
                Open Guide
              </Link>
              <Link
                href="/about"
                className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200"
              >
                About RiskOps Lab
              </Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
