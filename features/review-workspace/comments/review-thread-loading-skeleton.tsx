export function ReviewThreadLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="h-5 w-[20rem] rounded-full bg-slate-200/80" />
            <div className="h-4 w-28 rounded-full bg-slate-200/75" />
          </div>
          <div className="h-16 rounded-[1rem] bg-slate-100/90" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-slate-100/90" />
            <div className="h-4 w-[78%] rounded-full bg-slate-100/90" />
          </div>
          <div className="border-t border-slate-200/80 pt-4">
            <div className="ml-auto h-12 w-[10rem] rounded-[1rem] bg-slate-100/90" />
          </div>
        </div>
      </div>
    </div>
  );
}
