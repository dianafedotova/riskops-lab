"use client";

import { describeTraineeAlertActivityLine } from "@/lib/alert-activity-labels";
import { formatDateTime } from "@/lib/format";
import { listAppUserActivityForAlert, type AppUserActivityRow } from "@/lib/services/app-user-activity";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Props = {
  alertId: string | null;
  refreshKey: string | number;
};

export function AlertActivityLog({ alertId, refreshKey }: Props) {
  const [rows, setRows] = useState<AppUserActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alertId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { rows: next, error: listError } = await listAppUserActivityForAlert(supabase, {
        alertId,
        limit: 50,
      });
      if (cancelled) return;
      if (listError) {
        setError(listError);
        setRows([]);
      } else {
        setRows(next);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [alertId, refreshKey]);

  if (!alertId) return null;

  return (
    <div
      className="evidence-shell rounded-[1rem] border-[rgb(210_217_229_/_0.95)] bg-[linear-gradient(180deg,rgba(248,250,253,0.987),rgba(235,240,248,0.992))] px-4 py-3 shadow-[inset_0_3px_10px_rgba(194,203,218,0.2),inset_0_1px_0_rgba(255,255,255,0.96),0_7px_16px_rgba(18,32,46,0.06)] sm:px-5 sm:py-4"
      aria-live="polite"
    >
      <h3 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
        My activity
      </h3>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading activity…</p>
      ) : !error && rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No recorded actions yet.</p>
      ) : !error ? (
        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-[0.85rem] border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm sm:gap-4"
            >
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                {describeTraineeAlertActivityLine(row.event_type, row.metadata)}
              </p>
              <p className="shrink-0 text-right text-[0.72rem] leading-snug tabular-nums text-slate-500 whitespace-nowrap">
                {formatDateTime(row.created_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
