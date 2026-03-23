export function UserProfileSkeleton() {
  return (
    <section className="page-panel space-y-4 p-4 sm:p-6">
      <div className="h-4 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="h-8 w-64 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 xl:grid-cols-12">
        <aside className="min-w-0 space-y-4 xl:col-span-4">
          <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </aside>
        <div className="min-w-0 space-y-4 xl:col-span-8">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-24 animate-pulse rounded-md bg-slate-200" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100" />
        </div>
      </div>
    </section>
  );
}
