"use client";

import { formatDateTime } from "@/lib/format";

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
  title = "Analyst notes",
  notes,
  emptyMessage = "No notes yet.",
}: Props) {
  const items = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return (
    <div className="rounded-xl bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 shadow-sm">
      <h2 className="heading-section mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>{n.created_by ?? "—"}</span>
                <span className="tabular-nums">{formatDateTime(n.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-900">{n.note_text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
