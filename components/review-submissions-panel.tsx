"use client";

import { FilterSelect } from "@/components/filter-select";
import { RichNoteEditor } from "@/components/rich-note-editor";
import { useCurrentUser } from "@/components/current-user-provider";
import { canAccessStaffFeatures, isTrainee } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import { createEmptyRichNoteValue, type RichNoteEditorValue } from "@/lib/rich-note";
import { useReviewSubmissions } from "@/lib/hooks/use-review-submissions";
import { useSimulatorComments } from "@/lib/hooks/use-simulator-comments";
import type { ReviewSubmissionEvaluation, ReviewSubmissionRow, ReviewSubmissionState } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type Props = {
  threadId?: string | null;
  title?: string;
  showTitle?: boolean;
  sectionHeader?: boolean;
  emptyMessage?: string;
  withTopBorder?: boolean;
  showTraineeAction?: boolean;
  variant?: "default" | "admin";
};

const EVALUATION_OPTIONS: { value: ReviewSubmissionEvaluation; label: string }[] = [
  { value: "needs_work", label: "Needs a full redo" },
  { value: "developing", label: "On the right track" },
  { value: "solid", label: "Good work" },
  { value: "excellent", label: "Outstanding" },
];

const REVIEW_ACTIONS: { state: Exclude<ReviewSubmissionState, "submitted">; label: string }[] = [
  { state: "in_review", label: "Mark in review" },
  { state: "changes_requested", label: "Request changes" },
  { state: "approved", label: "Approve" },
  { state: "closed", label: "Close" },
];
const evaluationOptions = [
  { value: "", label: "No evaluation" },
  ...EVALUATION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const TIMESTAMP_CLASS = "text-[0.76rem] leading-none tabular-nums text-slate-400";
const NOTICE_SUCCESS_CLASS =
  "inline-flex rounded-[0.9rem] border border-emerald-200 bg-emerald-50/95 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const THREAD_ACTION_INFO_REQUESTED =
  "border-[rgb(193_221_226_/_0.95)] bg-[linear-gradient(180deg,rgb(255_255_255_/_0.98),rgb(243_249_250_/_0.98))] text-[rgb(57_103_112)] shadow-[0_6px_12px_rgba(120,160,168,0.05)] hover:border-[rgb(160_196_202_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(236_247_248_/_0.98),rgb(223_239_242_/_0.98))] hover:text-[rgb(48_90_98)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_14px_rgba(120,160,168,0.1)]";

function formatReviewLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  return raw
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReviewEvaluationLabel(value: ReviewSubmissionEvaluation | null | undefined): string {
  if (value === "needs_work") return "Needs a full redo";
  if (value === "developing") return "On the right track";
  if (value === "solid") return "Good work";
  if (value === "excellent") return "Outstanding";
  return "—";
}

function reviewSubmissionBadgeClass(state: string | null | undefined): string {
  const value = (state ?? "").trim().toLowerCase();
  if (value === "submitted") return "ui-badge-blue";
  if (value === "in_review" || value === "in review") return "ui-badge-teal";
  if (value === "changes_requested" || value === "changes requested") return "ui-badge-rose";
  if (value === "approved") return "ui-badge-emerald";
  return "ui-badge-neutral";
}

function reviewEvaluationBadgeClass(evaluation: ReviewSubmissionEvaluation | null | undefined): string {
  if (evaluation === "needs_work") return "ui-badge-rose";
  if (evaluation === "developing") return "ui-badge-amber";
  if (evaluation === "solid") return "ui-badge-emerald";
  if (evaluation === "excellent") return "ui-badge-blue";
  return "ui-badge-neutral";
}

function decisionSnapshotBadgeClass(decision: string | null | undefined): string {
  const value = (decision ?? "").trim().toLowerCase();
  if (!value) return "ui-badge-neutral";
  if (value === "false_positive") return "ui-badge-emerald";
  if (value === "true_positive") return "ui-badge-rose";
  if (value === "info_requested") return "ui-badge-teal";
  if (value === "escalated") return "ui-badge-amber";
  return "ui-badge-neutral";
}

function alertStatusBadgeClass(status: string | null | undefined): string {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "open") return "ui-badge-blue";
  if (value === "in_review" || value === "in review") return "ui-badge-teal";
  if (value === "resolved") return "ui-badge-neutral";
  if (value === "closed") return "ui-badge-neutral";
  if (value === "monitoring") return "ui-badge-amber";
  if (value === "escalated") return "ui-badge-violet";
  return "ui-badge-neutral";
}

