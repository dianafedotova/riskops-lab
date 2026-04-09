"use client";

import { AdminCasesCatalog } from "@/components/admin-cases-catalog";
import { AdminSubmittedThreadSection } from "@/components/admin-submitted-thread-section";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";

function formatActorLabel(
  fullName: string | null | undefined,
  email: string | null | undefined,
  fallback: string
): string {
  const normalizedName = (fullName ?? "").trim();
  const normalizedEmail = (email ?? "").trim();
  if (normalizedName && normalizedEmail) return `${normalizedName} · ${normalizedEmail}`;
  return normalizedName || normalizedEmail || fallback;
}

const dashedPanelClass =
  "rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500";

export default function AdminReviewQueuePage() {
  const { appUser, loading: userLoading, canViewAdminPanel } = useReviewWorkspaceActor();
  const [reloadTick, setReloadTick] = useState(0);

  const refreshQueue = useCallback(() => {
    setReloadTick((k) => k + 1);
  }, []);

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
          <h1 className="heading-page">Review queue</h1>
          <div className={dashedPanelClass}>Access restricted to admins only.</div>
        </div>
      </section>
    );
  }

  const currentStaffLabel = formatActorLabel(appUser?.full_name, appUser?.email, "Staff");

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="w-full min-w-0 space-y-6">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-[var(--brand-700)]">
            Home
          </Link>{" "}
          / <span className="text-slate-700">Review queue</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="heading-page">Review queue</h1>
          <button
            type="button"
            onClick={() => void refreshQueue()}
            className="ui-btn min-h-0 shrink-0 rounded-[1rem] border border-[rgb(178_205_201_/_0.95)] bg-[linear-gradient(180deg,rgb(248_252_251_/_0.98),rgb(236_245_244_/_0.98))] px-4 py-2 text-sm font-medium text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_14px_rgba(18,31,46,0.08)] hover:border-[var(--brand-400)] hover:bg-[linear-gradient(180deg,rgb(242_249_248_/_0.98),rgb(226_240_239_/_0.98))] hover:text-[var(--brand-600)] hover:shadow-[0_8px_16px_rgba(18,31,46,0.1)]"
          >
            Refresh
          </button>
        </div>

        <Suspense fallback={<div className={dashedPanelClass}>Loading review queue…</div>}>
          <AdminCasesCatalog
            hidePageChrome
            embedTab="submitted"
            refreshKey={reloadTick}
            renderExpandedBody={({ row, thread, detailLoading, detailError }) => {
              if (detailLoading) {
                return <div className={dashedPanelClass}>Loading review workspace…</div>;
              }
              if (detailError) {
                return <p className="text-sm text-rose-600">{detailError}</p>;
              }
              if (!thread) {
                return <p className="text-sm text-slate-500">This case could not be loaded.</p>;
              }
              if (row.casePhase === "draft" || thread.isDraft) {
                return (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {`${thread.traineeLabel}'s draft${thread.traineeEmail ? ` · ${thread.traineeEmail}` : ""}`}
                      </span>
                      <span className="tabular-nums">{thread.createdAtLabel}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="ui-chip px-2 py-0.5 text-slate-700">{thread.targetLabel}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-900">{thread.preview}</p>
                  </div>
                );
              }
              return (
                <AdminSubmittedThreadSection
                  thread={thread}
                  appUserId={appUser?.id ?? null}
                  appUserRole={appUser?.role ?? null}
                  currentStaffLabel={currentStaffLabel}
                />
              );
            }}
          />
        </Suspense>
      </div>
    </section>
  );
}
