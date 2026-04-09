import { describeAppUserActivityLine } from "@/lib/app-user-activity-labels";
import { describe, expect, it } from "vitest";

describe("describeAppUserActivityLine", () => {
  it("describes known activity events", () => {
    expect(describeAppUserActivityLine("user_logged_in", {})).toBe("Signed in");
    expect(describeAppUserActivityLine("alert_assignment_assigned", {})).toBe("Assigned alert to workspace");
    expect(describeAppUserActivityLine("watchlist_item_added", {})).toBe("Added a user to watchlist");
    expect(
      describeAppUserActivityLine("review_submission_created", { submission_version: 3 })
    ).toBe("Submitted work for review (v3)");
    expect(
      describeAppUserActivityLine("review_submission_reviewed", { review_state: "changes_requested" })
    ).toBe("Changes Requested");
  });

  it("falls back to formatted event type for unknown events", () => {
    expect(describeAppUserActivityLine("custom_event_type", {})).toBe("Custom Event Type");
  });
});
