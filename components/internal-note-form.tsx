"use client";

import {
  buildOptionsWithCurrent,
  SimulatorFormField,
  SimulatorFormInput,
  SimulatorFormTextarea,
} from "@/components/simulator-form-primitives";
import {
  createInternalNote,
  deleteInternalNote,
  updateInternalNote,
} from "@/lib/services/internal-notes";
import { createClient } from "@/lib/supabase";
import type { AppUserRow, InternalNoteRow } from "@/lib/types";
import {
  coerceInternalNoteSignatureLabel,
  INTERNAL_NOTE_SIGNATURE_OPTIONS,
} from "@/lib/internal-note-signatures";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

const SIGNATURE_SELECT_OPTIONS = INTERNAL_NOTE_SIGNATURE_OPTIONS.map((value) => ({ value, label: value }));

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

type InternalNoteFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  userId: string;
  initialValue?: Partial<InternalNoteRow> | null;
  submitLabel?: string;
  onSaved?: (note: InternalNoteRow) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
};

export function InternalNoteForm({
  viewer,
  mode,
  userId,
  initialValue,
  submitLabel,
  onSaved,
  onDeleted,
  onCancel,
}: InternalNoteFormProps) {
  const [noteText, setNoteText] = useState(initialValue?.note_text ?? "");
  const [noteDate, setNoteDate] = useState(toDateInput(initialValue?.created_at) || new Date().toISOString().slice(0, 10));
  const [signature, setSignature] = useState(() => coerceInternalNoteSignatureLabel(initialValue?.created_by));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNoteText(initialValue?.note_text ?? "");
    setNoteDate(toDateInput(initialValue?.created_at) || new Date().toISOString().slice(0, 10));
    setSignature(coerceInternalNoteSignatureLabel(initialValue?.created_by));
  }, [initialValue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const result =
      mode === "create"
        ? await createInternalNote(supabase, viewer, {
            user_id: userId,
            note_text: noteText,
            created_at: noteDate,
            signature,
          })
        : await updateInternalNote(supabase, viewer, {
            id: String(initialValue?.id ?? ""),
            user_id: userId,
            note_text: noteText,
            created_at: noteDate,
            signature,
          });

    if (result.error || !result.note) {
      setError(result.error ?? "Could not save this note.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved?.(result.note);
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !initialValue?.id) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const result = await deleteInternalNote(supabase, viewer, String(initialValue.id));
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    setDeleting(false);
    onDeleted?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SimulatorFormField htmlFor="sim-internal-note-date" label="Note Date">
          <SimulatorFormInput
            id="sim-internal-note-date"
            type="date"
            value={noteDate}
            onChange={(event) => setNoteDate(event.target.value)}
            disabled={saving || deleting}
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-internal-note-signature" label="Signature">
          <select
            id="sim-internal-note-signature"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            disabled={saving || deleting}
            className="dark-input h-11 w-full px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60"
          >
            {buildOptionsWithCurrent(SIGNATURE_SELECT_OPTIONS, signature).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SimulatorFormField>
      </div>

      <SimulatorFormField htmlFor="sim-internal-note" label="Note">
        <SimulatorFormTextarea
          id="sim-internal-note"
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Write the analyst/predefined note here"
          disabled={saving || deleting}
        />
      </SimulatorFormField>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        {error ? <p className="mr-auto text-sm font-medium text-rose-700">{error}</p> : null}
        {mode === "edit" && onDeleted ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete note"}
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving || deleting}
          className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create note" : "Save note")}
        </button>
      </div>
    </form>
  );
}
