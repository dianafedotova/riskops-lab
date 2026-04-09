import type { TraineeCasePhase } from "@/lib/trainee-cases";

/** Semantic `ui-badge-*` for trainee case lifecycle (aligned with review submission badges in the product). */
export function traineeCasePhaseBadgeClass(phase: TraineeCasePhase): string {
  switch (phase) {
    case "draft":
      return "ui-badge-neutral";
    case "submitted":
      return "ui-badge-blue";
    case "in_review":
      return "ui-badge-teal";
    case "changes_requested":
      return "ui-badge-rose";
    case "approved":
      return "ui-badge-emerald";
    case "closed":
      return "ui-badge-neutral";
  }
}

/** Alert list / row status chips (same rules as `alertStatusBadgeClass` in review-submissions-panel). */
export function alertRowStatusBadgeClass(status: string | null | undefined): string {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "open") return "ui-badge-blue";
  if (value === "in_review" || value === "in review") return "ui-badge-teal";
  if (value === "resolved") return "ui-badge-neutral";
  if (value === "closed") return "ui-badge-neutral";
  if (value === "monitoring") return "ui-badge-amber";
  if (value === "escalated") return "ui-badge-violet";
  return "ui-badge-neutral";
}

/** Simulator user account status chips (same rules as `userStatusBadgeClass` in review-submissions-panel). */
export function simulatorUserStatusBadgeClass(status: string | null | undefined): string {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "active") return "ui-badge-emerald";
  if (value === "restricted") return "ui-badge-amber";
  if (value === "blocked" || value === "closed") return "ui-badge-rose";
  if (value === "not_active" || value === "not active") return "ui-badge-neutral";
  return "ui-badge-neutral";
}
