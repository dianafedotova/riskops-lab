"use client";

import { describeAppUserActivityLine } from "@/lib/app-user-activity-labels";
import { formatDateTime } from "@/lib/format";
import { listAppUserActivityForAppUser, type AppUserActivityRow } from "@/lib/services/app-user-activity";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  appUserId: string | null;
  refreshKey: string | number;
  title?: string;
};

function getMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildActivityContextHref(row: AppUserActivityRow): { label: string; href: string } | null {
  const alertId = getMetadataString(row.metadata, "alert_id");
  const threadId = getMetadataString(row.metadata, "thread_id");
  const simulatorUserId = getMetadataString(row.metadata, "simulator_user_id");

  if (alertId) {
    return {
      label: `Alert ${alertId}`,
      href: threadId ? `/alerts/${alertId}?reviewThread=${encodeURIComponent(threadId)}` : `/alerts/${alertId}`,
    };
  }

  if (simulatorUserId) {
    return {
      label: `User ${simulatorUserId.slice(0, 8)}`,
      href: threadId
        ? `/users/${simulatorUserId}?reviewThread=${encodeURIComponent(threadId)}`
        : `/users/${simulatorUserId}`,
    };
  }

  return null;
}

function activityRowClass(eventType: string): string {
  if (eventType === "user_logged_in") {
    return "rounded-[1rem] border border-[rgb(196_214_236_/_0.95)] bg-[linear-gradient(180deg,rgba(243,248,255,0.98),rgba(232,241,252,0.98))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]";
  }

  return "content-panel px-3.5 py-3";
}

export function AdminAppUserActivityLog({
  appUserId,
  refreshKey,
  title = "Activity Log",
}: Props) {
  const [rows, setRows] = useState<AppUserActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!appUserId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { rows: next, error: listError } = await listAppUserActivityForAppUser(supabase, {
        appUserId,
        limit: 50,
      });
      if (cancelled) return;
      if (listError) {
        setError(listError);
        setRows([]);
      } else {
        setRows(next);
        setVisibleCount(10);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [appUserId, refreshKey]);

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const canShowMore = visibleCount < rows.length;

  if (!appUserId) return null;

  return (
    <section className="workspace-shell space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="heading-section">{title}</h2>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[3.75rem] animate-pulse rounded-[1rem] border border-slate-200/80 bg-slate-100/80"
            />
          ))}
        </div>
      ) : !error && rows.length === 0 ? (
        <p className="text-sm text-slate-500">No activity recorded yet.</p>
      ) : !error ? (
        <div className="space-y-3">
          <ul className="space-y-2.5">
            {visibleRows.map((row) => {
              const contextLink = buildActivityContextHref(row);

              return (
                <li
                  key={row.id}
                  className={`flex items-center justify-between gap-3 sm:gap-4 ${activityRowClass(row.event_type)}`}
                >
                  <div className="min-w-0 flex flex-1 items-center gap-2.5">
                    {contextLink ? (
                      <Link
                        href={contextLink.href}
                        className="ui-chip shrink-0 px-2 py-0.5 text-[0.76rem] text-slate-700 transition hover:text-[var(--brand-700)] hover:underline"
                      >
                        {contextLink.label}
                      </Link>
                    ) : null}
                    <p className="min-w-0 truncate text-sm font-medium leading-snug text-slate-900">
                      {describeAppUserActivityLine(row.event_type, row.metadata)}
                    </p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-right text-[0.72rem] leading-snug tabular-nums text-slate-500">
                    {formatDateTime(row.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
          {canShowMore ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 10)}
                className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-3.5 py-2 text-sm shadow-none"
              >
                Show more
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
