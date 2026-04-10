import {
  formatSubmissionEvaluationValue,
  formatSubmissionStatusValue,
  reviewSubmissionBadgeClass,
  submissionEvaluationBadgeClass,
} from "@/features/review-workspace/comments/comment-panel-helpers";
import { formatDateTime } from "@/lib/format";
import type { ReviewSubmissionRow } from "@/lib/types";

export function SubmittedThreadSummary({
  submission,
  authorLabel,
  showAuthor,
  traineeLayout,
  headerOnly: _headerOnly = false,
}: {
  submission: ReviewSubmissionRow;
  authorLabel: string;
  showAuthor: boolean;
  traineeLayout: "default" | "alert";
  headerOnly?: boolean;
}) {
  void _headerOnly;
  const isTraineeView = !showAuthor;

  if (!isTraineeView) {
    return (
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className={`ui-badge ${reviewSubmissionBadgeClass(submission.review_state)}`}>
              {formatSubmissionStatusValue(submission.review_state)}
            </span>
            <span className="text-slate-600">Submitted {formatDateTime(submission.submitted_at)}</span>
            <span className="ui-badge ui-badge-neutral text-slate-600">v{submission.submission_version}</span>
            <span className="text-slate-500">by {authorLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-3">
      {traineeLayout === "alert" && submission.evaluation ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className={`ui-badge ${reviewSubmissionBadgeClass(submission.review_state)}`}>
              {formatSubmissionStatusValue(submission.review_state)}
            </span>
            <span className={`ui-badge ${submissionEvaluationBadgeClass(submission.evaluation)}`}>
              {formatSubmissionEvaluationValue(submission.evaluation)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-600">Submitted {formatDateTime(submission.submitted_at)}</span>
            <span className="ui-badge ui-badge-neutral text-slate-600">v{submission.submission_version}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className={`ui-badge ${reviewSubmissionBadgeClass(submission.review_state)}`}>
            {formatSubmissionStatusValue(submission.review_state)}
          </span>
          <span className="text-slate-600">Submitted {formatDateTime(submission.submitted_at)}</span>
          <span className="ui-badge ui-badge-neutral text-slate-600">v{submission.submission_version}</span>
        </div>
      )}
    </div>
  );
}
