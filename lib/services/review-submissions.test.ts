import {
  listReviewSubmissionsDirect,
  reviewReviewSubmission,
  submitReviewSubmission,
} from "@/lib/services/review-submissions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordAppUserActivity } = vi.hoisted(() => ({
  recordAppUserActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/services/app-user-activity", () => ({
  recordAppUserActivity,
}));

function createSupabaseStub() {
  const maybeSingle = vi.fn(async () => ({ data: { id: "root-1" }, error: null }));
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const is = vi.fn(() => ({ order }));
  const eqChain = {
    eq: vi.fn(() => eqChain),
    is,
    order,
  };

  const from = vi.fn((table: string) => {
    if (table === "simulator_comments") {
      return {
        select: vi.fn(() => ({
          eq: eqChain.eq,
        })),
      };
    }

    if (table === "review_submissions") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      };
    }

    return {
      select: vi.fn(),
      insert: vi.fn(),
    };
  });

  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (fn === "submit_review_submission") {
      return {
        data: {
          id: "submission-1",
          thread_id: args.p_thread_id,
          organization_id: "org-1",
          app_user_id: "app-user-1",
          alert_id: "alert-1",
          user_id: "user-1",
          submission_version: 1,
          submitted_root_comment_id: args.p_submitted_root_comment_id,
          submitted_at: "2026-03-28T12:00:00Z",
          decision_snapshot: "true_positive",
          proposed_alert_status: "resolved",
          user_status_snapshot: "active",
          alert_status_snapshot: "open",
          rationale_snapshot: "Snapshot",
          review_state: "submitted",
          evaluation: null,
          feedback: null,
          review_target_type: args.p_review_target_type,
          reviewed_by_app_user_id: null,
          reviewed_at: null,
          created_at: "2026-03-28T12:00:00Z",
          updated_at: "2026-03-28T12:00:00Z",
        },
        error: null,
      };
    }

    if (fn === "review_review_submission") {
      return {
        data: {
          id: args.p_submission_id,
          thread_id: "thread-1",
          organization_id: "org-1",
          app_user_id: "app-user-1",
          alert_id: "alert-1",
          user_id: "user-1",
          submission_version: 2,
          submitted_root_comment_id: "root-1",
          submitted_at: "2026-03-28T12:00:00Z",
          decision_snapshot: "true_positive",
          proposed_alert_status: "resolved",
          user_status_snapshot: "active",
          alert_status_snapshot: "open",
          rationale_snapshot: "Snapshot",
          review_state: args.p_review_state,
          evaluation: args.p_evaluation,
          feedback: args.p_feedback,
          review_target_type: "human",
          reviewed_by_app_user_id: "reviewer-1",
          reviewed_at: "2026-03-28T12:30:00Z",
          created_at: "2026-03-28T12:00:00Z",
          updated_at: "2026-03-28T12:30:00Z",
        },
        error: null,
      };
    }

    return { data: null, error: null };
  });

  return {
    from,
    rpc,
  } as unknown as SupabaseClient & {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };
}

describe("review submission services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits review using latest trainee root comment when explicit root id is absent", async () => {
    const supabase = createSupabaseStub();

    const result = await submitReviewSubmission(supabase, {
      threadId: "thread-1",
      activityAppUserId: "app-user-1",
    });

    expect(result.error).toBeNull();
    expect(result.submission?.submitted_root_comment_id).toBe("root-1");
    expect(supabase.rpc).toHaveBeenCalledWith("submit_review_submission", {
      p_thread_id: "thread-1",
      p_submitted_root_comment_id: "root-1",
      p_review_target_type: "human",
    });
    expect(recordAppUserActivity).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "review_submission_created",
        meta: expect.objectContaining({
          alert_id: "alert-1",
          thread_id: "thread-1",
          submission_id: "submission-1",
        }),
      })
    );
  });

  it("trims reviewer feedback before sending review rpc", async () => {
    const supabase = createSupabaseStub();

    const result = await reviewReviewSubmission(supabase, {
      submissionId: "submission-2",
      reviewState: "changes_requested",
      evaluation: "developing",
      feedback: "  tighten rationale  ",
      activityAppUserId: "reviewer-1",
    });

    expect(result.error).toBeNull();
    expect(result.submission?.feedback).toBe("tighten rationale");
    expect(recordAppUserActivity).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "review_submission_reviewed",
        meta: expect.objectContaining({
          alert_id: "alert-1",
          submission_id: "submission-2",
        }),
      })
    );
    expect(supabase.rpc).toHaveBeenCalledWith("review_review_submission", {
      p_submission_id: "submission-2",
      p_review_state: "changes_requested",
      p_evaluation: "developing",
      p_feedback: "tighten rationale",
    });
  });

  it("short-circuits direct listing when no thread ids are provided", async () => {
    const supabase = createSupabaseStub();

    const result = await listReviewSubmissionsDirect(supabase, []);

    expect(result).toEqual({ rows: [], error: null });
    expect(supabase.from).not.toHaveBeenCalledWith("review_submissions");
  });
});
