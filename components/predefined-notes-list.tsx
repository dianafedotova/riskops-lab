"use client";

import { formatDate } from "@/lib/format";

type Note = {
  id: string;
  note_text: string;
  created_at: string;
  created_by: string | null;
};

type Props = {
  title?: string;
  notes: Note[];
  emptyMessage?: string;
};

/** Canonical analyst / predefined notes only (no trainee simulator data). */
export function PredefinedNotesList({
  notes,
  emptyMessage = "No notes yet.",
}: Props) {
  const items = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="content-panel p-3 text-sm text-slate-800">
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>{n.created_by ?? "—"}</span>
                <span className="tabular-nums">{formatDate(n.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-900">{n.note_text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
