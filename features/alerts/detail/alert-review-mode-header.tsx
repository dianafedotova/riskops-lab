import {
  reviewSubmissionStateBadgeClass,
  shortThreadId,
} from "@/features/alerts/detail/alert-detail-presenters";
import type { ReviewSubmissionRow } from "@/lib/types";
import Link from "next/link";

export function AlertReviewModeHeader({
  reviewWorkspaceError,
  latestStaffSubmission,
  activeThreadReference,
  activeThreadStatusLabel,
  activeThreadSummary,
  activeThreadTimestampLabel,
  activeThreadEvaluationLabel,
  traineeUserId,
  snapshotCount,
}: {
  reviewWorkspaceError: string | null;
  latestStaffSubmission: ReviewSubmissionRow | null;
  activeThreadReference: string | null;
  activeThreadStatusLabel: string;
  activeThreadSummary: string;
  activeThreadTimestampLabel: string;
  activeThreadEvaluationLabel: string;
  traineeUserId: string | null;
  snapshotCount: number;
}) {
  return (
    <div className="evidence-shell p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ui-badge ui-badge-amber">Review mode</span>
            <span className={`ui-badge ${reviewSubmissionStateBadgeClass(latestStaffSubmission?.review_state)}`}>
              {activeThreadStatusLabel}
            </span>
            <span className="ui-badge ui-badge-neutral">{activeThreadSummary}</span>
          </div>
          <h2 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.16rem]">
            Review case workspace for this alert
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/review" className="ui-btn ui-btn-secondary min-h-0 rounded-[1rem] px-3.5 py-2 text-sm shadow-none">
            Back to Review queue
          </Link>
          {traineeUserId ? (
            <Link
              href={`/admin/trainees/${traineeUserId}`}
              className="ui-btn ui-btn-secondary min-h-0 rounded-[1rem] px-3.5 py-2 text-sm shadow-none"
            >
              View trainee profile
            </Link>
          ) : null}
        </div>
      </div>

      {reviewWorkspaceError ? <p className="mt-4 text-sm text-rose-600">{reviewWorkspaceError}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Case</p>
          <p className="mt-1.5 font-mono text-sm text-slate-800">{shortThreadId(activeThreadReference)}</p>
        </div>
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Snapshots</p>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{snapshotCount}</p>
        </div>
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Latest activity</p>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{activeThreadTimestampLabel}</p>
        </div>
        <div className="rounded-[1rem] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Evaluation</p>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{activeThreadEvaluationLabel}</p>
        </div>
      </div>
    </div>
  );
}
