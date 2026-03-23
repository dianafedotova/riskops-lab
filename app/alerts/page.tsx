"use client";

import { QueryErrorBanner } from "@/components/query-error";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { formatDateTime } from "@/lib/format";
import { TABLE_PY } from "@/lib/table-padding";
import { supabase } from "@/lib/supabase";
import type { AlertRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

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

  const hint = (
    <p className="text-xs text-rose-800/90">
      Ensure <code className="rounded bg-rose-100 px-1 font-mono">supabase/schema.sql</code> has been applied in
      Supabase.
    </p>
  );

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="heading-page">Alerts</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-brand-600 px-2.5 py-1 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-brand-500"
            >
              Fraud
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-200"
            >
              AML
            </button>
          </div>
        </div>
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

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-slate-100 p-3">
        <input
          type="text"
          placeholder="Search alerts..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-150 focus:border-brand-600"
        />
        <select className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <option>Severity: all</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>
        <select className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <option>Status: all</option>
          <option>Open</option>
          <option>Monitoring</option>
          <option>Escalated</option>
          <option>Closed</option>
        </select>
        <input
          type="date"
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        />
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-100">
        <TableSwipeHint />
        <div className="scroll-x-touch">
        <table className="min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
              <th className={`px-4 ${TABLE_PY}`}>Alert ID</th>
              <th className={`px-4 ${TABLE_PY}`}>User ID</th>
              <th className={`px-4 ${TABLE_PY}`}>Type</th>
              <th className={`px-4 ${TABLE_PY}`}>Severity</th>
              <th className={`px-4 ${TABLE_PY}`}>Status</th>
              <th className={`px-4 ${TABLE_PY} text-right`}>Created At</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : (
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No alerts. Run <code className="font-mono text-xs">supabase/schema.sql</code> in the Supabase SQL
                    editor.
                  </td>
                </tr>
              ) : (
                alerts.map((alert, idx) => (
                  <tr
                    key={alert.id}
                    onClick={() => router.push(`/alerts/${alert.id}`)}
                    className={`cursor-pointer border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-200/70 ${
                      idx % 2 === 1 ? "bg-slate-50/60" : "bg-white/40"
                    }`}
                  >
                    <td className={`px-4 font-mono text-xs ${TABLE_PY}`}>{alert.id}</td>
                    <td className={`px-4 font-mono text-xs ${TABLE_PY}`}>{alert.user_id ?? "—"}</td>
                    <td className={`px-4 ${TABLE_PY}`}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          alert.type === "AML"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {alert.type ?? "—"}
                      </span>
                    </td>
                    <td className={`px-4 ${TABLE_PY}`}>{alert.severity ?? "—"}</td>
                    <td className={`px-4 ${TABLE_PY}`}>{alert.status ?? "—"}</td>
                    <td className={`px-4 text-right text-slate-600 tabular-nums ${TABLE_PY}`}>
                      {formatDateTime(alert.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3 text-sm text-slate-600">
        <p>{loading ? "…" : `Showing 1-${alerts.length} of ${alerts.length} alerts`}</p>
        <div className="flex items-center gap-2">
          <label htmlFor="alerts-per-page">Items per page</label>
          <select
            id="alerts-per-page"
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm transition-colors duration-150 hover:bg-slate-200"
          >
            Previous
          </button>
          <button type="button" className="rounded-md border border-slate-300 bg-slate-200 px-2.5 py-1 text-sm">
            1
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm transition-colors duration-150 hover:bg-slate-200"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
