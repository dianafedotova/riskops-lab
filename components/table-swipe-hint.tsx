/** Shown on small screens only — reminds users that wide tables scroll horizontally. */
export function TableSwipeHint() {
  return (
    <p className="mb-2 flex items-center justify-center gap-2 border-b border-slate-200/90 pb-2 text-center text-xs leading-snug text-slate-600 sm:hidden">
      <span aria-hidden className="select-none text-slate-400">
        ←
      </span>
      <span>Swipe sideways to see all columns</span>
      <span aria-hidden className="select-none text-slate-400">
        →
      </span>
    </p>
  );
}
