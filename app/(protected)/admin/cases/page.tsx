import { AdminCasesCatalog } from "@/components/admin-cases-catalog";
import { Suspense } from "react";

export default function AdminCasesPage() {
  return (
    <Suspense
      fallback={
        <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
          <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
            Loading review queue…
          </div>
        </section>
      }
    >
      <AdminCasesCatalog />
    </Suspense>
  );
}
