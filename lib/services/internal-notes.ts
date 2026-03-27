import type { InternalNoteRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RawInternalNoteRow = {
  id: string;
  user_id: string;
  note_text?: string | null;
  text?: string | null;
  created_at: string;
  created_by: string | null;
};

function mapInternalNoteRows(rows: RawInternalNoteRow[]): InternalNoteRow[] {
  return rows.map((row) => {
    const noteText = (row.note_text ?? row.text ?? "").trim();
    return {
      id: row.id,
      user_id: row.user_id,
      note_text: noteText.length > 0 ? noteText : "—",
      created_at: row.created_at,
      created_by: row.created_by,
    };
  });
}

export async function listInternalNotesForSimulatorUser(
  supabase: SupabaseClient,
  simulatorUserId: string
): Promise<{ notes: InternalNoteRow[]; error: string | null }> {
  const noteSelectAttempts = [
    'id, user_id, note_text, "text", created_at, created_by',
    "id, user_id, note_text, created_at, created_by",
    'id, user_id, "text", created_at, created_by',
    "*",
  ] as const;

  const candidateIds = Array.from(
    new Set([simulatorUserId, simulatorUserId.trim(), simulatorUserId.trim().toLowerCase()].filter(Boolean))
  );

  let notes: InternalNoteRow[] = [];
  let loadError: string | null = null;

  outer: for (const candidateId of candidateIds) {
    for (const columns of noteSelectAttempts) {
      const { data, error } = await supabase
        .from("internal_notes")
        .select(columns)
        .eq("user_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) {
        loadError = error.message;
        continue;
      }

      notes = mapInternalNoteRows(((data ?? []) as unknown) as RawInternalNoteRow[]);
      loadError = null;

      if (notes.length > 0) {
        break outer;
      }
      break;
    }
  }

  return { notes, error: loadError };
}
