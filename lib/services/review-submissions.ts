import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import type {
  ReviewSubmissionEvaluation,
  ReviewSubmissionRow,
  ReviewSubmissionState,
  ReviewSubmissionTargetType,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const REVIEW_SUBMISSION_COLS = [
  "id",
  "thread_id",
  "organization_id",
  "app_user_id",
  "alert_id",
  "user_id",
  "submission_version",
  "submitted_root_comment_id",
  "submitted_at",
  "decision_snapshot",
  "proposed_alert_status",
  "user_status_snapshot",
  "alert_status_snapshot",
  "rationale_snapshot",
  "review_state",
  "evaluation",
  "feedback",
  "review_target_type",
  "reviewed_by_app_user_id",
  "reviewed_at",
  "created_at",
  "updated_at",
].join(", ");

export async function listReviewSubmissions(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ submissions: ReviewSubmissionRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("list_review_submissions", {
    p_thread_id: threadId,
  });

  if (error) {
    return { submissions: [], error: error.message };
  }

  return {
    submissions: ((data as ReviewSubmissionRow[] | null) ?? []).map(normalizeReviewSubmissionRow),
    error: null,
  };
}

export async function getLatestReviewSubmission(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ submission: ReviewSubmissionRow | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_latest_review_submission", {
    p_thread_id: threadId,
  });

  if (error) {
    return { submission: null, error: error.message };
  }

  if (!data) {
    return { submission: null, error: null };
  }

  return {
    submission: normalizeReviewSubmissionRow(data as ReviewSubmissionRow),
    error: null,
  };
}

export async function submitReviewSubmission(
  supabase: SupabaseClient,
  args: {
    threadId: string;
    reviewTargetType?: ReviewSubmissionTargetType;
    submittedRootCommentId?: string | null;
    activityAppUserId: string;
  }
): Promise<{ submission: ReviewSubmissionRow | null; error: string | null }> {
  const resolvedRootCommentId =
    args.submittedRootCommentId ??
    (await resolveLatestTraineeRootCommentId(supabase, args.threadId, args.activityAppUserId));

  const { data, error } = await supabase.rpc("submit_review_submission", {
    p_thread_id: args.threadId,
    p_submitted_root_comment_id: resolvedRootCommentId,
    p_review_target_type: args.reviewTargetType ?? "human",
  });

  if (error) {
    return { submission: null, error: error.message };
  }

  const submission = data ? normalizeReviewSubmissionRow(data as ReviewSubmissionRow) : null;

  if (submission) {
    void recordAppUserActivity(supabase, {
      appUserId: args.activityAppUserId,
      eventType: "review_submission_created",
      meta: {
        alert_id: submission.alert_id ?? undefined,
        thread_id: args.threadId,
        submission_id: submission.id,
        submission_version: submission.submission_version,
        submitted_root_comment_id: submission.submitted_root_comment_id,
      },
    });
  }

  return { submission, error: null };
}

export async function reviewReviewSubmission(
  supabase: SupabaseClient,
  args: {
    submissionId: string;
    reviewState: Exclude<ReviewSubmissionState, "submitted">;
    evaluation?: ReviewSubmissionEvaluation | null;
    feedback?: string | null;
    activityAppUserId: string;
  }
): Promise<{ submission: ReviewSubmissionRow | null; error: string | null }> {
  const { data, error } = await supabase.rpc("review_review_submission", {
    p_submission_id: args.submissionId,
    p_review_state: args.reviewState,
    p_evaluation: args.evaluation ?? null,
    p_feedback: args.feedback?.trim() ? args.feedback.trim() : null,
  });

  if (error) {
    return { submission: null, error: error.message };
  }

  const submission = data ? normalizeReviewSubmissionRow(data as ReviewSubmissionRow) : null;

  if (submission) {
    void recordAppUserActivity(supabase, {
      appUserId: args.activityAppUserId,
      eventType: "review_submission_reviewed",
      meta: {
        alert_id: submission.alert_id ?? undefined,
        submission_id: submission.id,
        thread_id: submission.thread_id,
        review_state: submission.review_state,
        evaluation: submission.evaluation,
      },
    });
  }

  return { submission, error: null };
}

export async function listReviewSubmissionsDirect(
  supabase: SupabaseClient,
  threadIds: string[],
  opts?: { appUserId?: string }
): Promise<{ rows: ReviewSubmissionRow[]; error: string | null }> {
  if (threadIds.length === 0) return { rows: [], error: null };

  let q = supabase
    .from("review_submissions")
    .select(REVIEW_SUBMISSION_COLS)
    .in("thread_id", threadIds);
  if (opts?.appUserId) {
    q = q.eq("app_user_id", opts.appUserId);
  }
  const { data, error } = await q.order("submitted_at", { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  return {
    rows: ((data as unknown as ReviewSubmissionRow[] | null) ?? []).map(normalizeReviewSubmissionRow),
    error: null,
  };
}

async function resolveLatestTraineeRootCommentId(
  supabase: SupabaseClient,
  threadId: string,
  appUserId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("simulator_comments")
    .select("id")
    .eq("thread_id", threadId)
    .eq("author_app_user_id", appUserId)
    .eq("comment_type", "user_comment")
    .is("parent_comment_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.id ? String(data.id) : null;
}

function normalizeReviewSubmissionRow(row: ReviewSubmissionRow): ReviewSubmissionRow {
  return {
    ...row,
    id: String(row.id),
    thread_id: String(row.thread_id),
    organization_id: String(row.organization_id),
    app_user_id: String(row.app_user_id),
    alert_id: row.alert_id ? String(row.alert_id) : null,
    user_id: row.user_id ? String(row.user_id) : null,
    submission_version: Number(row.submission_version),
    submitted_root_comment_id: row.submitted_root_comment_id ? String(row.submitted_root_comment_id) : null,
    decision_snapshot: row.decision_snapshot ?? null,
    proposed_alert_status: row.proposed_alert_status ?? null,
    user_status_snapshot: row.user_status_snapshot ?? null,
    alert_status_snapshot: row.alert_status_snapshot ?? null,
    rationale_snapshot: row.rationale_snapshot ?? null,
    review_state: row.review_state,
    evaluation: row.evaluation ?? null,
    feedback: row.feedback ?? null,
    review_target_type: row.review_target_type ?? "human",
    reviewed_by_app_user_id: row.reviewed_by_app_user_id ? String(row.reviewed_by_app_user_id) : null,
    reviewed_at: row.reviewed_at ?? null,
  };
}
