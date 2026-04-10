"use client";

import {
  ALERT_DECISION_OPTIONS,
  DECISION_BUTTON_BASE,
  decisionOptionClass,
  type Decision,
} from "@/features/alerts/detail/alert-detail-presenters";

export function AlertDecisionPanel({
  effectiveDecision,
  submitBusy,
  submitError,
  resetBusy,
  decisionsLoading,
  canReset,
  onPickDecision,
  onResetDecision,
}: {
  effectiveDecision: Decision | null;
  submitBusy: boolean;
  submitError: string | null;
  resetBusy: boolean;
  decisionsLoading: boolean;
  canReset: boolean;
  onPickDecision: (decision: Decision) => void | Promise<void>;
  onResetDecision: () => void | Promise<void>;
}) {
  return (
    <div className="evidence-shell p-4 sm:p-5">
      <h3 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
        Decision
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ALERT_DECISION_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            disabled={submitBusy}
            onClick={() => void onPickDecision(key)}
            className={`${DECISION_BUTTON_BASE} ${decisionOptionClass(key, effectiveDecision === key)}`}
          >
            {label}
          </button>
        ))}
      </div>
      {submitError ? <p className="mt-2 text-xs text-rose-600">{submitError}</p> : null}
      {canReset ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => void onResetDecision()}
            disabled={resetBusy || decisionsLoading}
            className="text-[11px] text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetBusy ? "Resetting..." : "Reset decision"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
