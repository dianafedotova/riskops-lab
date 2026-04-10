"use client";

import { AdminEntityAsyncPicker } from "@/components/admin-entity-async-picker";
import { FilterSelect } from "@/components/filter-select";
import { QueryErrorBanner } from "@/components/query-error";
import {
  adminCaseTargetSummary,
  buildAdminCaseWorkspaceHref,
} from "@/lib/admin-case-workspace-href";
import {
  adminCasesStateFromSearchParams,
  parseUtcDayEndExclusive,
  parseUtcDayStart,
  serializeAdminCasesUrlState,
  type AdminCasesUrlState,
} from "@/lib/admin-cases-url";
import { isSuperAdmin } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import {
  clampAdminCasePage,
  clampAdminCasePageSize,
  listAdminReviewCases,
  searchAdminCaseAlerts,
  searchAdminCaseSimulatorUsers,
  searchAdminCaseTrainees,
  type AdminCaseCatalogRow,
} from "@/lib/services/admin-review-cases";
import { listAdminOrganizations } from "@/lib/services/admin-people";
import {
  getAdminConsoleThreadListItem,
  type AdminConsoleThreadListItem,
} from "@/lib/services/admin-review-console";
import { createClient } from "@/lib/supabase";
import { formatTraineeCasePhaseLabel, type TraineeCasePhase } from "@/lib/trainee-cases";
import { traineeCasePhaseBadgeClass } from "@/lib/trainee-case-badges";
import type { OrganizationRow } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All phases" },
  { value: "not_draft", label: "All with submission" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "closed", label: "Closed" },
];

const CONTEXT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All contexts" },
  { value: "alert", label: "Alert" },
  { value: "profile", label: "Profile" },
];

const BASIS_OPTIONS: { value: string; label: string }[] = [
  { value: "activity", label: "Activity (updated / submission)" },
  { value: "thread_created", label: "Thread created" },
];

function phaseBadgeClass(phase: string): string {
  const p = phase.trim().toLowerCase();
  if (
    p === "draft" ||
    p === "submitted" ||
    p === "in_review" ||
    p === "changes_requested" ||
    p === "approved" ||
    p === "closed"
  ) {
    return traineeCasePhaseBadgeClass(p as TraineeCasePhase);
  }
  return "ui-badge-neutral";
}

export type AdminCasesCatalogEmbedTab = "submitted" | "drafts";

type ExpandDetailState =
  | { status: "loading" }
  | { status: "ready"; thread: AdminConsoleThreadListItem | null; error: string | null };

const PHASE_OPTIONS_SUBMITTED_QUEUE = PHASE_OPTIONS.filter(
  (o) => o.value !== "all" && o.value !== "draft"
);

