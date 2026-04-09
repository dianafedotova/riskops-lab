"use client";

import { ModalShell } from "@/components/modal-shell";
import { QueryErrorBanner } from "@/components/query-error";
import { SimulatorAlertForm } from "@/components/simulator-alert-form";
import { SimulatorAlertImportModal } from "@/components/simulator-alert-import-modal";
import { FilterSelect } from "@/components/filter-select";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { formatDate } from "@/lib/format";
import { useCurrentUser } from "@/components/current-user-provider";
import { canSeeStaffActionControls, canSeeTraineeWorkspace } from "@/lib/permissions/checks";
import { listAssignedAlertsForTrainee, unassignAlertFromTraineeSelf } from "@/lib/services/assignments";
import { TABLE_PY } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import type { AlertRow, ImportedSimulatorAlertRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AlertWithRuleName = AlertRow & { rule_name?: string | null };

/** Cap rows so large remote DBs do not hit statement_timeout; client-side filters apply within this window. */
const ALERT_LIST_LIMIT = 2000;
/** Omit legacy `type` — some DBs only have `alert_type`. UI uses `alert_type ?? type`. */
const ALERT_LIST_COLS =
  "id, internal_id, user_id, alert_type, severity, status, description, rule_code, rule_name, created_at, alert_date" as const;

const ALERT_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "fraud", label: "Fraud" },
  { value: "aml", label: "AML" },
] as const;

const ALERT_SEVERITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
] as const;

const ALERT_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Monitoring", label: "Monitoring" },
  { value: "Escalated", label: "Escalated" },
  { value: "Closed", label: "Closed" },
] as const;

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
] as const;

