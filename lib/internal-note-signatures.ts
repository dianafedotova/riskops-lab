/** Canonical signatures for predefined (staff) internal notes on simulator user profiles. */
export const INTERNAL_NOTE_SIGNATURE_OPTIONS = [
  "analyst@riskopslab.com",
  "supportagent@riskopslab.com",
] as const;

export type InternalNoteSignatureOption = (typeof INTERNAL_NOTE_SIGNATURE_OPTIONS)[number];

/** Map stored `created_by` to a known option for the UI; unknown values fall back to the first option. */
export function coerceInternalNoteSignatureLabel(
  stored: string | null | undefined
): InternalNoteSignatureOption {
  const raw = (stored ?? "").trim();
  if (!raw) return INTERNAL_NOTE_SIGNATURE_OPTIONS[0];
  return (
    INTERNAL_NOTE_SIGNATURE_OPTIONS.find((o) => o.toLowerCase() === raw.toLowerCase()) ??
    INTERNAL_NOTE_SIGNATURE_OPTIONS[0]
  );
}

export function normalizeInternalNoteSignature(
  input: string | null | undefined,
  errors: string[]
): InternalNoteSignatureOption | null {
  const raw = (input ?? "").trim();
  if (!raw) return INTERNAL_NOTE_SIGNATURE_OPTIONS[0];
  const found = INTERNAL_NOTE_SIGNATURE_OPTIONS.find((o) => o.toLowerCase() === raw.toLowerCase());
  if (!found) {
    errors.push(`Signature must be one of: ${INTERNAL_NOTE_SIGNATURE_OPTIONS.join(", ")}.`);
    return null;
  }
  return found;
}
