import { formatEventType } from "@/lib/format";

function decisionLabel(decision: unknown): string {
  const d = typeof decision === "string" ? decision.trim() : "";
  if (!d) return "Updated";
  if (d === "false_positive") return "False positive";
  if (d === "true_positive") return "True positive";
  if (d === "info_requested") return "Info requested";
  if (d === "escalated") return "Escalated";
  return d.replace(/_/g, " ");
}

function proposedStatusLabel(status: unknown): string {
  const s = typeof status === "string" ? status.trim().replace(/_/g, " ") : "";
  return s ? s : "status";
}

function reviewStateLabel(state: unknown): string {
  const s = typeof state === "string" ? state.trim().toLowerCase() : "";
  if (s === "changes_requested") return "Changes requested";
  if (s === "in_review") return "In review";
  if (s === "approved") return "Approved";
  if (s === "closed") return "Closed";
  if (s === "submitted") return "Submitted";
  return s ? s.replace(/_/g, " ") : "Updated";
}

/** Human-readable line for the trainee alert activity feed (English UI copy). */
export function describeTraineeAlertActivityLine(eventType: string, metadata: Record<string, unknown>): string {
  switch (eventType) {
    case "trainee_alert_review_thread_created":
      return "Created a new review draft case";
    case "review_submission_created": {
      const v = metadata.submission_version;
      if (typeof v === "number") {
        return `Submitted work for review (version ${v})`;
      }
      return "Submitted work for review";
    }
    case "trainee_decision_submitted": {
      const d = decisionLabel(metadata.decision);
      const st = proposedStatusLabel(metadata.proposed_alert_status);
      return `Recorded decision: ${d} (proposed alert ${st})`;
    }
    case "alert_assignment_assigned":
      return "Took assignment for this alert";
    case "alert_assignment_unassigned":
      return "Released assignment for this alert";
    case "review_submission_reviewed": {
      return `Review update: ${reviewStateLabel(metadata.review_state)}`;
    }
    default:
      return formatEventType(eventType);
  }
}
