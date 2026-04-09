import { describeTraineeAlertActivityLine } from "@/lib/alert-activity-labels";
import { describe, expect, it } from "vitest";

describe("describeTraineeAlertActivityLine", () => {
  it("describes known trainee alert events", () => {
    expect(
      describeTraineeAlertActivityLine("trainee_alert_review_thread_created", {})
    ).toBe("Created a new review draft case");

    expect(
      describeTraineeAlertActivityLine("review_submission_created", { submission_version: 2 })
    ).toBe("Submitted work for review (version 2)");

    expect(
      describeTraineeAlertActivityLine("trainee_decision_submitted", {
        decision: "false_positive",
        proposed_alert_status: "resolved",
      })
    ).toBe("Recorded decision: False positive (proposed alert resolved)");

    expect(describeTraineeAlertActivityLine("alert_assignment_assigned", {})).toBe(
      "Took assignment for this alert"
    );
  });

  it("falls back to formatted event type for unknown events", () => {
    expect(describeTraineeAlertActivityLine("custom_event_type", {})).toBe("Custom Event Type");
  });
});
