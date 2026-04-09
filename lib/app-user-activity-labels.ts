import { formatEventType } from "@/lib/format";

function reviewStateLabel(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Updated review";
  return raw
    .replaceAll("_", " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function describeAppUserActivityLine(eventType: string, metadata: Record<string, unknown>): string {
  switch (eventType) {
    case "user_logged_in": {
      const provider = typeof metadata.provider === "string" ? metadata.provider.trim().toLowerCase() : "";
      if (provider === "google") return "Signed in with Google";
      if (provider) return `Signed in with ${provider}`;
      return "Signed in";
    }
    case "alert_assignment_assigned":
      return "Assigned alert to workspace";
    case "alert_assignment_unassigned":
      return "Removed alert from workspace";
    case "watchlist_item_added":
      return "Added a user to watchlist";
    case "watchlist_item_removed":
      return "Removed a user from watchlist";
    case "trainee_alert_review_thread_created":
      return "Created a new review draft case";
    case "trainee_profile_review_thread_created":
      return "Created a new profile review draft case";
    case "trainee_decision_submitted": {
      const decision = typeof metadata.decision === "string" ? metadata.decision.replaceAll("_", " ") : "decision";
      const proposed = typeof metadata.proposed_alert_status === "string" ? metadata.proposed_alert_status.trim() : "";
      const decisionLabel = decision.replace(/\b\w/g, (ch) => ch.toUpperCase());
      return proposed ? `Recorded decision: ${decisionLabel} (${proposed})` : `Recorded decision: ${decisionLabel}`;
    }
    case "review_submission_created": {
      const version = typeof metadata.submission_version === "number" ? metadata.submission_version : null;
      return version ? `Submitted work for review (v${version})` : "Submitted work for review";
    }
    case "review_submission_reviewed":
      return reviewStateLabel(metadata.review_state);
    case "qa_reply_created":
      return "Reviewer sent a reply";
    case "private_note_created":
      return "Saved an internal note";
    default:
      return formatEventType(eventType);
  }
}
