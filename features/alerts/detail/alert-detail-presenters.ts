import type { AlertRow, ReviewSubmissionRow } from "@/lib/types";

export type Decision = "false_positive" | "true_positive" | "info_requested" | "escalated";

export type AlertWithRuleCode = AlertRow & {
  rule_code?: string | null;
  rule_name?: string | null;
};

export const ALERT_DETAIL_COLS =
  "id, internal_id, user_id, alert_type, severity, status, description, rule_code, rule_name, created_at, updated_at, alert_date, decision" as const;

export const ALERT_DECISION_OPTIONS = [
  ["info_requested", "Info requested"],
  ["escalated", "Escalated"],
  ["false_positive", "False Positive"],
  ["true_positive", "True Positive"],
] as const satisfies ReadonlyArray<readonly [Decision, string]>;

export const DECISION_BUTTON_BASE =
  "ui-btn min-h-0 justify-center rounded-[1rem] px-4 py-2 text-sm font-semibold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50";

export function proposedStatusForDecision(decision: Decision): string {
  if (decision === "false_positive") return "resolved";
  if (decision === "true_positive") return "resolved";
  if (decision === "info_requested") return "in_review";
  return "in_review";
}

export function getDecisionLabel(decision: string | null | undefined): string {
  const normalized = (decision ?? "").trim();
  if (!normalized) return "Not set";
  if (normalized === "false_positive") return "False Positive";
  if (normalized === "true_positive") return "True Positive";
  if (normalized === "info_requested") return "Info requested";
  if (normalized === "escalated") return "Escalated";
  return normalized;
}

export function formatRuleDisplay(ruleCode: string | null | undefined, ruleName: string | null | undefined): string {
  const code = (ruleCode ?? "").trim();
  const name = (ruleName ?? "").trim();
  if (!code && !name) return "—";
  if (code && name) return `${code}: ${name}`;
  return code || name;
}

export function formatSeverityLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatStatusLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "—";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function statusBadgeClass(status: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "open") return "ui-badge-blue";
  if (normalized === "in review") return "ui-badge-teal";
  if (normalized === "resolved") return "ui-badge-neutral";
  if (normalized === "closed") return "ui-badge-neutral";
  if (normalized === "monitoring") return "ui-badge-amber";
  if (normalized === "escalated") return "ui-badge-violet";
  return "ui-badge-neutral";
}

export function severityBadgeClass(severity: string | null) {
  const normalized = (severity ?? "").trim().toLowerCase();
  if (normalized === "critical") return "ui-badge-rose";
  if (normalized === "high") return "ui-badge-rose";
  if (normalized === "medium") return "ui-badge-amber";
  if (normalized === "low") return "ui-badge-emerald";
  return "ui-badge-neutral";
}

export function typeBadgeClass(type: string | null) {
  const normalized = (type ?? "").trim().toLowerCase();
  if (normalized === "aml") return "ui-badge-indigo";
  if (normalized === "fraud") return "ui-badge-blue";
  return "ui-badge-neutral";
}

export function decisionBadgeClass(decision: string | null | undefined) {
  const normalized = (decision ?? "").trim();
  if (!normalized) return "ui-badge-neutral";
  if (normalized === "false_positive") return "ui-badge-emerald";
  if (normalized === "true_positive") return "ui-badge-rose";
  if (normalized === "info_requested") return "ui-badge-teal";
  if (normalized === "escalated") return "ui-badge-amber";
  return "ui-badge-neutral";
}

export function reviewSubmissionStateBadgeClass(state: string | null | undefined) {
  const value = (state ?? "").trim().toLowerCase();
  if (value === "submitted") return "ui-badge-blue";
  if (value === "in_review") return "ui-badge-teal";
  if (value === "changes_requested") return "ui-badge-rose";
  if (value === "approved") return "ui-badge-emerald";
  return "ui-badge-neutral";
}

export function formatReviewSubmissionState(state: string | null | undefined): string {
  const value = (state ?? "").trim().toLowerCase();
  if (!value) return "Draft case";
  if (value === "in_review") return "In review";
  if (value === "changes_requested") return "Changes requested";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

export function formatReviewEvaluation(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Not graded";
  if (normalized === "needs_work") return "Needs a full redo";
  if (normalized === "developing") return "On the right track";
  if (normalized === "solid") return "Good work";
  if (normalized === "excellent") return "Outstanding";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replaceAll("_", " ");
}

export function shortThreadId(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  if (!normalized) return "—";
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 8)}…${normalized.slice(-4)}`;
}

export function decisionOptionClass(key: Decision, selected: boolean) {
  if (selected) {
    if (key === "info_requested") {
      return "border border-[rgb(101_139_147_/_0.94)] bg-[linear-gradient(180deg,rgb(123_162_169_/_0.98),rgb(92_130_138_/_0.98))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_16px_rgba(24,42,59,0.15)]";
    }
    if (key === "false_positive") {
      return "border border-transparent bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)] hover:bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
    }
    if (key === "true_positive") {
      return "border border-transparent bg-[linear-gradient(180deg,var(--brand-dot),#7f1724)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_18px_rgba(24,42,59,0.2)]";
    }
    if (key === "escalated") {
      return "border border-transparent bg-[linear-gradient(180deg,var(--warning-600),#9a6a36)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_18px_rgba(24,42,59,0.2)]";
    }
    return "ui-btn-primary";
  }
  if (key === "info_requested") {
    return "ui-btn-secondary border-[rgb(193_221_226_/_0.95)] bg-[linear-gradient(180deg,rgb(255_255_255_/_0.98),rgb(243_249_250_/_0.98))] text-[rgb(57_103_112)] shadow-[0_6px_12px_rgba(120,160,168,0.05)] hover:border-[rgb(160_196_202_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(236_247_248_/_0.98),rgb(223_239_242_/_0.98))] hover:text-[rgb(48_90_98)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_14px_rgba(120,160,168,0.1)]";
  }
  if (key === "escalated") {
    return "ui-btn-secondary border-amber-300 text-[var(--warning-600)] shadow-none hover:border-[rgb(191_144_84_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(250_242_220_/_0.98),rgb(243_229_193_/_0.98))] hover:text-[var(--warning-600)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_18px_rgba(24,42,59,0.12)]";
  }
  if (key === "false_positive") {
    return "ui-btn-secondary border-[rgb(196_220_214_/_0.95)] text-[var(--brand-700)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
  }
  return "ui-btn-secondary border-[rgb(221_189_196_/_0.94)] text-[var(--brand-dot)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-dot),#7f1724)] hover:text-white hover:shadow-[0_10px_18px_rgba(24,42,59,0.18)]";
}

export function latestReviewSubmission(submissions: ReviewSubmissionRow[]): ReviewSubmissionRow | null {
  if (!submissions.length) return null;
  return submissions.reduce<ReviewSubmissionRow | null>((latest, submission) => {
    if (!latest) return submission;
    if (submission.submission_version > latest.submission_version) return submission;
    return latest;
  }, null);
}
