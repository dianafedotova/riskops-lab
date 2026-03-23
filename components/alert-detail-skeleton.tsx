export function AlertDetailSkeleton() {
  return (
    <section className="page-panel space-y-4 p-4 sm:p-6">
      <div className="h-4 w-56 animate-pulse rounded-md bg-slate-200" />
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        </div>
        <aside className="lg:col-span-4">
          <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        </aside>
      </div>
    </section>
  );
}
