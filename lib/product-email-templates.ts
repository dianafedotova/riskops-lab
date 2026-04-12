import type { AlertReviewAssignmentPriority } from "@/lib/services/alert-review-assignments";
import type { ReviewSubmissionEvaluation, ReviewSubmissionState } from "@/lib/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPersonLabel(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed || "there";
}

function humanizeReviewState(value: ReviewSubmissionState): string {
  if (value === "changes_requested") return "Changes requested";
  if (value === "in_review") return "In review";
  if (value === "approved") return "Approved";
  if (value === "closed") return "Closed";
  return "Submitted";
}

function humanizeEvaluation(value: ReviewSubmissionEvaluation | null | undefined): string | null {
  if (value === "needs_work") return "Needs a full redo";
  if (value === "developing") return "On the right track";
  if (value === "solid") return "Good work";
  if (value === "excellent") return "Outstanding";
  return null;
}

function humanizePriority(value: AlertReviewAssignmentPriority): string {
  if (value === "urgent") return "Urgent";
  if (value === "high") return "High";
  if (value === "low") return "Low";
  return "Normal";
}

function formatDueDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function buttonHtml(href: string, label: string): string {
  return `<p style="margin:24px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;border-radius:12px;background:#23435c;color:#ffffff;padding:12px 18px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}

function emailFrame(title: string, intro: string, bodyHtml: string): { html: string } {
  return {
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f7fb;color:#162433;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="border:1px solid rgba(35,67,92,0.12);border-radius:20px;background:#ffffff;padding:28px 24px;box-shadow:0 16px 40px rgba(22,36,51,0.08);">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a7f93;">RiskOps Lab</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#162433;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#3d5368;">${escapeHtml(intro)}</p>
        ${bodyHtml}
      </div>
    </div>
  </body>
</html>`,
  };
}

export function buildCaseReviewedEmailContent(args: {
  alertId: string | null;
  caseUrl: string;
  evaluation: ReviewSubmissionEvaluation | null;
  feedback: string | null;
  recipientName: string | null;
  reviewState: ReviewSubmissionState;
  reviewerName: string | null;
}): { html: string; subject: string; text: string } {
  const greeting = formatPersonLabel(args.recipientName);
  const evaluation = humanizeEvaluation(args.evaluation);
  const reviewState = humanizeReviewState(args.reviewState);
  const reviewer = formatPersonLabel(args.reviewerName);
  const alertLabel = (args.alertId ?? "").trim() || "your case";
  const feedback = (args.feedback ?? "").trim();

  const title = `Your case review is ready`;
  const intro = `Hi ${greeting}, your latest submission for ${alertLabel} was updated to ${reviewState.toLowerCase()}.`;
  const details = [
    `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Review status:</strong> ${escapeHtml(reviewState)}</p>`,
    evaluation
      ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Evaluation:</strong> ${escapeHtml(evaluation)}</p>`
      : "",
    reviewer && reviewer !== "there"
      ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Reviewed by:</strong> ${escapeHtml(reviewer)}</p>`
      : "",
    feedback
      ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#223446;"><strong>Review note:</strong><br>${escapeHtml(feedback)}</p>`
      : `<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#223446;">Open the case to read the latest reviewer notes and next steps.</p>`,
    buttonHtml(args.caseUrl, "Open case review"),
  ].filter(Boolean);

  const textLines = [
    `Hi ${greeting},`,
    ``,
    `Your latest submission for ${alertLabel} was updated to ${reviewState.toLowerCase()}.`,
    evaluation ? `Evaluation: ${evaluation}` : null,
    reviewer && reviewer !== "there" ? `Reviewed by: ${reviewer}` : null,
    feedback ? `Review note: ${feedback}` : `Open the case to read the latest reviewer notes and next steps.`,
    ``,
    `Open case review: ${args.caseUrl}`,
  ].filter(Boolean) as string[];

  return {
    subject: `Case review updated: ${reviewState}`,
    text: textLines.join("\n"),
    ...emailFrame(title, intro, details.join("")),
  };
}

export function buildAlertAssignedEmailContent(args: {
  alertId: string;
  alertUrl: string;
  assignerName: string | null;
  dueAt: string | null;
  priority: AlertReviewAssignmentPriority;
  recipientName: string | null;
}): { html: string; subject: string; text: string } {
  const greeting = formatPersonLabel(args.recipientName);
  const priority = humanizePriority(args.priority);
  const dueDate = formatDueDate(args.dueAt);
  const assigner = formatPersonLabel(args.assignerName);

  const title = "A new alert is waiting for review";
  const intro = `Hi ${greeting}, alert ${args.alertId} has been assigned to you in RiskOps Lab.`;
  const details = [
    `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Alert:</strong> ${escapeHtml(args.alertId)}</p>`,
    `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Priority:</strong> ${escapeHtml(priority)}</p>`,
    dueDate
      ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Due date:</strong> ${escapeHtml(dueDate)}</p>`
      : `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Due date:</strong> No due date set.</p>`,
    assigner && assigner !== "there"
      ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#223446;"><strong>Assigned by:</strong> ${escapeHtml(assigner)}</p>`
      : "",
    `<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#223446;">Open the alert to start your investigation or pick up the latest context.</p>`,
    buttonHtml(args.alertUrl, "Open assigned alert"),
  ].filter(Boolean);

  const textLines = [
    `Hi ${greeting},`,
    ``,
    `Alert ${args.alertId} has been assigned to you in RiskOps Lab.`,
    `Priority: ${priority}`,
    dueDate ? `Due date: ${dueDate}` : `Due date: No due date set.`,
    assigner && assigner !== "there" ? `Assigned by: ${assigner}` : null,
    ``,
    `Open assigned alert: ${args.alertUrl}`,
  ].filter(Boolean) as string[];

  return {
    subject: `New alert assignment: ${args.alertId}`,
    text: textLines.join("\n"),
    ...emailFrame(title, intro, details.join("")),
  };
}
