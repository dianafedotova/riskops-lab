"use client";

import { AlertActivityLog } from "@/components/alert-activity-log";
import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import type { ReviewSubmissionRow, ReviewThreadRow } from "@/lib/types";
import { useMemo, useState, type ReactNode } from "react";

function AlertReviewThreadSection({
  title,
  emptyMessage,
  expandedLabel,
  collapsedLabel,
  children,
}: {
  title: string;
  emptyMessage: string;
  expandedLabel: string;
  collapsedLabel: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const childItems = Array.isArray(children) ? children : [children];
  const hasItems = childItems.some(Boolean);

  return (
    <div
      className={`evidence-shell rounded-[1rem] border-[rgb(210_217_229_/_0.95)] bg-[linear-gradient(180deg,rgba(248,250,253,0.987),rgba(235,240,248,0.992))] ${
        expanded
          ? "p-4 shadow-[inset_0_2px_8px_rgba(197,206,220,0.18),inset_0_1px_0_rgba(255,255,255,0.94),0_9px_20px_rgba(18,32,46,0.08)] sm:p-5"
          : "px-4 py-3 shadow-[inset_0_3px_10px_rgba(194,203,218,0.2),inset_0_1px_0_rgba(255,255,255,0.96),0_7px_16px_rgba(18,32,46,0.06)] sm:px-5 sm:py-4"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="group flex w-full items-center justify-between gap-3 text-left outline-none transition focus-visible:rounded-[0.9rem] focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
          {title}
        </h3>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition group-hover:text-slate-800">
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition duration-200 group-hover:text-slate-600 ${
              expanded ? "rotate-90" : "rotate-0"
            }`}
            fill="none"
          >
            <path
              d="M4 2.5 7.5 6 4 9.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {expanded ? expandedLabel : collapsedLabel}
        </span>
      </button>
      <div aria-hidden={!expanded} className={expanded ? "mt-3 space-y-4" : "hidden"}>
        {hasItems ? children : <div className="empty-state">{emptyMessage}</div>}
      </div>
    </div>
  );
}

export function AlertTraineeReviewWorkspacePanels({
  reviewWorkspaceError,
  alertPublicId,
  activityLogRefreshKey,
  reviewThreads,
  reviewThreadsSubmissions,
  reviewThreadsWithRootNotes,
  createReviewThread,
  syncDecisionToReviewThread,
  deleteDraftReviewThread,
}: {
  reviewWorkspaceError: string | null;
  alertPublicId: string | null;
  activityLogRefreshKey: string;
  reviewThreads: ReviewThreadRow[];
  reviewThreadsSubmissions: ReviewSubmissionRow[];
  reviewThreadsWithRootNotes: string[];
  createReviewThread: () => Promise<string | null>;
  syncDecisionToReviewThread: (threadId: string) => Promise<void>;
  deleteDraftReviewThread: (threadId: string) => Promise<void>;
}) {
  const reviewThreadsSubmissionsForUi = useMemo(() => {
    const maxVersionByThread = new Map<string, number>();
    for (const submission of reviewThreadsSubmissions) {
      const previous = maxVersionByThread.get(submission.thread_id) ?? 0;
      if (submission.submission_version > previous) {
        maxVersionByThread.set(submission.thread_id, submission.submission_version);
      }
    }

    return reviewThreadsSubmissions.filter(
      (submission) => submission.submission_version === (maxVersionByThread.get(submission.thread_id) ?? 0)
    );
  }, [reviewThreadsSubmissions]);

  const submissionsByThreadId = useMemo(() => {
    const map = new Map<string, ReviewSubmissionRow[]>();
    for (const submission of reviewThreadsSubmissionsForUi) {
      const list = map.get(submission.thread_id) ?? [];
      list.push(submission);
      map.set(submission.thread_id, list);
    }
    return map;
  }, [reviewThreadsSubmissionsForUi]);

  const draftReviewThreads = useMemo(
    () => reviewThreads.filter((thread) => (submissionsByThreadId.get(thread.id) ?? []).length === 0),
    [reviewThreads, submissionsByThreadId]
  );

  const draftReviewThreadsWithNotes = useMemo(() => {
    const threadsWithNotes = new Set(reviewThreadsWithRootNotes);
    return draftReviewThreads.filter((thread) => threadsWithNotes.has(thread.id));
  }, [draftReviewThreads, reviewThreadsWithRootNotes]);

  const submittedReviewThreads = useMemo(
    () => reviewThreads.filter((thread) => (submissionsByThreadId.get(thread.id) ?? []).length > 0),
    [reviewThreads, submissionsByThreadId]
  );

  return (
    <div className="space-y-5">
      {reviewWorkspaceError ? <p className="text-sm text-rose-600">{reviewWorkspaceError}</p> : null}
      <AlertActivityLog alertId={alertPublicId} refreshKey={activityLogRefreshKey} />
      <SimulatorCommentsPanel
        threadId={null}
        reviewMode
        privateAlertInternalId={null}
        privateSimulatorUserId={null}
        submissions={[]}
        createThread={createReviewThread}
        prepareTraineeThread={syncDecisionToReviewThread}
        showItems={false}
        showStatusMessages={false}
        showTitle={false}
        withTopBorder={false}
        flushTop
        emptyMessage="No notes in this workspace yet."
        traineeSubmittedSummaryLayout="alert"
      />
      <AlertReviewThreadSection
        title="Drafts"
        emptyMessage="No drafts yet."
        expandedLabel="Hide drafts"
        collapsedLabel="Show drafts"
      >
        {draftReviewThreadsWithNotes.map((thread) => (
          <SimulatorCommentsPanel
            key={thread.id}
            threadId={thread.id}
            reviewMode
            privateAlertInternalId={null}
            privateSimulatorUserId={null}
            submissions={[]}
            showComposer={false}
            onDeleteDraftThread={deleteDraftReviewThread}
            showTitle={false}
            withTopBorder={false}
            emptyMessage=""
            traineeSubmittedSummaryLayout="alert"
          />
        ))}
      </AlertReviewThreadSection>
      {submittedReviewThreads.length > 0 ? (
        <AlertReviewThreadSection
          title="Review cases"
          emptyMessage="Nothing has been submitted from this case yet."
          expandedLabel="Hide cases"
          collapsedLabel="Show cases"
        >
          {submittedReviewThreads.map((thread) => {
            const threadSubmissions = submissionsByThreadId.get(thread.id) ?? [];

            return (
              <SimulatorCommentsPanel
                key={thread.id}
                threadId={thread.id}
                reviewMode
                privateAlertInternalId={null}
                privateSimulatorUserId={null}
                submissions={threadSubmissions}
                showComposer={false}
                showTitle={false}
                withTopBorder={false}
                emptyMessage="Nothing has been submitted from this case yet."
                traineeSubmittedSummaryLayout="alert"
              />
            );
          })}
        </AlertReviewThreadSection>
      ) : null}
    </div>
  );
}