export function AdminCasesCatalog({
  variant = "standalone",
  embedTab = null,
  renderExpandedBody,
  refreshKey = 0,
  hidePageChrome = false,
}: {
  variant?: "standalone" | "embedded";
  embedTab?: AdminCasesCatalogEmbedTab | null;
  renderExpandedBody?: (ctx: {
    row: AdminCaseCatalogRow;
    thread: AdminConsoleThreadListItem | null;
    detailLoading: boolean;
    detailError: string | null;
  }) => ReactNode;
  refreshKey?: number;
  /** Omit outer panel padding, breadcrumb, and page title (e.g. embedded in another admin page). */
  hidePageChrome?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const urlState = useMemo(() => adminCasesStateFromSearchParams(searchParams), [searchParams]);

  const { appUser, loading: userLoading, canViewAdminPanel } = useReviewWorkspaceActor();
  const superViewer = isSuperAdmin(appUser?.role);

  const [rows, setRows] = useState<AdminCaseCatalogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [expandDetails, setExpandDetails] = useState<Record<string, ExpandDetailState>>({});

  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [orgLoadError, setOrgLoadError] = useState<string | null>(null);

  const [traineeLabel, setTraineeLabel] = useState<string | null>(null);
  const [simLabel, setSimLabel] = useState<string | null>(null);
  const qDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateReplace = useCallback(
    (next: AdminCasesUrlState) => {
      const qs = serializeAdminCasesUrlState(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname]
  );

  const navigateFilters = useCallback(
    (patch: Partial<AdminCasesUrlState>) => {
      navigateReplace({ ...urlState, ...patch, page: 1 });
    },
    [navigateReplace, urlState]
  );

  const navigatePageOnly = useCallback(
    (page: number) => {
      navigateReplace({ ...urlState, page: clampAdminCasePage(page) });
    },
    [navigateReplace, urlState]
  );

  useEffect(() => {
    if (!superViewer || !canViewAdminPanel || !appUser) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { organizations: orgs, error: oe } = await listAdminOrganizations(supabase, appUser);
      if (cancelled) return;
      setOrgLoadError(oe);
      setOrganizations(orgs);
    })();
    return () => {
      cancelled = true;
    };
  }, [superViewer, canViewAdminPanel, appUser]);

  useEffect(() => {
    if (!urlState.trainee) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_users")
        .select("email, full_name")
        .eq("id", urlState.trainee)
        .maybeSingle();
      if (cancelled || !data) return;
      const name = (data.full_name ?? "").trim();
      const email = (data.email ?? "").trim();
      setTraineeLabel(name && email ? `${name} · ${email}` : name || email || urlState.trainee);
    })();
    return () => {
      cancelled = true;
    };
  }, [urlState.trainee]);

  useEffect(() => {
    if (!urlState.sim) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", urlState.sim)
        .maybeSingle();
      if (cancelled || !data) return;
      const name = (data.full_name ?? "").trim();
      const email = (data.email ?? "").trim();
      setSimLabel(name && email ? `${name} · ${email}` : name || email || urlState.sim);
    })();
    return () => {
      cancelled = true;
    };
  }, [urlState.sim]);

  const rpcPhase = useMemo(() => {
    if (embedTab === "drafts") return "draft";
    if (embedTab === "submitted") {
      if (urlState.phase === "all" || urlState.phase === "draft") return "not_draft";
      return urlState.phase;
    }
    return urlState.phase;
  }, [embedTab, urlState.phase]);

  const phaseFilterControlValue = useMemo(() => {
    if (embedTab === "submitted") {
      if (urlState.phase === "all" || urlState.phase === "draft") return "not_draft";
    }
    return urlState.phase;
  }, [embedTab, urlState.phase]);

  const listArgs = useMemo(() => {
    const dateFrom = parseUtcDayStart(urlState.dateFrom);
    const dateToExclusive = parseUtcDayEndExclusive(urlState.dateTo);
    return {
      search: urlState.q || null,
      organizationId: superViewer ? urlState.org : null,
      traineeAppUserId: urlState.trainee,
      simulatorUserId: urlState.sim,
      alertId: urlState.alert,
      contextType: urlState.ctx,
      phase: rpcPhase,
      dateBasis: urlState.basis,
      dateFrom,
      dateToExclusive,
      page: urlState.page,
      pageSize: urlState.pageSize,
    };
  }, [urlState, superViewer, rpcPhase]);

  useEffect(() => {
    if (!canViewAdminPanel) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const result = await listAdminReviewCases(supabase, listArgs);
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
        setRows([]);
        setTotalCount(0);
      } else {
        setRows(result.rows);
        setTotalCount(result.totalCount);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewAdminPanel, listArgs, refreshKey]);

  const organizationOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations]
  );
  const visibleOrgLoadError = superViewer && canViewAdminPanel && appUser ? orgLoadError : null;
  const selectedTraineeLabel = urlState.trainee ? traineeLabel : null;
  const selectedSimLabel = urlState.sim ? simLabel : null;

  const onSearchChange = (value: string) => {
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(() => {
      navigateFilters({ q: value.trim() });
    }, 380);
  };

  const pageSize = clampAdminCasePageSize(urlState.pageSize);
  const page = clampAdminCasePage(urlState.page);
  const fromIdx = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const dashedPanelClass =
    "rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500";

  const searchTrainees = useCallback(
    async (query: string) => {
      const supabase = createClient();
      return searchAdminCaseTrainees(supabase, {
        viewerRole: appUser?.role ?? null,
        organizationId: superViewer ? urlState.org : appUser?.organization_id ?? null,
        query,
      });
    },
    [appUser?.role, appUser?.organization_id, superViewer, urlState.org]
  );

  const searchSimUsers = useCallback(async (query: string) => {
    const supabase = createClient();
    return searchAdminCaseSimulatorUsers(supabase, { query });
  }, []);

  const searchAlerts = useCallback(async (query: string) => {
    const supabase = createClient();
    return searchAdminCaseAlerts(supabase, { query });
  }, []);

  const toggleRowExpanded = useCallback(
    (threadId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(threadId)) {
          next.delete(threadId);
        } else {
          next.add(threadId);
          if (renderExpandedBody) {
            setExpandDetails((d) => ({ ...d, [threadId]: { status: "loading" } }));
            void (async () => {
              const supabase = createClient();
              const { thread, error: loadError } = await getAdminConsoleThreadListItem(supabase, threadId);
              setExpandDetails((d) => ({
                ...d,
                [threadId]: { status: "ready", thread, error: loadError },
              }));
            })();
          }
        }
        return next;
      });
    },
    [renderExpandedBody]
  );

  const isEmbedded = variant === "embedded";
  const compactShell = isEmbedded || hidePageChrome;
  const outerClass = compactShell
    ? "w-full min-w-0 space-y-4"
    : "page-panel surface-lift space-y-4 p-4 sm:p-6";
  const showStandaloneHeader = !isEmbedded && !hidePageChrome;

  if (userLoading) {
    return (
      <div className={outerClass}>
        <div className={dashedPanelClass}>Loading…</div>
      </div>
    );
  }

  if (!canViewAdminPanel) {
    return (
      <div className={outerClass}>
        {showStandaloneHeader ? <h1 className="heading-page">Review queue</h1> : null}
        <div className={dashedPanelClass}>Access restricted to staff only.</div>
      </div>
    );
  }

  return (
    <div className={outerClass}>
      <div className="w-full min-w-0 space-y-4">
        {showStandaloneHeader ? (
          <>
            <nav className="text-sm text-slate-500">
              <Link href="/" className="hover:text-[var(--brand-700)]">
                Home
              </Link>{" "}
              / <span className="text-slate-700">Review queue</span>
            </nav>

            <h1 className="heading-page">Review queue</h1>
          </>
        ) : null}

        {error ? <QueryErrorBanner message={error} onRetry={() => navigateReplace({ ...urlState })} /> : null}
        {visibleOrgLoadError ? <p className="text-sm text-rose-600">{visibleOrgLoadError}</p> : null}

        <div className="workspace-shell space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label htmlFor="admin-cases-q" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
                Search
              </label>
                <input
                  key={`admin-cases-q-${urlState.q}`}
                  id="admin-cases-q"
                  type="search"
                  defaultValue={urlState.q}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Trainee name, email, thread id, alert id, simulator user…"
                  className="dark-input h-10 w-full rounded-[0.7rem] px-4 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-7 lg:justify-end">
              <div className="flex min-w-[10rem] flex-col gap-1">
                <span className="pl-3 text-sm font-medium text-slate-600">Phase</span>
                {embedTab === "drafts" ? (
                  <div className="dark-input flex h-10 min-w-[12rem] items-center rounded-[0.7rem] px-3 text-sm text-slate-700">
                    Draft
                  </div>
                ) : (
                  <FilterSelect
                    ariaLabel="Phase filter"
                    value={embedTab === "submitted" ? phaseFilterControlValue : urlState.phase}
                    onChange={(v) => navigateFilters({ phase: v as AdminCasesUrlState["phase"] })}
                    options={embedTab === "submitted" ? PHASE_OPTIONS_SUBMITTED_QUEUE : PHASE_OPTIONS}
                    className="dark-input h-10 w-full min-w-[12rem]"
                  />
                )}
              </div>
              <div className="flex min-w-[10rem] flex-col gap-1">
                <span className="pl-3 text-sm font-medium text-slate-600">Context</span>
                <FilterSelect
                  ariaLabel="Context filter"
                  value={urlState.ctx}
                  onChange={(v) => navigateFilters({ ctx: v as AdminCasesUrlState["ctx"] })}
                  options={CONTEXT_OPTIONS}
                  className="dark-input h-10 w-full min-w-[11rem]"
                />
              </div>
              <div className="flex min-w-[11rem] flex-col gap-1">
                <span className="pl-3 text-sm font-medium text-slate-600">Date basis</span>
                <FilterSelect
                  ariaLabel="Date basis"
                  value={urlState.basis}
                  onChange={(v) => navigateFilters({ basis: v as AdminCasesUrlState["basis"] })}
                  options={BASIS_OPTIONS}
                  className="dark-input h-10 w-full min-w-[14rem]"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Period from (UTC)</span>
              <input
                type="date"
                value={urlState.dateFrom ?? ""}
                onChange={(e) => navigateFilters({ dateFrom: e.target.value || null })}
                className="dark-input h-10 w-full rounded-[0.65rem] px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Period to (UTC, inclusive)</span>
              <input
                type="date"
                value={urlState.dateTo ?? ""}
                onChange={(e) => navigateFilters({ dateTo: e.target.value || null })}
                className="dark-input h-10 w-full rounded-[0.65rem] px-3 text-sm"
              />
            </div>
            {superViewer ? (
              <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-1">
                <span className="pl-3 text-sm font-medium text-slate-600">Organization</span>
                <FilterSelect
                  ariaLabel="Organization"
                  value={urlState.org ?? "all"}
                  onChange={(v) => {
                    const org = v === "all" ? null : v;
                    navigateFilters({ org, trainee: null });
                  }}
                  options={[{ value: "all", label: "All organizations" }, ...organizationOptions]}
                  className="dark-input h-10 w-full"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Page size</span>
              <FilterSelect
                ariaLabel="Page size"
                value={String(urlState.pageSize)}
                onChange={(v) => navigateFilters({ pageSize: clampAdminCasePageSize(Number(v)) })}
                options={[
                  { value: "10", label: "10 per page" },
                  { value: "25", label: "25 per page" },
                  { value: "50", label: "50 per page" },
                ]}
                className="dark-input h-10 w-full"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Trainee (exact)</span>
              <AdminEntityAsyncPicker
                ariaLabel="Filter by trainee"
                disabled={superViewer && !urlState.org}
                placeholder={superViewer && !urlState.org ? "Pick an organization first" : "Search trainees…"}
                selectedId={urlState.trainee}
                selectedLabel={selectedTraineeLabel}
                search={searchTrainees}
                onClear={() => navigateFilters({ trainee: null })}
                onSelect={(opt) => navigateFilters({ trainee: opt.id })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Simulator user (exact)</span>
              <AdminEntityAsyncPicker
                ariaLabel="Filter by simulator user"
                selectedId={urlState.sim}
                selectedLabel={selectedSimLabel}
                search={searchSimUsers}
                onClear={() => navigateFilters({ sim: null })}
                onSelect={(opt) => navigateFilters({ sim: opt.id })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Alert (exact public id)</span>
              <AdminEntityAsyncPicker
                ariaLabel="Filter by alert id"
                selectedId={urlState.alert}
                selectedLabel={urlState.alert}
                search={searchAlerts}
                onClear={() => navigateFilters({ alert: null })}
                onSelect={(opt) => navigateFilters({ alert: opt.id })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className={dashedPanelClass}>Loading review queue…</div>
          ) : rows.length === 0 ? (
            <div className={dashedPanelClass}>No cases match the current filters.</div>
          ) : (
            rows.map((row) => {
              const { label: targetLabel, openLabel } = adminCaseTargetSummary({
                contextType: row.contextType,
                alertId: row.alertId,
                simulatorUserId: row.simulatorUserId,
                simUserEmail: row.simUserEmail,
                simUserFullName: row.simUserFullName,
              });
              const traineeDisplay = formatTraineeCasePhaseLabel(row.casePhase as TraineeCasePhase);
              const workspaceHref = buildAdminCaseWorkspaceHref({
                threadId: row.threadId,
                contextType: row.contextType,
                alertId: row.alertId,
                simulatorUserId: row.simulatorUserId,
              });
              const isOpen = expanded.has(row.threadId);
              const traineeName =
                [row.traineeFullName, row.traineeEmail].filter(Boolean).join(" · ") || row.traineeAppUserId;
              const rowExpandDetail = expandDetails[row.threadId];
              const detailReady = rowExpandDetail?.status === "ready" ? rowExpandDetail : null;

              return (
                <div
                  key={row.threadId}
                  className="overflow-hidden rounded-[1.05rem] border border-slate-200/90 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50/90"
                    aria-expanded={isOpen}
                    onClick={() => toggleRowExpanded(row.threadId)}
                  >
                    <span className="mt-0.5 text-slate-400" aria-hidden>
                      {isOpen ? "▼" : "▶"}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{targetLabel}</span>
                        <span className={`ui-badge text-[11px] ${phaseBadgeClass(row.casePhase)}`}>
                          {traineeDisplay}
                        </span>
                        <span className="ui-badge ui-badge-neutral text-[11px]">{row.contextType}</span>
                        {superViewer ? (
                          <span className="ui-badge ui-badge-neutral text-[11px]">{row.organizationName}</span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">
                        Trainee: <span className="font-medium text-slate-800">{traineeName}</span>
                      </p>
                      <p className="text-[0.76rem] tabular-nums text-slate-400">
                        Activity: {formatDateTime(row.activityAt)} · Thread:{" "}
                        <span className="font-mono">{row.threadId}</span>
                      </p>
                    </div>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-wrap gap-3">
                        {workspaceHref ? (
                          <Link
                            href={workspaceHref}
                            className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 text-[0.78rem] text-slate-700 transition hover:text-[var(--brand-700)] hover:underline"
                          >
                            {openLabel}
                            <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3 shrink-0">
                              <path
                                d="M3 9 9 3M4 3h5v5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.45"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Link>
                        ) : null}
                        <Link
                          href={`/admin/trainees/${row.traineeAppUserId}`}
                          className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 text-[0.78rem] text-slate-700 transition hover:text-[var(--brand-700)] hover:underline"
                        >
                          Trainee admin profile
                        </Link>
                      </div>
                      {renderExpandedBody ? (
                        <div className="mt-3">
                          {renderExpandedBody({
                            row,
                            thread: detailReady?.thread ?? null,
                            detailLoading: rowExpandDetail?.status === "loading",
                            detailError: detailReady?.error ?? null,
                          })}
                        </div>
                      ) : (
                        <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                          <div>
                            <dt className="font-medium text-slate-500">Created</dt>
                            <dd className="tabular-nums">{formatDateTime(row.createdAt)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-slate-500">Updated</dt>
                            <dd className="tabular-nums">{formatDateTime(row.updatedAt)}</dd>
                          </div>
                          {row.alertId ? (
                            <div>
                              <dt className="font-medium text-slate-500">Alert id</dt>
                              <dd className="font-mono">{row.alertId}</dd>
                            </div>
                          ) : null}
                          {row.simulatorUserId ? (
                            <div>
                              <dt className="font-medium text-slate-500">Simulator user id</dt>
                              <dd className="font-mono">{row.simulatorUserId}</dd>
                            </div>
                          ) : null}
                        </dl>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <p className="tabular-nums">
            {totalCount === 0 ? "Review queue is empty" : `Showing ${fromIdx}–${toIdx} of ${totalCount}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ui-btn ui-btn-secondary rounded-[0.65rem] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => navigatePageOnly(page - 1)}
            >
              Previous
            </button>
            <span className="tabular-nums text-xs text-slate-500">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="ui-btn ui-btn-secondary rounded-[0.65rem] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              disabled={page >= totalPages || loading}
              onClick={() => navigatePageOnly(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
