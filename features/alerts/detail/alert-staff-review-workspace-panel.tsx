"use client";

import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import type { ReviewSubmissionRow } from "@/lib/types";

export function AlertStaffReviewWorkspacePanel({
  threadId,
  submissions,
}: {
  threadId: string | null;
  submissions: ReviewSubmissionRow[];
}) {
  return (
    <div className="evidence-shell p-4 sm:p-5">
      <div>
        <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
          Review case
        </h3>
      </div>
      <div className="mt-2">
        <SimulatorCommentsPanel
          threadId={threadId}
          reviewMode
          privateAlertInternalId={null}
          privateSimulatorUserId={null}
          submissions={submissions}
          adminModeOverride="reply"
          showItems={Boolean(threadId)}
          showStatusMessages={false}
          showTitle={false}
          withTopBorder={false}
          flushTop
          emptyMessage="No notes in this workspace yet."
          traineeSubmittedSummaryLayout="alert"
          showQaReplyAction={false}
        />
      </div>
    </div>
  );
}
