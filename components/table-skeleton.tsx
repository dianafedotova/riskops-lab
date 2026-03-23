type TableSkeletonProps = {
  rows?: number;
  cols?: number;
};

export function TableSkeleton({ rows = 6, cols = 6 }: TableSkeletonProps) {
  return (
    <tbody aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-200/70 odd:bg-slate-50/40">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-2">
              <div
                className="h-3.5 rounded-md bg-slate-200/90"
                style={{ width: j === 0 ? "42%" : `${55 + (j % 3) * 12}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