export default function AlertsPage() {
  const { appUser } = useCurrentUser();
  const canViewStaffActions = canSeeStaffActionControls(appUser?.role);
  const canUseTraineeWorkspace = canSeeTraineeWorkspace(appUser?.role);
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "fraud" | "aml">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [generatedAlerts, setGeneratedAlerts] = useState<ImportedSimulatorAlertRow[]>([]);
  const [generatedAlertsTitle, setGeneratedAlertsTitle] = useState<string | null>(null);
  const [myAssignedAlertIds, setMyAssignedAlertIds] = useState<Set<string>>(() => new Set());
  const [unassignBusyId, setUnassignBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      setLoading(true);
      setError(null);
      const { data, error: qError } = await supabase
        .from("alerts")
        .select(ALERT_LIST_COLS)
        .order("alert_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(ALERT_LIST_LIMIT);
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setAlerts([]);
      } else {
        setAlerts((data as AlertRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(() => {
    if (!appUser || !canUseTraineeWorkspace) {
      setMyAssignedAlertIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { alerts: assigned, error: assignErr } = await listAssignedAlertsForTrainee(supabase, appUser.id);
      if (cancelled) return;
      if (assignErr) {
        setMyAssignedAlertIds(new Set());
        return;
      }
      setMyAssignedAlertIds(new Set(assigned.map((a) => a.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [appUser, canUseTraineeWorkspace, reloadTick]);

  const hint = (
    <div className="space-y-1 text-xs text-rose-800/90">
      {error && /timeout/i.test(error) ? (
        <p>
          The database stopped the query (often a large <code className="rounded bg-rose-100 px-1 font-mono">alerts</code>{" "}
          table or a missing index). This page loads at most {ALERT_LIST_LIMIT} newest rows. In the Supabase SQL Editor,
          run:{" "}
          <code className="block whitespace-pre-wrap break-all rounded bg-rose-100 px-1 py-0.5 font-mono">
            create index if not exists alerts_created_at_idx on public.alerts (created_at desc);
          </code>
        </p>
      ) : null}
      <p>
        Ensure <code className="rounded bg-rose-100 px-1 font-mono">supabase/schema.sql</code> is applied and env keys
        match your Supabase project.
      </p>
    </div>
  );

  const normalizeStr = (v: unknown) => (v == null ? "" : String(v)).trim().toLowerCase();
  const toTitleCase = (value: string | null | undefined) => {
    const raw = (value ?? "").trim();
    if (!raw) return "—";
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };
  const getAlertType = (alert: AlertRow & { rule_code?: string | null }) => {
    const t = (alert.alert_type ?? alert.type ?? "").trim();
    if (t) return t;
    const code = (alert.rule_code ?? "").trim();
    if (code) return code.split("_")[0] ?? "";
    return "";
  };
  const getDescription = (alert: AlertWithRuleName) =>
    (alert.rule_name ?? alert.description ?? "").trim() || "—";

  const filteredAlerts = useMemo(() => {
    const q = normalizeStr(query);
    return alerts.filter((alert) => {
      const alertType = normalizeStr(getAlertType(alert));
      const typeOk = typeFilter === "all" ? true : alertType === typeFilter;
      const severityOk =
        severityFilter === "all"
          ? true
          : normalizeStr(alert.severity) === normalizeStr(severityFilter);
      const statusOk =
        statusFilter === "all" ? true : normalizeStr(alert.status) === normalizeStr(statusFilter);
      const queryOk =
        !q ||
        normalizeStr(alert.id).includes(q) ||
        normalizeStr(alert.user_id).includes(q);
      return typeOk && severityOk && statusOk && queryOk;
    });
  }, [alerts, query, typeFilter, severityFilter, statusFilter]);

  const totalFiltered = filteredAlerts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAlerts.slice(start, start + itemsPerPage);
  }, [currentPage, filteredAlerts, itemsPerPage]);

  const isFiltersActive =
    query.trim().length > 0 ||
    typeFilter !== "all" ||
    severityFilter !== "all" ||
    statusFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setSeverityFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const copyUserId = async (userId: string) => {
    await navigator.clipboard.writeText(userId);
    setCopiedUserId(userId);
    setTimeout(() => {
      setCopiedUserId((current) => (current === userId ? null : current));
    }, 1500);
  };

  const handleAlertCreated = (alert: AlertRow) => {
    setCreateOpen(false);
    setGeneratedAlerts([
      {
        id: alert.id,
        user_id: alert.user_id ?? null,
        alert_type: alert.alert_type ?? alert.type ?? null,
        severity: alert.severity ?? null,
        status: alert.status ?? null,
      },
    ]);
    setGeneratedAlertsTitle("Alert created");
    setReloadTick((tick) => tick + 1);
  };

  const handleAlertsImported = (created: ImportedSimulatorAlertRow[]) => {
    setImportOpen(false);
    setGeneratedAlerts(created);
    setGeneratedAlertsTitle(created.length === 1 ? "1 alert imported" : `${created.length} alerts imported`);
    setReloadTick((tick) => tick + 1);
  };

  const unassignSelf = async (alert: AlertRow) => {
    if (!appUser) return;
    setUnassignBusyId(alert.id);
    try {
      const supabase = createClient();
      const { error: uErr } = await unassignAlertFromTraineeSelf(supabase, appUser.id, {
        publicId: alert.id,
        internalId: alert.internal_id ?? null,
      });
      if (uErr) throw uErr;
      setMyAssignedAlertIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    } catch {
      setError("Could not unassign this alert.");
    } finally {
      setUnassignBusyId(null);
    }
  };

  const typeBadgeClass = (type: string | null | undefined) =>
    normalizeStr(type) === "aml" ? "ui-badge-indigo" : "ui-badge-blue";

  const severityBadgeClass = (severity: string | null) => {
    const s = normalizeStr(severity);
    if (s === "critical") return "ui-badge-rose";
    if (s === "high") return "ui-badge-rose";
    if (s === "medium") return "ui-badge-amber";
    if (s === "low") return "ui-badge-emerald";
    return "ui-badge-neutral";
  };

  const statusBadgeClass = (status: string | null) => {
    const s = normalizeStr(status);
    if (s === "open") return "ui-badge-blue";
    if (s === "monitoring") return "ui-badge-amber";
    if (s === "escalated") return "ui-badge-violet";
    if (s === "closed") return "ui-badge-emerald";
    return "ui-badge-neutral";
  };

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h1 className="heading-page">Alerts</h1>
        </div>
        {canViewStaffActions ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="ui-btn ui-btn-secondary"
            >
              Import Alerts CSV
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ui-btn ui-btn-primary"
            >
              Create Alert
            </button>
          </div>
        ) : null}
      </div>

      {generatedAlerts.length > 0 ? (
        <div className="workspace-shell space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-900">
                {generatedAlertsTitle ?? "Latest alert imports"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setGeneratedAlerts([]);
                setGeneratedAlertsTitle(null);
              }}
              className="rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Dismiss
            </button>
          </div>

          <div className="overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white/90">
            <div className="scroll-x-touch">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Alert ID</th>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-slate-200/70 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{alert.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{alert.user_id ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{alert.alert_type ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{alert.severity ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{alert.status ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/alerts/${alert.id}`)}
                          className="ui-btn ui-btn-secondary min-h-0 rounded-[0.85rem] px-3 py-1.5 text-xs"
                        >
                          Open alert
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {error && (
        <QueryErrorBanner message={error} onRetry={() => setReloadTick((n) => n + 1)} hint={hint} />
      )}

      <div className="workspace-shell flex flex-col gap-3 min-w-0 overflow-visible p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="min-w-0 w-full max-w-md flex-1">
            <label htmlFor="alerts-search" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
              Search alerts
            </label>
            <input
              id="alerts-search"
              type="text"
              placeholder="Search by Alert ID or User ID..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-2.5 gap-y-2.5 sm:gap-x-3 lg:flex-nowrap lg:justify-end">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Type</span>
              <FilterSelect
                ariaLabel="Alert type"
                value={typeFilter}
                onChange={(nextValue) => {
                  setTypeFilter(nextValue as "all" | "fraud" | "aml");
                  setPage(1);
                }}
                options={[...ALERT_TYPE_OPTIONS]}
                className="w-[min(100%,9rem)] min-w-[7.5rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Severity</span>
              <FilterSelect
                ariaLabel="Alert severity"
                value={severityFilter}
                onChange={(nextValue) => {
                  setSeverityFilter(nextValue);
                  setPage(1);
                }}
                options={[...ALERT_SEVERITY_OPTIONS]}
                className="w-[min(100%,8rem)] min-w-[7rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Status</span>
              <FilterSelect
                ariaLabel="Alert status"
                value={statusFilter}
                onChange={(nextValue) => {
                  setStatusFilter(nextValue);
                  setPage(1);
                }}
                options={[...ALERT_STATUS_OPTIONS]}
                className="w-[min(100%,8rem)] min-w-[7rem]"
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              disabled={!isFiltersActive}
              className="ui-btn ui-btn-secondary ui-filter-reset h-10 min-h-0 shrink-0 self-end rounded-[0.65rem] px-4 text-sm font-medium disabled:cursor-default"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="workspace-shell min-w-0 overflow-hidden p-0">
        <TableSwipeHint />
        <div className="scroll-x-touch">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[20%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="min-w-[120px] w-[28%]" />
            {canUseTraineeWorkspace ? <col className="w-[12%]" /> : null}
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
              <th className={`px-4 ${TABLE_PY}`}>Alert ID</th>
              <th className={`px-4 ${TABLE_PY}`}>Alert Date</th>
              <th className={`px-4 ${TABLE_PY}`}>User ID</th>
              <th className={`px-4 ${TABLE_PY}`}>Type</th>
              <th className={`px-4 ${TABLE_PY}`}>Severity</th>
              <th className={`px-4 ${TABLE_PY}`}>Status</th>
              <th className={`px-4 ${TABLE_PY}`}>Description</th>
              {canUseTraineeWorkspace ? <th className={`px-4 ${TABLE_PY}`}>Actions</th> : null}
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={8} cols={canUseTraineeWorkspace ? 8 : 7} />
          ) : (
            <tbody>
              {totalFiltered === 0 ? (
                <tr>
                  <td colSpan={canUseTraineeWorkspace ? 8 : 7} className="px-4 py-8">
                    <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No alerts yet.
                    </div>
                  </td>
                </tr>
              ) : (
                pagedAlerts.map((alert, idx) => (
                  <tr
                    key={alert.id}
                    onClick={() => router.push(`/alerts/${alert.id}`)}
                    className={`cursor-pointer border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-200/70 ${
                      idx % 2 === 1 ? "bg-slate-50/60" : "bg-white/40"
                    }`}
                  >
                    <td className={`px-4 font-mono text-xs ${TABLE_PY}`}>{alert.id}</td>
                    <td className={`px-4 tabular-nums text-slate-600 ${TABLE_PY}`}>{formatDate(alert.alert_date ?? alert.created_at)}</td>
                    <td className={`px-4 font-mono text-xs text-slate-600 ${TABLE_PY}`}>
                      {alert.user_id ? (
                        <div className="flex items-start gap-1.5">
                          <span className="min-w-0 break-all whitespace-normal">{alert.user_id}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyUserId(alert.user_id!);
                            }}
                            className="mt-0.5 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title={copiedUserId === alert.user_id ? "Copied" : "Copy user ID"}
                            aria-label={copiedUserId === alert.user_id ? "Copied user ID" : "Copy user ID"}
                          >
                            {copiedUserId === alert.user_id ? (
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="m3.5 8 2.6 2.6 6.4-6.4" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <rect x="5" y="3.5" width="7" height="9" rx="1.3" />
                                <path d="M3.5 10.5h-.3A1.7 1.7 0 0 1 1.5 8.8V3.2c0-.94.76-1.7 1.7-1.7h4.6c.94 0 1.7.76 1.7 1.7v.3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span className={`ui-badge text-[11px] ${typeBadgeClass(getAlertType(alert))}`}>
                        {normalizeStr(getAlertType(alert)) ? normalizeStr(getAlertType(alert)).toUpperCase() : "—"}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span className={`ui-badge text-[11px] ${severityBadgeClass(alert.severity)}`}>
                        {toTitleCase(alert.severity)}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span className={`ui-badge text-[11px] ${statusBadgeClass(alert.status)}`}>
                        {toTitleCase(alert.status)}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY} min-w-0 whitespace-normal break-words`} title={getDescription(alert as AlertWithRuleName)}>
                      {getDescription(alert as AlertWithRuleName)}
                    </td>
                    {canUseTraineeWorkspace ? (
                      <td className={`px-4 ${TABLE_PY}`}>
                        {myAssignedAlertIds.has(alert.id) ? (
                          <button
                            type="button"
                            disabled={unassignBusyId === alert.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void unassignSelf(alert);
                            }}
                            className="ui-btn ui-btn-secondary h-auto min-h-0 px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                          >
                            {unassignBusyId === alert.id ? "…" : "Unassign"}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    ) : null}
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
            : totalFiltered === 0
              ? "Showing 0 of 0 alerts"
              : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalFiltered)} of ${totalFiltered} alerts`}
        </p>
        <div className="flex items-center gap-2">
          <span>Items per page</span>
          <FilterSelect
            ariaLabel="Alerts items per page"
            value={String(itemsPerPage)}
            onChange={(nextValue) => {
              setItemsPerPage(Number(nextValue));
              setPage(1);
            }}
            options={[...PAGE_SIZE_OPTIONS]}
            className="ui-page-size min-w-[4.25rem]"
            menuClassName="left-auto right-0 min-w-[4.5rem]"
          />
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="ui-pager-btn"
              >
                Previous
              </button>
            ) : null}
            <button type="button" className="ui-pager-current">
              {currentPage}
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="ui-pager-btn"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      </div>
      {importOpen && canViewStaffActions ? (
        <SimulatorAlertImportModal
          viewer={appUser}
          onClose={() => setImportOpen(false)}
          onImported={handleAlertsImported}
        />
      ) : null}
      {createOpen && canViewStaffActions ? (
        <ModalShell
          title="Create alert"
          onClose={() => setCreateOpen(false)}
        >
          <SimulatorAlertForm
            viewer={appUser}
            mode="create"
            submitLabel="Create alert"
            onSaved={handleAlertCreated}
            onCancel={() => setCreateOpen(false)}
          />
        </ModalShell>
      ) : null}
    </section>
  );
}
