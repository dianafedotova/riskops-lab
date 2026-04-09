"use client";

import { AdminPeoplePanel } from "@/components/admin-people-panel";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import Link from "next/link";

const dashedPanelClass =
  "rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500";

export default function AdminPeoplePage() {
  const { loading: userLoading, canViewAdminPanel } = useReviewWorkspaceActor();

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
          <h1 className="heading-page">People</h1>
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
          / <span className="text-slate-700">People</span>
        </nav>

        <h1 className="heading-page">People</h1>

        <AdminPeoplePanel />
      </div>
    </section>
  );
}
