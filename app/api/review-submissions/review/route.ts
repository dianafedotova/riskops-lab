import { canAccessStaffFeatures } from "@/lib/app-user-role";
import { requireCurrentAppUser } from "@/lib/auth/current-app-user";
import { notifyCaseReviewed } from "@/lib/product-notifications";
import { captureSentryException } from "@/lib/sentry-capture";
import { reviewReviewSubmission } from "@/lib/services/review-submissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ReviewSubmissionEvaluation, ReviewSubmissionState } from "@/lib/types";
import { NextResponse, type NextRequest } from "next/server";

type ReviewRequestBody = {
  evaluation?: ReviewSubmissionEvaluation | null;
  feedback?: string | null;
  reviewState?: Exclude<ReviewSubmissionState, "submitted">;
  submissionId?: string;
};

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseBody(body: unknown): ReviewRequestBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as ReviewRequestBody;
}

function isReviewState(value: unknown): value is Exclude<ReviewSubmissionState, "submitted"> {
  return value === "in_review" || value === "changes_requested" || value === "approved" || value === "closed";
}

function isEvaluation(value: unknown): value is ReviewSubmissionEvaluation {
  return value === "needs_work" || value === "developing" || value === "solid" || value === "excellent";
}

export async function POST(request: NextRequest) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) return badRequest("Invalid request body.");

    const submissionId = body.submissionId?.trim() ?? "";
    if (!submissionId) return badRequest("submissionId is required.");
    if (!isReviewState(body.reviewState)) return badRequest("Invalid review state.");
    if (body.evaluation != null && !isEvaluation(body.evaluation)) return badRequest("Invalid evaluation.");
    if (body.feedback != null && typeof body.feedback !== "string") return badRequest("Invalid feedback.");

    const supabase = await createServerSupabaseClient();
    const currentUser = await requireCurrentAppUser(supabase);

    if (!currentUser.authUser || !currentUser.appUser) {
      return badRequest("Authentication is required.", 401);
    }

    if (!canAccessStaffFeatures(currentUser.appUser.role)) {
      return badRequest("Staff access is required.", 403);
    }

    const result = await reviewReviewSubmission(supabase, {
      submissionId,
      reviewState: body.reviewState,
      evaluation: body.evaluation ?? null,
      feedback: body.feedback ?? null,
      activityAppUserId: currentUser.appUser.id,
    });

    if (result.error) {
      return badRequest(result.error, /access|required|only reviewer/i.test(result.error) ? 403 : 400);
    }

    const notification = result.submission ? await notifyCaseReviewed(supabase, result.submission) : null;

    return NextResponse.json({
      error: null,
      submission: result.submission,
      notification,
    });
  } catch (error) {
    captureSentryException(error, {
      level: "error",
      type: "review_submission_route_failed",
      pathname: request.nextUrl.pathname,
      tags: {
        source: "route",
      },
    });
    return badRequest("Could not update review right now.", 500);
  }
}
