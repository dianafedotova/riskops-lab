"use client";

import { QueryErrorBanner } from "@/components/query-error";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { formatDate } from "@/lib/format";
import { TABLE_PY } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import type { AlertRow } from "@/lib/types";
import { useRouter } from "next/navigation";

type AlertWithRuleName = AlertRow & { rule_name?: string | null };
import { useEffect, useMemo, useState } from "react";

export default function AlertsPage() {
  const supabase = createClient();
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qError } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });
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
    setPage(1);
  }, [query, typeFilter, severityFilter, statusFilter, itemsPerPage]);

  const hint = (
    <p className="text-xs text-rose-800/90">
      Ensure <code className="rounded bg-rose-100 px-1 font-mono">supabase/schema.sql</code> has been applied in
      Supabase.
    </p>
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

  const typeBadgeClass = (type: string | null | undefined) =>
    normalizeStr(type) === "aml" ? "bg-indigo-100 text-indigo-700" : "bg-cyan-100 text-cyan-700";

  const severityBadgeClass = (severity: string | null) => {
    const s = normalizeStr(severity);
    if (s === "critical") return "bg-rose-200 text-rose-800";
    if (s === "high") return "bg-rose-100 text-rose-700";
    if (s === "medium") return "bg-amber-100 text-amber-700";
    if (s === "low") return "bg-emerald-100 text-emerald-700";
    return "bg-slate-200 text-slate-700";
  };

  const statusBadgeClass = (status: string | null) => {
    const s = normalizeStr(status);
    if (s === "open") return "bg-sky-100 text-sky-700";
    if (s === "monitoring") return "bg-amber-100 text-amber-700";
    if (s === "escalated") return "bg-violet-100 text-violet-700";
    if (s === "closed") return "bg-emerald-100 text-emerald-700";
    return "bg-slate-200 text-slate-700";
  };

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="heading-page">Alerts</h1>
        <button
          type="button"
          className="min-h-11 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-brand-500 sm:min-h-0 sm:px-3 sm:py-1.5"
        >
          Create Alert
        </button>
      </div>

      {error && (
        <QueryErrorBanner message={error} onRetry={() => setReloadTick((n) => n + 1)} hint={hint} />
      )}

      <div className="min-w-0 overflow-visible rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1 sm:w-72 sm:shrink-0">
          <label htmlFor="alerts-search" className="text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            id="alerts-search"
            type="text"
            placeholder="Search by Alert ID or User ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full min-w-0 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors duration-150 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-2 sm:gap-x-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="alerts-type-filter" className="text-xs font-medium text-slate-600">
              Type
            </label>
            <select
              id="alerts-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "fraud" | "aml")}
              className="h-10 min-w-[5.5rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
            >
              <option value="all">All</option>
              <option value="fraud">Fraud</option>
              <option value="aml">AML</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="alerts-severity-filter" className="text-xs font-medium text-slate-600">
              Severity
            </label>
            <select
              id="alerts-severity-filter"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 min-w-[5.5rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
            >
              <option value="all">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="alerts-status-filter" className="text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              id="alerts-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 min-w-[5.5rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
            >
              <option value="all">All</option>
              <option value="Open">Open</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Escalated">Escalated</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!isFiltersActive}
            className="h-10 shrink-0 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset filters
          </button>
        </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50/50 shadow-sm">
        <TableSwipeHint />
        <div className="scroll-x-touch">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="min-w-[140px] w-[36%]" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
              <th className={`px-4 ${TABLE_PY}`}>Alert ID</th>
              <th className={`px-4 ${TABLE_PY}`}>Created</th>
              <th className={`px-4 ${TABLE_PY}`}>User ID</th>
              <th className={`px-4 ${TABLE_PY}`}>Type</th>
              <th className={`px-4 ${TABLE_PY}`}>Severity</th>
              <th className={`px-4 ${TABLE_PY}`}>Status</th>
              <th className={`px-4 ${TABLE_PY}`}>Description</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : (
            <tbody>
              {totalFiltered === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
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
                    <td className={`px-4 tabular-nums text-slate-600 ${TABLE_PY}`}>{formatDate(alert.created_at)}</td>
                    <td className={`px-4 font-mono text-xs ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap`} title={alert.user_id ?? "—"}>
                      {alert.user_id ?? "—"}
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBadgeClass(getAlertType(alert))}`}>
                        {normalizeStr(getAlertType(alert)) ? normalizeStr(getAlertType(alert)).toUpperCase() : "—"}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${severityBadgeClass(alert.severity)}`}>
                        {toTitleCase(alert.severity)}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(alert.status)}`}>
                        {toTitleCase(alert.status)}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY} min-w-0 whitespace-normal break-words`} title={getDescription(alert as AlertWithRuleName)}>
                      {getDescription(alert as AlertWithRuleName)}
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
            : totalFiltered === 0
              ? "Showing 0 of 0 alerts"
              : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalFiltered)} of ${totalFiltered} alerts`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="alerts-per-page">Items per page</label>
          <select
            id="alerts-per-page"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="rounded-md bg-slate-100 px-2 py-1 shadow-sm"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button type="button" className="rounded-md bg-slate-200 px-2.5 py-1 text-sm text-slate-700 shadow-sm">
            {currentPage}
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </section>
  );
}
