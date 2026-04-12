import {
  notifyCaseReviewed,
  shouldSendCaseReviewedEmail,
} from "@/lib/product-notifications";
import {
  buildAlertAssignedEmailContent,
  buildCaseReviewedEmailContent,
} from "@/lib/product-email-templates";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/product-email", () => ({
  getEmailReplyToAddress: () => "support@riskopslab.com",
  getProductEmailSiteOrigin: () => "https://riskopslab.com",
  sendResendEmail: vi.fn(async () => ({ id: "email_123" })),
}));

vi.mock("@/lib/sentry-capture", () => ({
  captureSentryException: vi.fn(),
  captureSentryMessage: vi.fn(),
}));

function createSupabaseStub() {
  const maybeSingle = vi.fn(async () => ({ data: { id: "delivery-1" }, error: null }));
  const eq = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq }));

  const from = vi.fn((table: string) => {
    if (table === "app_users") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({
            data: [
              {
                id: "trainee-1",
                email: "trainee@example.com",
                full_name: "Trainee Example",
                organization_id: "org-1",
              },
              {
                id: "reviewer-1",
                email: "reviewer@example.com",
                full_name: "Reviewer Example",
                organization_id: "org-1",
              },
            ],
            error: null,
          })),
        })),
      };
    }

    if (table === "notification_preferences") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({ data: [], error: null })),
        })),
      };
    }

    if (table === "notification_deliveries") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle,
          })),
        })),
        update,
      };
    }

    return {
      select: vi.fn(),
    };
  });

  return {
    from,
  } as unknown as SupabaseClient;
}

describe("product notification templates", () => {
  it("builds case reviewed email content with a case URL", () => {
    const email = buildCaseReviewedEmailContent({
      recipientName: "Casey",
      reviewState: "approved",
      evaluation: "solid",
      feedback: null,
      reviewerName: "Alex Reviewer",
      alertId: "ALERT-42",
      caseUrl: "https://riskopslab.com/alerts/ALERT-42?reviewThread=thread-1",
    });

    expect(email.subject).toContain("Case review updated");
    expect(email.text).toContain("Open case review: https://riskopslab.com/alerts/ALERT-42?reviewThread=thread-1");
    expect(email.html).toContain("Open case review");
    expect(email.html).toContain("ALERT-42");
  });

  it("builds alert assigned email content with priority and due date copy", () => {
    const email = buildAlertAssignedEmailContent({
      recipientName: "Casey",
      assignerName: "Alex Reviewer",
      alertId: "ALERT-99",
      alertUrl: "https://riskopslab.com/alerts/ALERT-99",
      priority: "urgent",
      dueAt: "2026-04-20T23:59:59.000Z",
    });

    expect(email.subject).toContain("New alert assignment");
    expect(email.text).toContain("Priority: Urgent");
    expect(email.text).toContain("Open assigned alert: https://riskopslab.com/alerts/ALERT-99");
    expect(email.html).toContain("ALERT-99");
  });
});

describe("product notification orchestration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("only emails trainees when a review reaches a trainee-facing state", () => {
    expect(shouldSendCaseReviewedEmail("in_review")).toBe(false);
    expect(shouldSendCaseReviewedEmail("changes_requested")).toBe(true);
    expect(shouldSendCaseReviewedEmail("approved")).toBe(true);
    expect(shouldSendCaseReviewedEmail("closed")).toBe(true);
  });

  it("logs and sends a reviewed-case notification", async () => {
    const supabase = createSupabaseStub();

    const result = await notifyCaseReviewed(supabase, {
      id: "submission-1",
      thread_id: "thread-1",
      organization_id: "org-1",
      app_user_id: "trainee-1",
      alert_id: "ALERT-42",
      user_id: null,
      submission_version: 2,
      submitted_root_comment_id: null,
      submitted_at: "2026-04-12T12:00:00.000Z",
      decision_snapshot: "true_positive",
      proposed_alert_status: "escalated",
      user_status_snapshot: "active",
      alert_status_snapshot: "open",
      rationale_snapshot: "Escalation rationale",
      review_state: "approved",
      evaluation: "solid",
      feedback: null,
      review_target_type: "human",
      reviewed_by_app_user_id: "reviewer-1",
      reviewed_at: "2026-04-12T12:05:00.000Z",
      created_at: "2026-04-12T12:00:00.000Z",
      updated_at: "2026-04-12T12:05:00.000Z",
    });

    expect(result).toMatchObject({
      status: "sent",
      recipientAppUserId: "trainee-1",
      providerMessageId: "email_123",
      type: "case_reviewed",
    });
  });
});