function userStatusBadgeClass(status: string | null | undefined): string {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "active") return "ui-badge-emerald";
  if (value === "restricted") return "ui-badge-amber";
  if (value === "blocked" || value === "closed") return "ui-badge-rose";
  if (value === "not_active" || value === "not active") return "ui-badge-neutral";
  return "ui-badge-neutral";
}

function reviewActionButtonClass(
  action: Exclude<ReviewSubmissionState, "submitted">,
  isActive: boolean
): string {
  if (isActive) {
    if (action === "approved") {
      return "border-transparent bg-[linear-gradient(180deg,var(--brand-700),var(--brand-600))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
    }
    if (action === "changes_requested") {
      return "border-transparent bg-[linear-gradient(180deg,var(--brand-dot),#7f1724)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_18px_rgba(24,42,59,0.2)]";
    }
    if (action === "in_review") {
      return "border-amber-300 bg-[linear-gradient(180deg,rgb(250_242_220_/_0.98),rgb(243_229_193_/_0.98))] text-[var(--warning-600)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_18px_rgba(24,42,59,0.12)]";
    }
    return "border-slate-500 bg-[linear-gradient(180deg,rgb(108_123_136_/_0.98),rgb(82_96_110_/_0.98))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_18px_rgba(24,42,59,0.16)]";
  }

  if (action === "changes_requested") {
    return "border-[rgb(221_189_196_/_0.94)] bg-white text-[var(--brand-dot)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-dot),#7f1724)] hover:text-white hover:shadow-[0_10px_18px_rgba(24,42,59,0.18)]";
  }
  if (action === "in_review") {
    return "border-amber-300 bg-white text-[var(--warning-600)] shadow-none hover:border-[rgb(191_144_84_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(250_242_220_/_0.98),rgb(243_229_193_/_0.98))] hover:text-[var(--warning-600)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_18px_rgba(24,42,59,0.12)]";
  }
  if (action === "approved") {
    return "border-[rgb(196_220_214_/_0.95)] bg-white text-[var(--brand-700)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
  }
  return "border-slate-300 bg-white text-slate-700 shadow-none hover:border-slate-500 hover:bg-[linear-gradient(180deg,rgb(108_123_136_/_0.98),rgb(82_96_110_/_0.98))] hover:text-white hover:shadow-[0_10px_18px_rgba(24,42,59,0.16)]";
}

function statusBadgeClass(state: ReviewSubmissionState) {
  switch (state) {
    case "submitted":
      return "ui-badge-blue";
    case "in_review":
      return "ui-badge-teal";
    case "changes_requested":
      return "ui-badge-rose";
    case "approved":
      return "ui-badge-emerald";
    case "closed":
      return "ui-badge-neutral";
  }
}

function formatSubmissionState(state: ReviewSubmissionState) {
  switch (state) {
    case "submitted":
      return "Submitted";
    case "in_review":
      return "In review";
    case "changes_requested":
      return "Changes requested";
    case "approved":
      return "Approved";
    case "closed":
      return "Closed";
  }
}

function formatEvaluation(value: ReviewSubmissionEvaluation | null) {
  if (!value) return "Not graded";
  if (value === "needs_work") return "Needs a full redo";
  if (value === "developing") return "On the right track";
  if (value === "solid") return "Good work";
  if (value === "excellent") return "Outstanding";
  return value;
}

function formatSubmissionError(message: string): string {
  if (message.includes("at least a root comment or draft decision is required")) {
    return "Submit a new review note in the case composer or save a draft decision first.";
  }
  return message;
}

