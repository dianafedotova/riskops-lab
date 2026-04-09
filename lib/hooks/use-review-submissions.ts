"use client";

import { createClient } from "@/lib/supabase";
import type {
  ReviewSubmissionEvaluation,
  ReviewSubmissionRow,
  ReviewSubmissionState,
  ReviewSubmissionTargetType,
} from "@/lib/types";
import {
  getLatestReviewSubmission,
  listReviewSubmissions,
  reviewReviewSubmission,
  submitReviewSubmission,
} from "@/lib/services/review-submissions";
import { useCallback, useEffect, useMemo, useState } from "react";

const REVIEW_SUBMISSIONS_CHANGED_EVENT = "review-submissions:changed";

export function emitReviewSubmissionsChanged(threadId: string | null) {
  if (typeof window === "undefined" || !threadId) return;
  window.dispatchEvent(
    new CustomEvent(REVIEW_SUBMISSIONS_CHANGED_EVENT, {
      detail: { threadId },
    })
  );
}

export function useReviewSubmissions(threadId: string | null) {
  const [submissions, setSubmissions] = useState<ReviewSubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!threadId) {
        setSubmissions([]);
        setLoading(false);
        setError(null);
        return;
      }

      const supabase = createClient();
      setLoading(true);
      setError(null);

      const result = await listReviewSubmissions(supabase, threadId);
      if (cancelled) return;

      if (result.error) {
        setSubmissions([]);
        setError(result.error);
      } else {
        setSubmissions(result.submissions);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [threadId, reloadTick]);

  useEffect(() => {
    if (typeof window === "undefined" || !threadId) return;

    const onChanged = (event: Event) => {
      const changedThreadId =
        event instanceof CustomEvent && typeof event.detail?.threadId === "string"
          ? event.detail.threadId
          : null;
      if (!changedThreadId || changedThreadId === threadId) {
        setReloadTick((tick) => tick + 1);
      }
    };

    window.addEventListener(REVIEW_SUBMISSIONS_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(REVIEW_SUBMISSIONS_CHANGED_EVENT, onChanged);
    };
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`review-submissions:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_submissions",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          setReloadTick((tick) => tick + 1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  const refresh = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const latestSubmission = useMemo(() => submissions[0] ?? null, [submissions]);

  const reloadLatest = useCallback(async () => {
    if (!threadId) return { submission: null, error: null };
    const supabase = createClient();
    return getLatestReviewSubmission(supabase, threadId);
  }, [threadId]);

  const submit = useCallback(
    async (args: {
      appUserId: string;
      reviewTargetType?: ReviewSubmissionTargetType;
      submittedRootCommentId?: string | null;
    }) => {
      if (!threadId) throw new Error("No cases for review");
      const supabase = createClient();
      const result = await submitReviewSubmission(supabase, {
        threadId,
        reviewTargetType: args.reviewTargetType,
        submittedRootCommentId: args.submittedRootCommentId,
        activityAppUserId: args.appUserId,
      });
      if (result.error) throw new Error(result.error);
      refresh();
      emitReviewSubmissionsChanged(threadId);
      return result.submission;
    },
    [threadId, refresh]
  );

  const review = useCallback(
    async (args: {
      appUserId: string;
      submissionId: string;
      reviewState: Exclude<ReviewSubmissionState, "submitted">;
      evaluation?: ReviewSubmissionEvaluation | null;
      feedback?: string | null;
    }) => {
      const supabase = createClient();
      const result = await reviewReviewSubmission(supabase, {
        submissionId: args.submissionId,
        reviewState: args.reviewState,
        evaluation: args.evaluation,
        feedback: args.feedback,
        activityAppUserId: args.appUserId,
      });
      if (result.error) throw new Error(result.error);
      refresh();
      emitReviewSubmissionsChanged(result.submission?.thread_id ?? null);
      return result.submission;
    },
    [refresh]
  );

  return {
    submissions,
    latestSubmission,
    loading,
    error,
    refresh,
    reloadLatest,
    submit,
    review,
  };
}
