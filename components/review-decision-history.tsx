"use client";

import { formatDateTime } from "@/lib/format";
import type { ReactNode } from "react";

type ReviewDecisionHistoryItem = {
  id: string;
  created_at: string;
  decision: string | null;
  rationale: string | null;
  proposed_alert_status?: string | null;
};

type ReviewDecisionHistoryProps = {
  loading: boolean;
  decisions: ReviewDecisionHistoryItem[];
  emptyMessage: string;
  getDecisionBadgeClassName: (decision: string | null | undefined) => string;
  getDecisionLabel: (decision: string | null | undefined) => string;
  renderProposedStatus?: (status: string) => ReactNode;
};

export function ReviewDecisionHistory({
  loading,
  decisions,
  emptyMessage,
  getDecisionBadgeClassName,
  getDecisionLabel,
  renderProposedStatus,
}: ReviewDecisionHistoryProps) {
  if (loading) {
    return <p className="text-xs text-slate-500">Loading decisions…</p>;
  }

  if (decisions.length === 0) {
    return <p className="mb-4 text-xs text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="mb-4 space-y-2 text-sm">
      {decisions.map((decision) => (
        <li key={decision.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-3">
          <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="tabular-nums">{formatDateTime(decision.created_at)}</span>
            {decision.proposed_alert_status && renderProposedStatus
              ? renderProposedStatus(decision.proposed_alert_status)
              : null}
          </div>
          <p className="mb-1">
            <span
              className={`ui-badge ${getDecisionBadgeClassName(
                decision.decision
              )}`}
            >
              {getDecisionLabel(decision.decision)}
            </span>
          </p>
          {decision.rationale ? <p className="whitespace-pre-wrap text-slate-700">{decision.rationale}</p> : null}
        </li>
      ))}
    </ul>
  );
}