export function ReviewSubmissionsPanel({
  threadId = null,
  title = "Review snapshots",
  showTitle = true,
  sectionHeader = false,
  emptyMessage = "No review submissions yet.",
  withTopBorder = false,
  showTraineeAction = true,
  variant = "default",
}: Props) {
  const { appUser } = useCurrentUser();
  const { submissions, latestSubmission, loading, error, submit, review } = useReviewSubmissions(threadId);
  const { addAdminQaReply } = useSimulatorComments({
    threadId,
    reviewMode: true,
    viewerAppUserId: appUser?.id ?? null,
    viewerRole: appUser?.role ?? null,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [actionOkVisible, setActionOkVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [replyingOnly, setReplyingOnly] = useState(false);
  const [evaluation, setEvaluation] = useState<ReviewSubmissionEvaluation | "">("");
  const [feedbackNote, setFeedbackNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSubmissionId((current) => {
      if (current && submissions.some((submission) => submission.id === current)) {
        return current;
      }
      return latestSubmission?.id ?? null;
    });
  }, [latestSubmission?.id, submissions]);

  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ?? latestSubmission ?? null;

  useEffect(() => {
    setEvaluation(selectedSubmission?.evaluation ?? "");
    setFeedbackNote(createEmptyRichNoteValue());
  }, [selectedSubmission?.evaluation, selectedSubmission?.id]);

  useEffect(() => {
    if (!actionOk) {
      setActionOkVisible(false);
      return;
    }

    setActionOkVisible(true);
    const hideTimer = window.setTimeout(() => setActionOkVisible(false), 2200);
    const clearTimer = window.setTimeout(() => setActionOk(null), 2550);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [actionOk]);

  const isTraineeActor = isTrainee(appUser?.role);
  const canReview = canAccessStaffFeatures(appUser?.role);

  const submissionHistory = useMemo(() => submissions, [submissions]);
  const submissionOptions = useMemo(
    () =>
      submissionHistory.map((submission, index) => ({
        value: submission.id,
        label:
          index === 0
            ? `Submission v${submission.submission_version} · Current`
            : `Submission v${submission.submission_version} · ${formatReviewLabel(submission.review_state)}`,
      })),
    [submissionHistory]
  );
  const isViewingLatestSubmission = !selectedSubmission || selectedSubmission.id === latestSubmission?.id;
  const canReplyOnly =
    Boolean(appUser?.id) &&
    Boolean(selectedSubmission?.submitted_root_comment_id) &&
    isViewingLatestSubmission &&
    Boolean(feedbackNote.body.trim());

  if (!threadId) return null;

  return (
    <div className={`${withTopBorder ? "mt-6 border-t border-slate-200 pt-4" : ""} relative space-y-3`}>
      {showTitle ? (
        sectionHeader ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
                {title}
              </h3>
              <div className="pointer-events-none min-h-[2rem]">
                {actionOk ? (
                  <div
                    className={`transition-all duration-300 ease-out ${
                      actionOkVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                    }`}
                  >
                    <div className={NOTICE_SUCCESS_CLASS} role="status" aria-live="polite">
                      {actionOk}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {actionOk ? (
              <div
                className={`pointer-events-none transition-all duration-300 ease-out ${
                  actionOkVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                }`}
              >
                <div className={NOTICE_SUCCESS_CLASS} role="status" aria-live="polite">
                  {actionOk}
                </div>
              </div>
            ) : null}
          </div>
        )
      ) : null}

      {actionError ? <p className="text-xs text-rose-600">{formatSubmissionError(actionError)}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {isTraineeActor && showTraineeAction ? (
        <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 p-3">
          <p className="text-xs text-slate-600">
            New review notes should be submitted from the case composer below. This action is mainly for re-submitting
            the latest frozen branch with the current draft decision.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={submitting || !appUser?.id}
              className="rounded-[1.2rem] bg-[var(--brand-700)] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                if (!appUser?.id) return;
                setActionError(null);
                setActionOk(null);
                setSubmitting(true);
                try {
                  const created = await submit({ appUserId: appUser.id });
                  setActionOk(
                    created
                      ? `Submission v${created.submission_version} sent for review.`
                      : "Submission sent for review."
                  );
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Could not submit review.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Submitting..." : latestSubmission ? "Resubmit snapshot" : "Create snapshot"}
            </button>
            {latestSubmission ? (
              <span className="text-xs text-slate-500">
                Latest state: <span className="font-medium text-slate-700">{formatSubmissionState(latestSubmission.review_state)}</span>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        variant === "admin" ? (
          <AdminReviewSubmissionLoadingSkeleton />
        ) : (
          <p className="text-xs text-slate-500">Loading submissions…</p>
        )
      ) : submissionHistory.length === 0 ? (
        <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className={`${sectionHeader ? "space-y-3" : "space-y-3"}`}>
          {variant === "admin" && selectedSubmission ? (
            <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="space-y-2">
                  {submissionOptions.length > 1 ? (
                    <div className="min-w-[180px] max-w-[230px]">
                      <FilterSelect
                        ariaLabel="Submission version"
                        value={selectedSubmission.id}
                        onChange={setSelectedSubmissionId}
                        options={submissionOptions}
                        className="h-7 rounded-[0.7rem] border-slate-200/80 bg-white/65 px-2.5 text-[0.88rem] font-medium text-slate-800 shadow-[0_3px_8px_rgba(15,23,42,0.03)]"
                        menuClassName="min-w-[240px]"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-800">
                      {`Submission v${selectedSubmission.submission_version}`}
                    </span>
                  )}
                </div>
                <span className={TIMESTAMP_CLASS}>{formatDateTime(selectedSubmission.submitted_at)}</span>
              </div>

              <div className="mt-4 space-y-2.5 text-sm text-slate-700">
                <AdminSummaryRow
                  label="Decision"
                  value={formatReviewLabel(selectedSubmission.decision_snapshot ?? "Not selected")}
                  badgeClass={decisionSnapshotBadgeClass(selectedSubmission.decision_snapshot ?? null)}
                />
                <AdminSummaryRow
                  label="Alert status"
                  value={formatReviewLabel(selectedSubmission.proposed_alert_status ?? "Not selected")}
                  badgeClass={alertStatusBadgeClass(selectedSubmission.proposed_alert_status ?? null)}
                />
                <AdminSummaryRow
                  label="User status"
                  value={formatReviewLabel(selectedSubmission.user_status_snapshot ?? "—")}
                  badgeClass={userStatusBadgeClass(selectedSubmission.user_status_snapshot ?? null)}
                />

                <div className="my-1 border-t border-slate-200/80 pt-2" />

                <AdminSummaryRow
                  label="Review status"
                  value={formatReviewLabel(isViewingLatestSubmission ? latestSubmission?.review_state : selectedSubmission.review_state)}
                  badgeClass={reviewSubmissionBadgeClass(
                    isViewingLatestSubmission ? latestSubmission?.review_state : selectedSubmission.review_state
                  )}
                />
                <AdminSummaryRow
                  label="Evaluation"
                  value={evaluation ? formatReviewEvaluationLabel(evaluation as ReviewSubmissionEvaluation) : "Not evaluated"}
                  badgeClass={
                    evaluation ? reviewEvaluationBadgeClass(evaluation as ReviewSubmissionEvaluation) : "ui-badge-neutral"
                  }
                />
              </div>

            </div>
          ) : null}

          {latestSubmission ? (
            <LatestSubmissionCard
              submission={latestSubmission}
              canReview={canReview}
              evaluation={evaluation}
              feedbackNote={feedbackNote}
              reviewing={reviewing}
              replyingOnly={replyingOnly}
              canReplyOnly={canReplyOnly}
              onEvaluationChange={setEvaluation}
              onFeedbackChange={setFeedbackNote}
              onReplyOnly={async () => {
                if (!appUser?.id || !selectedSubmission?.submitted_root_comment_id || !feedbackNote.body.trim()) return;
                setActionError(null);
                setActionOk(null);
                setReplyingOnly(true);
                try {
                  await addAdminQaReply(feedbackNote, selectedSubmission.submitted_root_comment_id, appUser.id);
                  setFeedbackNote(createEmptyRichNoteValue());
                  setActionOk("Reply sent.");
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Could not send reply.");
                } finally {
                  setReplyingOnly(false);
                }
              }}
              onReview={async (state) => {
                if (!appUser?.id || !latestSubmission || (variant === "admin" && !isViewingLatestSubmission)) return;
                setActionError(null);
                setActionOk(null);
                setReviewing(true);
                try {
                  const noteToSend = feedbackNote.body.trim() ? feedbackNote : null;
                  const updated = await review({
                    appUserId: appUser.id,
                    submissionId: latestSubmission.id,
                    reviewState: state,
                    evaluation: evaluation || null,
                    feedback: null,
                  });
                  if (noteToSend && selectedSubmission?.submitted_root_comment_id) {
                    await addAdminQaReply(noteToSend, selectedSubmission.submitted_root_comment_id, appUser.id);
                  }
                  setFeedbackNote(createEmptyRichNoteValue());
                  setActionOk(updated ? formatSubmissionState(updated.review_state) : "Updated");
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Could not update review.");
                } finally {
                  setReviewing(false);
                }
              }}
              variant={variant}
              readOnly={!isViewingLatestSubmission}
            />
          ) : null}

          {variant !== "admin" && submissionHistory.length > 1 ? (
            <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Snapshot history</p>
              <ul className="space-y-2">
                {submissionHistory.slice(1).map((submission) => (
                  <li key={submission.id} className="rounded-[1.2rem] border border-slate-100 bg-slate-50/70 p-3">
                    <SubmissionSummary submission={submission} compact />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ReviewSubmissionActionBar({ threadId = null }: { threadId?: string | null }) {
  const { appUser } = useCurrentUser();
  const { latestSubmission, submit } = useReviewSubmissions(threadId);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  if (!threadId || !isTrainee(appUser?.role)) return null;

  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-3">
      {actionError ? <p className="mb-2 text-xs text-rose-600">{formatSubmissionError(actionError)}</p> : null}
      {actionOk ? <p className="mb-2 text-xs text-emerald-700">{actionOk}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={submitting || !appUser?.id}
          className="rounded-[1.2rem] bg-[var(--brand-700)] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            if (!appUser?.id) return;
            setActionError(null);
            setActionOk(null);
            setSubmitting(true);
            try {
              const created = await submit({ appUserId: appUser.id });
              setActionOk(
                created ? `Submission v${created.submission_version} sent for review.` : "Submission sent for review."
              );
            } catch (e) {
              setActionError(e instanceof Error ? e.message : "Could not submit review.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
              {submitting ? "Submitting..." : latestSubmission ? "Resubmit snapshot" : "Create snapshot"}
        </button>
        <span className="text-xs text-slate-600">
          The case composer is the main way to submit a new review note. Use this only to re-freeze the current branch.
          {latestSubmission ? (
            <>
              {" "}
              Latest state:{" "}
              <span className="font-medium text-slate-700">{formatSubmissionState(latestSubmission.review_state)}</span>
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function LatestSubmissionCard({
  submission,
  canReview,
  evaluation,
  feedbackNote,
  reviewing,
  replyingOnly,
  canReplyOnly,
  onEvaluationChange,
  onFeedbackChange,
  onReplyOnly,
  onReview,
  variant = "default",
  readOnly = false,
}: {
  submission: ReviewSubmissionRow;
  canReview: boolean;
  evaluation: ReviewSubmissionEvaluation | "";
  feedbackNote: RichNoteEditorValue;
  reviewing: boolean;
  replyingOnly: boolean;
  canReplyOnly: boolean;
  onEvaluationChange: (value: ReviewSubmissionEvaluation | "") => void;
  onFeedbackChange: (value: RichNoteEditorValue) => void;
  onReplyOnly: () => Promise<void>;
  onReview: (state: Exclude<ReviewSubmissionState, "submitted">) => Promise<void>;
  variant?: "default" | "admin";
  readOnly?: boolean;
}) {
  if (variant === "admin") {
    return (
      <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <div className="space-y-4">
          {readOnly ? (
            <p className="text-xs text-amber-800">
              Historical version is read-only. Switch to the latest submission to review.
            </p>
          ) : null}
          <div>
            <RichNoteEditor
              value={feedbackNote}
              onChange={onFeedbackChange}
              placeholder="Write reply in thread..."
              size="default"
              disabled={readOnly || reviewing || replyingOnly}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[16rem] flex-1">
                <FilterSelect
                  ariaLabel="Evaluation"
                  value={evaluation}
                  onChange={(value) => onEvaluationChange((value as ReviewSubmissionEvaluation | "") ?? "")}
                  options={evaluationOptions}
                  className={`h-10 w-full px-3 text-sm text-slate-800 ${readOnly || reviewing ? "pointer-events-none opacity-60" : ""}`}
                />
              </div>
              <button
                type="button"
                disabled={replyingOnly || reviewing || !canReplyOnly}
                onClick={() => void onReplyOnly()}
                className={`ui-btn h-10 min-h-0 rounded-[0.82rem] border px-3 py-0 text-[0.84rem] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${THREAD_ACTION_INFO_REQUESTED}`}
              >
                {replyingOnly ? "Saving..." : "Reply only"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {REVIEW_ACTIONS.map((action) => (
                <button
                  key={action.state}
                  type="button"
                  disabled={reviewing || replyingOnly || readOnly}
                  onClick={() => void onReview(action.state)}
                  className={`ui-btn min-h-0 rounded-[0.82rem] border px-2.25 py-1 text-[0.84rem] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${reviewActionButtonClass(
                    action.state,
                    action.state === submission.review_state
                  )}`}
                >
                  {reviewing ? "Saving..." : action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Latest submission</p>
        <SubmissionSummary submission={submission} />

      {canReview ? (
        <div className="mt-3 space-y-3 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs text-slate-600">
            Reviewers evaluate the frozen snapshot below. Feedback here does not edit the trainee draft directly.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              <span className="mb-1 block font-medium text-slate-700">Evaluation</span>
              <FilterSelect
                ariaLabel="Evaluation"
                value={evaluation}
                onChange={(value) => onEvaluationChange((value as ReviewSubmissionEvaluation | "") ?? "")}
                options={evaluationOptions}
                className="h-10 w-full px-3 text-sm text-slate-800"
              />
            </label>
            <div className="text-xs text-slate-600">
              <span className="mb-1 block font-medium text-slate-700">Current result</span>
              <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {formatEvaluation(submission.evaluation)}
              </div>
            </div>
          </div>

          <label className="block text-xs text-slate-600">
            <span className="mb-1 block font-medium text-slate-700">Reply in thread</span>
            <RichNoteEditor
              value={feedbackNote}
              onChange={onFeedbackChange}
              placeholder="Write your reply…"
              size="compact"
              disabled={reviewing}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {REVIEW_ACTIONS.map((action) => (
              <button
                key={action.state}
                type="button"
                disabled={reviewing}
                onClick={() => void onReview(action.state)}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing ? "Saving..." : action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubmissionSummary({
  submission,
  compact = false,
}: {
  submission: ReviewSubmissionRow;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">v{submission.submission_version}</span>
          <span className={`ui-badge ${statusBadgeClass(submission.review_state)}`}>
            {formatSubmissionState(submission.review_state)}
          </span>
          <span>{formatDateTime(submission.submitted_at)}</span>
        </div>
        {submission.review_target_type === "ai" ? (
          <span className="ui-badge ui-badge-violet">AI</span>
        ) : null}
      </div>

      <div className={`grid gap-2 text-sm text-slate-700 ${compact ? "" : "sm:grid-cols-2"}`}>
        <SummaryField label="Decision" value={submission.decision_snapshot ?? "Not selected"} />
        <SummaryField label="Proposed status" value={submission.proposed_alert_status ?? "Not selected"} />
        <SummaryField label="User status" value={submission.user_status_snapshot ?? "—"} />
        <SummaryField label="Evaluation" value={formatEvaluation(submission.evaluation)} />
        <SummaryField
          label="Reviewed at"
          value={submission.reviewed_at ? formatDateTime(submission.reviewed_at) : "Not reviewed"}
        />
      </div>

      {submission.rationale_snapshot ? (
        <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-800">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Rationale snapshot</p>
          <p className="whitespace-pre-wrap">{submission.rationale_snapshot}</p>
        </div>
      ) : null}

    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-100 bg-slate-50/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function AdminSummaryRow({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-slate-200/55 bg-white/42 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <span className={`ui-badge w-fit shrink-0 text-[11px] ${badgeClass}`}>{value}</span>
    </div>
  );
}

function AdminReviewSubmissionLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="h-11 w-[17rem] rounded-[0.9rem] bg-slate-100/95" />
            <div className="h-4 w-28 rounded-full bg-slate-200/75" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-slate-200/55 bg-white/42 px-3 py-2"
              >
                <div className="h-3 w-28 rounded-full bg-slate-200/70" />
                <div className="h-7 w-28 rounded-full bg-slate-100/95" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-[1rem] bg-slate-100/90" />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="h-11 w-[13rem] rounded-[0.9rem] bg-slate-100/95" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 w-28 rounded-[0.82rem] bg-slate-100/95" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
