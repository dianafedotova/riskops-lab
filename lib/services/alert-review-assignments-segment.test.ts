import { describe, expect, it } from "vitest";
import { traineeCaseFilterSegment, type AlertTraineeCaseRow } from "@/lib/services/alert-review-assignments";

function base(overrides: Partial<AlertTraineeCaseRow>): AlertTraineeCaseRow {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    organization_id: "660e8400-e29b-41d4-a716-446655440000",
    organization_name: null,
    alert_id: "ALT1",
    trainee_app_user_id: "770e8400-e29b-41d4-a716-446655440000",
    trainee_label: "Trainee",
    trainee_email: null,
    assigned_by_app_user_id: "880e8400-e29b-41d4-a716-446655440000",
    assigned_by_label: "Admin",
    priority: "normal",
    due_at: null,
    created_at: "2026-04-07T12:00:00.000Z",
    updated_at: "2026-04-07T12:00:00.000Z",
    latest_thread_id: null,
    latest_submission: null,
    progress: "assigned",
    is_overdue: false,
    caseSource: "staff",
    ...overrides,
  };
}

describe("traineeCaseFilterSegment", () => {
  it("returns done when approved or closed", () => {
    expect(traineeCaseFilterSegment(base({ progress: "approved", caseSource: "staff" }))).toBe("done");
    expect(traineeCaseFilterSegment(base({ progress: "closed", caseSource: "self" }))).toBe("done");
  });

  it("returns in_review when there is a latest submission and not terminal", () => {
    expect(
      traineeCaseFilterSegment(
        base({
          progress: "in_review",
          latest_submission: {
            id: "sub1",
            thread_id: "th1",
            organization_id: "660e8400-e29b-41d4-a716-446655440000",
            app_user_id: "770e8400-e29b-41d4-a716-446655440000",
            alert_id: "ALT1",
            user_id: null,
            submission_version: 1,
            submitted_root_comment_id: null,
            submitted_at: "2026-04-07T12:00:00.000Z",
            decision_snapshot: null,
            proposed_alert_status: null,
            user_status_snapshot: null,
            alert_status_snapshot: null,
            rationale_snapshot: null,
            review_state: "in_review",
            evaluation: null,
            feedback: null,
            review_target_type: "human",
            reviewed_by_app_user_id: null,
            reviewed_at: null,
            created_at: "2026-04-07T12:00:00.000Z",
            updated_at: "2026-04-07T12:00:00.000Z",
          },
        })
      )
    ).toBe("in_review");
  });

  it("returns staff_active for staff without submission when not done", () => {
    expect(traineeCaseFilterSegment(base({ caseSource: "staff", progress: "assigned" }))).toBe("staff_active");
    expect(traineeCaseFilterSegment(base({ caseSource: "staff", progress: "in_progress" }))).toBe("staff_active");
  });

  it("returns self_active for self-assign without submission when not done", () => {
    expect(traineeCaseFilterSegment(base({ caseSource: "self", progress: "assigned" }))).toBe("self_active");
  });
});
