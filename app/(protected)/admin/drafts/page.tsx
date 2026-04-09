"use client";

import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { listAdminConsoleThreads, type AdminConsoleThreadListItem } from "@/lib/services/admin-review-console";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const dashedPanelClass =
  "rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500";

export default function AdminTraineeDraftsPage() {
  const { loading: userLoading, canViewAdminPanel } = useReviewWorkspaceActor();
  const [threads, setThreads] = useState<AdminConsoleThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [traineeFilter, setTraineeFilter] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!canViewAdminPanel) {
        setThreads([]);
        setLoading(false);
        return;
      }
      const supabase = createClient();
      setLoading(true);
      setError(null);
      const result = await listAdminConsoleThreads(supabase);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setThreads([]);
        setLoading(false);
        return;
      }

      setThreads(result.threads);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canViewAdminPanel, reloadTick]);

  const refreshThreads = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const draftThreads = useMemo(() => {
    const drafts = threads.filter((thread) => thread.isDraft);
    const q = traineeFilter.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter((thread) => {
      const label = (thread.traineeLabel ?? "").toLowerCase();
      const email = (thread.traineeEmail ?? "").toLowerCase();
      return label.includes(q) || email.includes(q);
    });
  }, [threads, traineeFilter]);

  if (userLoading) {
    return (
      <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
        <div className="w-full min-w-0">
          <div className={dashedPanelClass}>Loading…</div>
        </div>
      </section>
    );
  }

  if (!canViewAdminPanel) {
    return (
      <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
        <div className="w-full min-w-0 space-y-3">
          <h1 className="heading-page">Trainee drafts</h1>
          <div className={dashedPanelClass}>Access restricted to admins only.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="w-full min-w-0 space-y-4">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--brand-700)]">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/admin/review" className="hover:text-[var(--brand-700)]">
            Review queue
          </Link>{" "}
          / <span className="text-slate-700">Trainee drafts</span>
        </nav>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="heading-page">Trainee drafts</h1>
          <button
            type="button"
            onClick={() => void refreshThreads()}
            className="ui-btn min-h-0 shrink-0 rounded-[1rem] border border-[rgb(178_205_201_/_0.95)] bg-[linear-gradient(180deg,rgb(248_252_251_/_0.98),rgb(236_245_244_/_0.98))] px-4 py-2 text-sm font-medium text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_14px_rgba(18,31,46,0.08)] hover:border-[var(--brand-400)] hover:bg-[linear-gradient(180deg,rgb(242_249_248_/_0.98),rgb(226_240_239_/_0.98))] hover:text-[var(--brand-600)] hover:shadow-[0_8px_16px_rgba(18,31,46,0.1)]"
          >
            Refresh
          </button>
        </div>

        <div className="max-w-md">
          <label htmlFor="admin-drafts-trainee-filter" className="mb-1 block text-sm font-medium text-slate-600">
            Filter by trainee name or email
          </label>
          <input
            id="admin-drafts-trainee-filter"
            type="search"
            value={traineeFilter}
            onChange={(e) => setTraineeFilter(e.target.value)}
            placeholder="Type to filter…"
            className="dark-input h-10 w-full rounded-[0.7rem] px-4 text-sm"
          />
        </div>

        {loading ? (
          <div className={dashedPanelClass}>Loading drafts…</div>
        ) : draftThreads.length === 0 ? (
          <div className={dashedPanelClass}>
            {threads.filter((t) => t.isDraft).length === 0
              ? "No trainee drafts yet."
              : "No drafts match this filter."}
          </div>
        ) : (
          <ul className="space-y-3">
            {draftThreads.map((thread) => (
              <li key={thread.threadId} className="content-panel p-4">
                <div className="mt-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{`${thread.traineeLabel}'s draft${thread.traineeEmail ? ` · ${thread.traineeEmail}` : ""}`}</span>
                    <span className="tabular-nums">{thread.createdAtLabel}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="ui-chip px-2 py-0.5 text-slate-700">{thread.targetLabel}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-900">{thread.preview}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
