import type {
  CreateInternalNoteInput,
  InternalNoteRow,
  UpdateInternalNoteInput,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureStaffViewer,
  ensureVisibleUsers,
  normalizeDateTime,
  normalizeRequiredText,
  type StaffViewer,
} from "@/lib/services/simulator-shared";
import { normalizeInternalNoteSignature } from "@/lib/internal-note-signatures";
import { shouldRetryWithLegacyShape } from "@/shared/lib/schema-compat";

type RawInternalNoteRow = {
  id: string;
  user_id: string;
  note_text?: string | null;
  text?: string | null;
  created_at: string;
  created_by: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

const INTERNAL_NOTE_SELECT_ATTEMPTS = [
  'id, user_id, note_text, "text", created_at, created_by, updated_at, updated_by',
  "id, user_id, note_text, created_at, created_by, updated_at, updated_by",
  'id, user_id, note_text, "text", created_at, created_by',
  "id, user_id, note_text, created_at, created_by",
  'id, user_id, "text", created_at, created_by',
  "*",
] as const;
const INTERNAL_NOTE_RICH_SELECT =
  "id, user_id, note_text, created_at, created_by, updated_at, updated_by" as const;

function mapInternalNoteRows(rows: RawInternalNoteRow[]): InternalNoteRow[] {
  return rows.map((row) => {
    const noteText = (row.note_text ?? row.text ?? "").trim();
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      note_text: noteText.length > 0 ? noteText : "—",
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at ?? null,
      updated_by: row.updated_by ?? null,
    };
  });
}

async function selectInternalNoteRow(
  supabase: SupabaseClient,
  noteId: string
): Promise<{ note: InternalNoteRow | null; error: string | null }> {
  for (const columns of INTERNAL_NOTE_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("internal_notes")
      .select(columns)
      .eq("id", noteId)
      .maybeSingle();

    if (error) {
      if (shouldRetryWithLegacyShape(error.message)) continue;
      return { note: null, error: error.message };
    }

    const rows = mapInternalNoteRows(data ? [data as unknown as RawInternalNoteRow] : []);
    return { note: rows[0] ?? null, error: null };
  }

  return { note: null, error: "Could not load the saved note." };
}

export async function listInternalNotesForSimulatorUser(
  supabase: SupabaseClient,
  simulatorUserId: string
): Promise<{ notes: InternalNoteRow[]; error: string | null }> {
  const candidateIds = Array.from(
    new Set([simulatorUserId, simulatorUserId.trim(), simulatorUserId.trim().toLowerCase()].filter(Boolean))
  );

  let notes: InternalNoteRow[] = [];
  let loadError: string | null = null;

  outer: for (const candidateId of candidateIds) {
    for (const columns of INTERNAL_NOTE_SELECT_ATTEMPTS) {
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

export async function createInternalNote(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateInternalNoteInput
): Promise<{ note: InternalNoteRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { note: null, error: viewerError };

  const errors: string[] = [];
  const userId = normalizeRequiredText(input.user_id, "User", errors);
  const noteText = normalizeRequiredText(input.note_text, "Note text", errors);
  if (errors.length > 0) return { note: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [userId!]);
  if (visibleUsers.error) return { note: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(userId!)) {
    return { note: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const createdAt = normalizeDateTime(input.created_at, "Note date", errors) ?? new Date().toISOString();
  const signature = normalizeInternalNoteSignature(input.signature, errors);
  if (errors.length > 0) return { note: null, error: errors.join(" ") };
  const richInsert = await supabase
    .from("internal_notes")
    .insert({
      user_id: userId,
      note_text: noteText,
      created_at: createdAt,
      created_by: signature,
      updated_by: signature,
      updated_at: new Date().toISOString(),
    })
    .select(INTERNAL_NOTE_RICH_SELECT)
    .single();

  if (richInsert.error && !shouldRetryWithLegacyShape(richInsert.error.message)) {
    return { note: null, error: richInsert.error.message };
  }

  let createdId: string | null = null;
  if (!richInsert.error) {
    createdId = String((richInsert.data as RawInternalNoteRow).id);
  } else {
    const legacyInsert = await supabase
      .from("internal_notes")
      .insert({
        user_id: userId,
        note_text: noteText,
        created_at: createdAt,
        text: noteText,
        created_by: signature,
      })
      .select('id, user_id, note_text, "text", created_at, created_by')
      .single();

    if (legacyInsert.error) return { note: null, error: legacyInsert.error.message };
    createdId = String((legacyInsert.data as RawInternalNoteRow).id);
  }

  return selectInternalNoteRow(supabase, createdId);
}

export async function updateInternalNote(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateInternalNoteInput
): Promise<{ note: InternalNoteRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { note: null, error: viewerError };

  const errors: string[] = [];
  const userId = normalizeRequiredText(input.user_id, "User", errors);
  const noteText = normalizeRequiredText(input.note_text, "Note text", errors);
  if (errors.length > 0) return { note: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [userId!]);
  if (visibleUsers.error) return { note: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(userId!)) {
    return { note: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const createdAt = normalizeDateTime(input.created_at, "Note date", errors);
  const signature = normalizeInternalNoteSignature(input.signature, errors);
  if (errors.length > 0) return { note: null, error: errors.join(" ") };
  const richUpdate = await supabase
    .from("internal_notes")
    .update({
      user_id: userId,
      note_text: noteText,
      created_at: createdAt ?? undefined,
      created_by: signature,
      updated_by: signature,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(INTERNAL_NOTE_RICH_SELECT)
    .single();

  if (richUpdate.error && !shouldRetryWithLegacyShape(richUpdate.error.message)) {
    return { note: null, error: richUpdate.error.message };
  }

  if (richUpdate.error) {
    const legacyUpdate = await supabase
      .from("internal_notes")
      .update({
        user_id: userId,
        note_text: noteText,
        created_at: createdAt ?? undefined,
        created_by: signature,
        text: noteText,
      })
      .eq("id", input.id)
      .select('id, user_id, note_text, "text", created_at, created_by')
      .single();

    if (legacyUpdate.error) return { note: null, error: legacyUpdate.error.message };
  }

  return selectInternalNoteRow(supabase, input.id);
}

export async function deleteInternalNote(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  noteId: string
): Promise<{ error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { error: viewerError };

  const { error } = await supabase.from("internal_notes").delete().eq("id", noteId);
  if (error) return { error: error.message };
  return { error: null };
}
