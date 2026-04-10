import type { ReviewSubmissionRow, SimulatorCommentRow } from "@/lib/types";

export const TRAINEE_ROOT_EDIT_MS = 5 * 60 * 1000;

export function subtreeHasAdminQa(rootId: string, all: SimulatorCommentRow[]): boolean {
  const byParent = new Map<string, SimulatorCommentRow[]>();
  for (const row of all) {
    if (!row.parent_comment_id) continue;
    const list = byParent.get(row.parent_comment_id) ?? [];
    list.push(row);
    byParent.set(row.parent_comment_id, list);
  }

  const queue = [...(byParent.get(rootId) ?? [])];
  while (queue.length) {
    const row = queue.shift()!;
    if (row.comment_type === "admin_qa") return true;
    for (const child of byParent.get(row.id) ?? []) queue.push(child);
  }

  return false;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export function formatPanelActionError(message: string): string {
  if (
    message.includes("No cases for review yet") ||
    message.includes("No review case yet") ||
    message.includes("No review thread yet")
  ) {
    return "Review workspace is still connecting. Wait a moment and try again.";
  }

  return message;
}

export function reviewSubmissionBadgeClass(state: string | null | undefined): string {
  const value = (state ?? "").trim().toLowerCase();
  if (value === "submitted") return "ui-badge-blue";
  if (value === "in_review" || value === "in review") return "ui-badge-teal";
  if (value === "changes_requested" || value === "changes requested") return "ui-badge-rose";
  if (value === "approved") return "ui-badge-emerald";
  if (value === "closed") return "ui-badge-neutral";
  return "ui-badge-neutral";
}

export function formatSubmissionStatusValue(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSubmissionEvaluationValue(value: ReviewSubmissionRow["evaluation"]) {
  if (value === "needs_work") return "Needs a full redo";
  if (value === "developing") return "On the right track";
  if (value === "solid") return "Good work";
  if (value === "excellent") return "Outstanding";
  return "Not graded";
}

export function submissionEvaluationBadgeClass(value: ReviewSubmissionRow["evaluation"]) {
  if (value === "needs_work") return "ui-badge-rose";
  if (value === "developing") return "ui-badge-amber";
  if (value === "solid") return "ui-badge-emerald";
  if (value === "excellent") return "ui-badge-blue";
  return "ui-badge-neutral";
}

const THREAD_ACTION_BASE =
  "ui-btn min-h-0 rounded-[1rem] px-3 py-1.5 text-xs font-semibold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-60";

export const THREAD_ACTION_PRIMARY = `${THREAD_ACTION_BASE} ui-btn-primary`;
export const THREAD_ACTION_SECONDARY = `${THREAD_ACTION_BASE} ui-btn-secondary text-[var(--brand-700)]`;
export const THREAD_ACTION_SECONDARY_NEUTRAL = `${THREAD_ACTION_BASE} ui-btn-secondary`;
export const THREAD_ACTION_SAVE = `${THREAD_ACTION_BASE} border border-[rgb(178_205_201_/_0.95)] bg-[linear-gradient(180deg,rgb(248_252_251_/_0.98),rgb(236_245_244_/_0.98))] text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_14px_rgba(18,31,46,0.08)] hover:border-[var(--brand-400)] hover:bg-[linear-gradient(180deg,rgb(242_249_248_/_0.98),rgb(226_240_239_/_0.98))] hover:text-[var(--brand-600)] hover:shadow-[0_8px_16px_rgba(18,31,46,0.1)]`;
export const THREAD_ACTION_DESTRUCTIVE = `${THREAD_ACTION_BASE} border border-[rgb(149_52_63_/_0.26)] bg-white text-[var(--brand-dot)] shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:border-[rgb(149_52_63_/_0.44)] hover:bg-[rgb(149_52_63_/_0.06)]`;
