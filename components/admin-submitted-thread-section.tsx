"use client";

import { FilterSelect } from "@/components/filter-select";
import { RichNoteContent } from "@/components/rich-note-content";
import { RichNoteEditor } from "@/components/rich-note-editor";
import { useReviewSubmissions } from "@/lib/hooks/use-review-submissions";
import { useSimulatorComments } from "@/lib/hooks/use-simulator-comments";
import type { AppUserRole } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import { createEmptyRichNoteValue, createRichNoteEditorValue, type RichNoteEditorValue } from "@/lib/rich-note";
import type { AdminConsoleThreadListItem } from "@/lib/services/admin-review-console";
import {
  deleteReviewThreadInternalNote,
  getReviewThreadInternalNote,
  saveReviewThreadInternalNote,
} from "@/lib/services/review-thread-internal-notes";
import { createClient } from "@/lib/supabase";
import type {
  ReviewSubmissionEvaluation,
  ReviewSubmissionState,
  ReviewThreadInternalNoteRow,
  SimulatorCommentRow,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const REVIEW_EVALUATION_OPTIONS: { value: ReviewSubmissionEvaluation | ""; label: string }[] = [
  { value: "", label: "No evaluation" },
  { value: "needs_work", label: "Needs a full redo" },
  { value: "developing", label: "On the right track" },
  { value: "solid", label: "Good work" },
  { value: "excellent", label: "Outstanding" },
];

const REVIEW_ACTIONS: { state: Exclude<ReviewSubmissionState, "submitted">; label: string }[] = [
  { state: "in_review", label: "In review" },
  { state: "changes_requested", label: "Request changes" },
  { state: "approved", label: "Approve" },
  { state: "closed", label: "Close" },
];

const REVIEW_NOTICE_SUCCESS_CLASS =
  "inline-flex rounded-[0.9rem] border border-emerald-200 bg-emerald-50/95 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const REVIEW_NOTICE_ERROR_CLASS =
  "inline-flex rounded-[0.9rem] border border-rose-200 bg-rose-50/95 px-3.5 py-2 text-sm font-medium text-rose-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const THREAD_ACTION_BASE =
  "ui-btn min-h-0 rounded-[0.9rem] px-3.5 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const THREAD_ACTION_SECONDARY = `${THREAD_ACTION_BASE} ui-btn-secondary text-[var(--brand-700)] shadow-none`;
const THREAD_ACTION_DESTRUCTIVE = `${THREAD_ACTION_BASE} border border-[rgb(149_52_63_/_0.26)] bg-white text-[var(--brand-dot)] shadow-none hover:border-[rgb(149_52_63_/_0.44)] hover:bg-[rgb(149_52_63_/_0.06)]`;
const THREAD_ACTION_INFO_REQUESTED =
  "border-[rgb(193_221_226_/_0.95)] bg-[linear-gradient(180deg,rgb(255_255_255_/_0.98),rgb(243_249_250_/_0.98))] text-[rgb(57_103_112)] shadow-[0_6px_12px_rgba(120,160,168,0.05)] hover:border-[rgb(160_196_202_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(236_247_248_/_0.98),rgb(223_239_242_/_0.98))] hover:text-[rgb(48_90_98)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_14px_rgba(120,160,168,0.1)]";
const INTERNAL_NOTE_SAVE_ACTION =
  "ui-btn min-h-0 rounded-[1rem] border border-[rgb(217_173_93_/_0.88)] bg-[linear-gradient(180deg,rgba(249,231,185,0.98),rgba(238,205,137,0.98))] px-3 py-1.5 text-[0.9rem] font-semibold text-[rgb(112,74,25)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_16px_rgba(171,128,55,0.16)] hover:border-[rgb(197_154_79_/_0.92)] hover:bg-[linear-gradient(180deg,rgba(244,223,170,0.98),rgba(231,195,122,0.98))] hover:text-[rgb(96,63,19)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_10px_18px_rgba(171,128,55,0.2)] disabled:cursor-not-allowed disabled:opacity-60";
const INTERNAL_NOTE_PANEL_CLASS =
  "rounded-[1.1rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(251,246,233,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_20px_rgba(185,133,77,0.06)]";
const INTERNAL_NOTE_INNER_CLASS =
  "rounded-[1rem] border border-amber-200/95 bg-[linear-gradient(180deg,rgba(252,246,229,0.96),rgba(247,237,208,0.94))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_14px_rgba(185,133,77,0.08)]";
const TIMESTAMP_CLASS = "text-[0.76rem] leading-none tabular-nums text-slate-400";
type ReviewActionKey = Exclude<ReviewSubmissionState, "submitted"> | "reply_only";

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

function decisionBadgeClass(decision: string | null | undefined): string {
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
  if (action === "closed") {
    return "border-slate-200/90 bg-white text-slate-600 shadow-none hover:border-slate-400 hover:bg-[rgb(244_247_250_/_0.98)] hover:text-slate-800";
  }
  return "border-[rgb(196_220_214_/_0.95)] bg-white text-[var(--brand-700)] shadow-none hover:border-transparent hover:bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_rgba(24,42,59,0.22)]";
}

function buildThreadConversation(
  rootId: string | null,
  comments: SimulatorCommentRow[],
  cutoffIso: string | null
) {
  const topLevelComments = comments
    .filter((comment) => comment.parent_comment_id == null && comment.comment_type === "user_comment")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
  const childrenByParent = new Map<string, SimulatorCommentRow[]>();

  for (const comment of comments) {
    if (!comment.parent_comment_id) continue;
    const children = childrenByParent.get(comment.parent_comment_id) ?? [];
    children.push(comment);
    childrenByParent.set(comment.parent_comment_id, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const resolvedRootId = rootId ?? topLevelComments.at(-1)?.id ?? null;
  const rootComment = resolvedRootId ? commentsById.get(resolvedRootId) ?? null : null;
  const cutoffAt = cutoffIso ? new Date(cutoffIso).getTime() : Number.POSITIVE_INFINITY;
  const replies: SimulatorCommentRow[] = [];

  if (resolvedRootId) {
    const queue = [...(childrenByParent.get(resolvedRootId) ?? [])];
    while (queue.length > 0) {
      const comment = queue.shift()!;
      if (new Date(comment.created_at).getTime() <= cutoffAt) {
        replies.push(comment);
      }
      const children = childrenByParent.get(comment.id) ?? [];
      for (const child of children) {
        queue.push(child);
      }
    }
  }

  replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    rootComment,
    replies,
  };
}


export function AdminSubmittedThreadSection({
  thread,
  appUserId,
  appUserRole,
  currentStaffLabel,
}: {
  thread: AdminConsoleThreadListItem;
  appUserId: string | null;
  appUserRole: AppUserRole | null;
  currentStaffLabel: string | null;
}) {
  const { submissions, latestSubmission, review, error } = useReviewSubmissions(thread.threadId);
  const {
    discussionComments,
    authorLabels,
    error: commentsError,
    addAdminQaReply,
  } = useSimulatorComments({
    threadId: thread.threadId,
    reviewMode: true,
    viewerAppUserId: appUserId,
    viewerRole: appUserRole,
    hydrateFromInitialData: true,
    initialDiscussionComments: thread.initialDiscussionComments,
    initialAuthorLabels: thread.initialAuthorLabels,
  });
  const effectiveSubmissions = useMemo(
    () => (submissions.length > 0 ? submissions : thread.latestSubmission ? [thread.latestSubmission] : []),
    [submissions, thread.latestSubmission]
  );
  const effectiveLatestSubmission = latestSubmission ?? thread.latestSubmission;
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ReviewSubmissionEvaluation | "">("");
  const [feedbackNote, setFeedbackNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [internalNote, setInternalNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [savedInternalNote, setSavedInternalNote] = useState<ReviewThreadInternalNoteRow | null>(null);
  const [internalNoteEditing, setInternalNoteEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [actionOkVisible, setActionOkVisible] = useState(false);
  const [pendingReviewAction, setPendingReviewAction] = useState<ReviewActionKey | null>(null);
  const [optimisticReviewState, setOptimisticReviewState] = useState<Exclude<ReviewSubmissionState, "submitted"> | null>(null);
  const [internalNoteLoading, setInternalNoteLoading] = useState(false);
  const [internalNoteSaving, setInternalNoteSaving] = useState(false);
  const [internalNoteDeleting, setInternalNoteDeleting] = useState(false);
  const [internalNoteError, setInternalNoteError] = useState<string | null>(null);
  const [internalNoteOk, setInternalNoteOk] = useState<string | null>(null);
  const [lastSeededSubmissionId, setLastSeededSubmissionId] = useState<string | null>(null);
  const [internalNoteOkVisible, setInternalNoteOkVisible] = useState(false);

  useEffect(() => {
    setSelectedSubmissionId((current) => {
      if (current && effectiveSubmissions.some((submission) => submission.id === current)) {
        return current;
      }
      return effectiveSubmissions[0]?.id ?? null;
    });
  }, [effectiveSubmissions]);

  const selectedSubmission = useMemo(
    () =>
      effectiveSubmissions.find((submission) => submission.id === selectedSubmissionId) ??
      effectiveSubmissions[0] ??
      null,
    [effectiveSubmissions, selectedSubmissionId]
  );

  const isViewingLatestSubmission = selectedSubmission != null && effectiveSubmissions[0]?.id === selectedSubmission.id;
  const effectiveReviewState = optimisticReviewState ?? selectedSubmission?.review_state ?? "submitted";

  useEffect(() => {
    const nextSubmissionId = selectedSubmission?.id ?? null;
    if (nextSubmissionId === lastSeededSubmissionId) return;

    setLastSeededSubmissionId(nextSubmissionId);
    setEvaluation(selectedSubmission?.evaluation ?? "");
    setFeedbackNote(createEmptyRichNoteValue());
  }, [lastSeededSubmissionId, selectedSubmission?.evaluation, selectedSubmission?.id]);

  useEffect(() => {
    if (!optimisticReviewState) return;
    if (selectedSubmission?.review_state === optimisticReviewState) {
      setOptimisticReviewState(null);
    }
  }, [optimisticReviewState, selectedSubmission?.review_state]);

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

  useEffect(() => {
    if (!internalNoteOk) {
      setInternalNoteOkVisible(false);
      return;
    }

    setInternalNoteOkVisible(true);
    const hideTimer = window.setTimeout(() => setInternalNoteOkVisible(false), 2200);
    const clearTimer = window.setTimeout(() => setInternalNoteOk(null), 2550);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [internalNoteOk]);

  useEffect(() => {
    let cancelled = false;

    async function loadInternalNote() {
      setInternalNoteLoading(true);
      setInternalNoteError(null);

      const supabase = createClient();
      const result = await getReviewThreadInternalNote(supabase, thread.threadId);
      if (cancelled) return;

      if (result.error) {
        setInternalNoteError(result.error);
        setSavedInternalNote(null);
        setInternalNoteEditing(true);
        setInternalNote(createEmptyRichNoteValue());
        setInternalNoteLoading(false);
        return;
      }

      setSavedInternalNote(result.note);
      setInternalNoteEditing(!result.note?.body.trim());
      setInternalNote(
        createRichNoteEditorValue({
          body: result.note?.body ?? "",
          bodyJson: result.note?.body_json ?? null,
          bodyFormat: result.note?.body_format ?? null,
        })
      );
      setInternalNoteLoading(false);
    }

    void loadInternalNote();

    return () => {
      cancelled = true;
    };
  }, [thread.threadId]);

  const discussionFeed = useMemo(
    () => (discussionComments.length > 0 ? discussionComments : thread.initialDiscussionComments),
    [discussionComments, thread.initialDiscussionComments]
  );
  const effectiveAuthorLabels = useMemo(
    () => (Object.keys(authorLabels).length > 0 ? authorLabels : thread.initialAuthorLabels),
    [authorLabels, thread.initialAuthorLabels]
  );
  const { rootComment, replies } = useMemo(
    () =>
      buildThreadConversation(
        selectedSubmission?.submitted_root_comment_id ?? effectiveLatestSubmission?.submitted_root_comment_id ?? null,
        discussionFeed,
        selectedSubmission && !isViewingLatestSubmission ? selectedSubmission.submitted_at : null
      ),
    [discussionFeed, effectiveLatestSubmission?.submitted_root_comment_id, isViewingLatestSubmission, selectedSubmission]
  );
  const submissionOptions = useMemo(
    () =>
      effectiveSubmissions.map((submission, index) => ({
        value: submission.id,
        label:
          index === 0
            ? `Submission v${submission.submission_version} · Current`
            : `Submission v${submission.submission_version} · ${formatReviewLabel(submission.review_state)}`,
      })),
    [effectiveSubmissions]
  );
  const selectedRootFallback =
    selectedSubmission?.rationale_snapshot?.trim() ||
    effectiveLatestSubmission?.rationale_snapshot?.trim() ||
    thread.preview;
  const conversationEntries = useMemo(
    () =>
      replies
        .map((reply) => ({
          sortAt: reply.created_at,
          reply,
        }))
        .sort((a, b) => new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime()),
    [replies]
  );
  const reviewControlsDisabled = !isViewingLatestSubmission || !appUserId || !selectedSubmission;
  const threadPanelClass = isViewingLatestSubmission
    ? "rounded-[1.2rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,250,253,0.97))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
    : "rounded-[1.2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(250,245,237,0.98))] p-4 shadow-[0_10px_24px_rgba(92,63,21,0.06)]";
  const getAuthorLabel = useCallback(
    (comment: SimulatorCommentRow) => {
      const fromDirectory = effectiveAuthorLabels[comment.author_app_user_id];
      if (fromDirectory) return fromDirectory;
      if (comment.author_app_user_id === appUserId && currentStaffLabel) return currentStaffLabel;
      if (comment.author_role === "trainee") return "Trainee";
      return formatReviewLabel(comment.author_role);
    },
    [effectiveAuthorLabels, appUserId, currentStaffLabel]
  );
  const saveInternalNote = useCallback(async () => {
    if (!appUserId) return;

    setInternalNoteSaving(true);
    setInternalNoteError(null);
    setInternalNoteOk(null);

    try {
      const supabase = createClient();
      const result = await saveReviewThreadInternalNote(supabase, {
        threadId: thread.threadId,
        appUserId,
        body: internalNote.body,
        bodyJson: internalNote.bodyJson,
        bodyFormat: internalNote.bodyFormat,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSavedInternalNote(result.note);
      setInternalNote(
        createRichNoteEditorValue({
          body: result.note?.body ?? "",
          bodyJson: result.note?.body_json ?? null,
          bodyFormat: result.note?.body_format ?? null,
        })
      );
      setInternalNoteEditing(false);
      setInternalNoteOk("Internal note saved.");
    } catch (error) {
      setInternalNoteError(error instanceof Error ? error.message : "Could not save internal note.");
    } finally {
      setInternalNoteSaving(false);
    }
  }, [appUserId, internalNote.body, internalNote.bodyFormat, internalNote.bodyJson, thread.threadId]);
  const deleteInternalNote = useCallback(async () => {
    setInternalNoteDeleting(true);
    setInternalNoteError(null);
    setInternalNoteOk(null);

    try {
      const supabase = createClient();
      const result = await deleteReviewThreadInternalNote(supabase, thread.threadId);

      if (result.error) {
        throw new Error(result.error);
      }

      setSavedInternalNote(null);
      setInternalNote(createEmptyRichNoteValue());
      setInternalNoteEditing(true);
      setInternalNoteOk("Internal note deleted.");
    } catch (error) {
      setInternalNoteError(error instanceof Error ? error.message : "Could not delete internal note.");
    } finally {
      setInternalNoteDeleting(false);
    }
  }, [thread.threadId]);
  const canSendReplyOnly =
    Boolean(appUserId) &&
    Boolean(rootComment?.id) &&
    isViewingLatestSubmission &&
    !reviewControlsDisabled &&
    Boolean(feedbackNote.body.trim());

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] xl:items-start">
      <div className="space-y-3">
        <div className={threadPanelClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[0.82rem] font-medium text-slate-700">
                Submitted by <span className="font-semibold text-slate-900">{thread.traineeLabel}</span>
                {thread.traineeEmail ? <span className="text-slate-500"> · {thread.traineeEmail}</span> : null}
              </p>
              {!isViewingLatestSubmission ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ui-badge ui-badge-amber">Historical snapshot</span>
                </div>
              ) : null}
            </div>
            <p className={TIMESTAMP_CLASS}>{thread.createdAtLabel}</p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              {rootComment ? (
                <RichNoteContent
                  body={rootComment.body}
                  bodyJson={rootComment.body_json}
                  bodyFormat={rootComment.body_format}
                  className="text-[0.97rem] leading-6 text-slate-900"
                />
              ) : (
                <RichNoteContent body={selectedRootFallback} className="text-[0.97rem] leading-6 text-slate-900" />
              )}
            </div>

          {conversationEntries.length > 0 ? (
            <div className="border-t border-slate-200/80 pt-4">
              <div className="space-y-3">
                {conversationEntries.map((entry) => {
                    const reply = entry.reply;
                    const isTraineeReply = reply.author_role === "trainee";
                    const authorLabel = getAuthorLabel(reply);
                    const compactAuthorLabel = authorLabel.split(" · ")[0] ?? authorLabel;

                    return (
                      <div
                        key={reply.id}
                        className={`flex ${isTraineeReply ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`w-full rounded-[1.12rem] border px-4 py-3 sm:max-w-[76%] ${
                            isTraineeReply
                              ? "border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(250,252,254,0.985))] shadow-[0_3px_10px_rgba(15,23,42,0.025)] sm:max-w-[68%]"
                              : "border-[rgb(196_220_220_/_0.96)] bg-[linear-gradient(180deg,rgba(246,251,251,0.992),rgba(236,245,245,0.992))] shadow-[inset_0_0_0_1px_rgba(90,134,138,0.05),0_4px_12px_rgba(30,90,95,0.04)]"
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 truncate" title={authorLabel}>
                                {compactAuthorLabel}
                              </span>
                              {authorLabel !== compactAuthorLabel ? (
                                <span className="hidden min-w-0 truncate text-slate-400 sm:inline" title={authorLabel}>
                                  · {authorLabel.slice(compactAuthorLabel.length + 3)}
                                </span>
                              ) : null}
                            </div>
                            <span className={TIMESTAMP_CLASS}>{formatDateTime(reply.created_at)}</span>
                          </div>
                          <RichNoteContent
                            body={reply.body}
                            bodyJson={reply.body_json}
                            bodyFormat={reply.body_format}
                            className="text-[0.95rem] leading-6 text-slate-900"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-shell-bg)]">
              Review evaluation
            </p>
            <div className="flex min-h-[2.5rem] flex-col items-end gap-2 text-xs text-slate-500">
              {!isViewingLatestSubmission && selectedSubmission ? (
                <span className="text-amber-800">Historical version is read-only. Switch to the latest submission to review.</span>
              ) : null}
              {actionOk ? (
                <div
                  className={`pointer-events-none transition-all duration-300 ease-out ${
                    actionOkVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                  }`}
                >
                  <div className={REVIEW_NOTICE_SUCCESS_CLASS} role="status" aria-live="polite">
                    {actionOk}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {actionError ? (
              <div className={REVIEW_NOTICE_ERROR_CLASS} role="alert">
                {actionError}
              </div>
            ) : null}
            {error ? (
              <div className={REVIEW_NOTICE_ERROR_CLASS} role="alert">
                {error}
              </div>
            ) : null}
            {commentsError ? (
              <div className={REVIEW_NOTICE_ERROR_CLASS} role="alert">
                {commentsError}
              </div>
            ) : null}
            <div className="space-y-3">
              <RichNoteEditor
                value={feedbackNote}
                onChange={setFeedbackNote}
                placeholder="Write reply in thread..."
                size="default"
                disabled={reviewControlsDisabled}
              />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-full max-w-[200px]">
                <FilterSelect
                  ariaLabel="Evaluation"
                  value={evaluation}
                  onChange={(value) => setEvaluation((value as ReviewSubmissionEvaluation | "") ?? "")}
                  options={REVIEW_EVALUATION_OPTIONS}
                  className={`h-10 w-full px-3 text-sm text-slate-800 ${reviewControlsDisabled ? "pointer-events-none opacity-60" : ""}`}
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  disabled={pendingReviewAction !== null || !canSendReplyOnly}
                  onClick={async () => {
                    if (!appUserId || !rootComment?.id || !isViewingLatestSubmission) return;
                    setActionError(null);
                    setActionOk(null);
                    setPendingReviewAction("reply_only");
                    try {
                      await addAdminQaReply(feedbackNote, rootComment.id, appUserId);
                      setFeedbackNote(createEmptyRichNoteValue());
                      setActionOk("Reply sent.");
                    } catch (e) {
                      setActionError(e instanceof Error ? e.message : "Could not send reply.");
                    } finally {
                      setPendingReviewAction(null);
                    }
                  }}
                  className={`ui-btn min-h-0 rounded-[0.82rem] border px-2 py-1 text-[0.84rem] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${THREAD_ACTION_INFO_REQUESTED}`}
                >
                  {pendingReviewAction === "reply_only" ? "Saving..." : "Reply only"}
                </button>
                {REVIEW_ACTIONS.map((action) => (
                  <button
                    key={action.state}
                    type="button"
                    disabled={pendingReviewAction !== null || reviewControlsDisabled}
                    onClick={async () => {
                      if (!appUserId || !selectedSubmission || !isViewingLatestSubmission) return;
                      setActionError(null);
                      setActionOk(null);
                      setPendingReviewAction(action.state);
                      try {
                        const noteToSend = feedbackNote.body.trim() ? feedbackNote : null;
                        const reviewPromise = review({
                          appUserId,
                          submissionId: selectedSubmission.id,
                          reviewState: action.state,
                          evaluation: evaluation || null,
                          feedback: null,
                        });
                        const replyPromise =
                          noteToSend && rootComment?.id
                            ? addAdminQaReply(noteToSend, rootComment.id, appUserId)
                            : Promise.resolve();
                        const [updated] = await Promise.all([reviewPromise, replyPromise]);
                        setOptimisticReviewState(
                          (updated?.review_state as Exclude<ReviewSubmissionState, "submitted"> | null) ?? action.state
                        );
                        setFeedbackNote(createEmptyRichNoteValue());
                        setActionOk(
                          updated
                            ? `Review updated to ${formatReviewLabel(updated.review_state).toLowerCase()}.`
                            : "Review updated."
                        );
                      } catch (e) {
                        setActionError(e instanceof Error ? e.message : "Could not update review.");
                      } finally {
                        setPendingReviewAction(null);
                      }
                    }}
                    className={`ui-btn min-h-0 rounded-[0.82rem] border px-2.25 py-1 text-[0.84rem] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${reviewActionButtonClass(
                      action.state,
                      action.state === effectiveReviewState
                    )}`}
                  >
                    {pendingReviewAction === action.state ? "Saving..." : action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 xl:sticky xl:top-4">
        <div className="rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="space-y-2">
              {submissionOptions.length > 1 ? (
                <div className="min-w-[180px] max-w-[230px]">
                  <FilterSelect
                    ariaLabel="Submission version"
                    value={selectedSubmission?.id ?? ""}
                    onChange={setSelectedSubmissionId}
                    options={submissionOptions}
                    className="h-7 rounded-[0.7rem] border-slate-200/80 bg-white/65 px-2.5 text-[0.88rem] font-medium text-slate-800 shadow-[0_3px_8px_rgba(15,23,42,0.03)]"
                    menuClassName="min-w-[240px]"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold text-slate-800">
                  {selectedSubmission ? `Submission v${selectedSubmission.submission_version}` : "Submission"}
                </span>
              )}
            </div>
            {selectedSubmission ? (
              <span className={TIMESTAMP_CLASS}>
                {formatDateTime(selectedSubmission.submitted_at)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-2.5 text-sm text-slate-700">
            <SummaryRow
              label="Decision"
              value={formatReviewLabel(selectedSubmission?.decision_snapshot ?? "Not selected")}
              badgeClass={decisionBadgeClass(selectedSubmission?.decision_snapshot ?? null)}
            />
            <SummaryRow
              label="Alert status"
              value={formatReviewLabel(selectedSubmission?.proposed_alert_status ?? "Not selected")}
              badgeClass={alertStatusBadgeClass(selectedSubmission?.proposed_alert_status ?? null)}
            />
            <SummaryRow
              label="User status"
              value={formatReviewLabel(selectedSubmission?.user_status_snapshot ?? "—")}
              badgeClass={userStatusBadgeClass(selectedSubmission?.user_status_snapshot ?? null)}
            />

            <div className="my-1 border-t border-slate-200/80 pt-2" />

            <SummaryRow
              label="Review status"
              value={formatReviewLabel(effectiveReviewState)}
              badgeClass={reviewSubmissionBadgeClass(effectiveReviewState)}
            />
            <SummaryRow
              label="Evaluation"
              value={evaluation ? formatReviewEvaluationLabel(evaluation as ReviewSubmissionEvaluation) : "Not evaluated"}
              badgeClass={evaluation ? reviewEvaluationBadgeClass(evaluation as ReviewSubmissionEvaluation) : "ui-badge-neutral"}
            />
          </div>
        </div>

        <div className={`relative ${INTERNAL_NOTE_PANEL_CLASS}`}>
          {internalNoteOk ? (
            <div
              className={`pointer-events-none absolute right-4 top-4 z-10 transition-all duration-300 ease-out ${
                internalNoteOkVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
            >
              <div className={REVIEW_NOTICE_SUCCESS_CLASS} role="status" aria-live="polite">
                {internalNoteOk}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-shell-bg)]">
                Internal note
              </p>
            </div>
            {internalNoteLoading ? <span className="text-xs text-slate-400">Loading…</span> : null}
          </div>

          <div className="mt-3 space-y-3">
            {internalNoteError ? (
              <div className={REVIEW_NOTICE_ERROR_CLASS} role="alert">
                {internalNoteError}
              </div>
            ) : null}

            {savedInternalNote?.body.trim() && !internalNoteEditing ? (
              <>
              <div className={INTERNAL_NOTE_INNER_CLASS}>
                <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span>Last saved</span>
                  <span className={TIMESTAMP_CLASS}>{formatDateTime(savedInternalNote.updated_at)}</span>
                </div>
                <RichNoteContent
                  body={savedInternalNote.body}
                  bodyJson={savedInternalNote.body_json}
                  bodyFormat={savedInternalNote.body_format}
                  className="text-[0.95rem] leading-6 text-slate-900"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={internalNoteLoading || internalNoteSaving || internalNoteDeleting}
                  onClick={() => {
                    setInternalNoteError(null);
                    setInternalNoteOk(null);
                    setInternalNote(
                      createRichNoteEditorValue({
                        body: savedInternalNote.body,
                        bodyJson: savedInternalNote.body_json ?? null,
                        bodyFormat: savedInternalNote.body_format ?? null,
                      })
                    );
                    setInternalNoteEditing(true);
                  }}
                  className={THREAD_ACTION_SECONDARY}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={internalNoteLoading || internalNoteSaving || internalNoteDeleting}
                  onClick={() => {
                    void deleteInternalNote();
                  }}
                  className={THREAD_ACTION_DESTRUCTIVE}
                >
                  {internalNoteDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
              </>
            ) : null}

            {internalNoteEditing || !savedInternalNote?.body.trim() ? (
              <>
                <div className={INTERNAL_NOTE_INNER_CLASS}>
                  <RichNoteEditor
                    value={internalNote}
                    onChange={setInternalNote}
                    placeholder="Add a private reminder for this review case..."
                    onSubmitShortcut={() => {
                      void saveInternalNote();
                    }}
                    size="default"
                    disabled={!appUserId || internalNoteLoading || internalNoteSaving || internalNoteDeleting}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
                  <p className="text-xs leading-5 text-slate-500">Use Ctrl/Cmd + Enter to save this note.</p>
                  <div className="flex flex-wrap gap-2">
                    {savedInternalNote?.body.trim() ? (
                      <button
                        type="button"
                        disabled={internalNoteLoading || internalNoteSaving || internalNoteDeleting}
                        onClick={() => {
                          setInternalNoteError(null);
                          setInternalNoteOk(null);
                          setInternalNote(
                            createRichNoteEditorValue({
                              body: savedInternalNote.body,
                              bodyJson: savedInternalNote.body_json ?? null,
                              bodyFormat: savedInternalNote.body_format ?? null,
                            })
                          );
                          setInternalNoteEditing(false);
                        }}
                        className="ui-btn ui-btn-secondary min-h-0 px-3 py-1.5 text-[0.9rem] text-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={!appUserId || internalNoteLoading || internalNoteSaving || internalNoteDeleting}
                      onClick={() => {
                        void saveInternalNote();
                      }}
                      className={INTERNAL_NOTE_SAVE_ACTION}
                    >
                      {internalNoteSaving ? "Saving..." : "Save internal note"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
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
