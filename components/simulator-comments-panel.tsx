"use client";

import { RichNoteContent } from "@/components/rich-note-content";
import { RichNoteEditor } from "@/components/rich-note-editor";
import {
  THREAD_ACTION_DESTRUCTIVE,
  THREAD_ACTION_PRIMARY,
  THREAD_ACTION_SAVE,
  THREAD_ACTION_SECONDARY,
  THREAD_ACTION_SECONDARY_NEUTRAL,
  TRAINEE_ROOT_EDIT_MS,
  formatPanelActionError,
  getErrorMessage,
  subtreeHasAdminQa,
} from "@/features/review-workspace/comments/comment-panel-helpers";
import { ReviewThreadLoadingSkeleton } from "@/features/review-workspace/comments/review-thread-loading-skeleton";
import { SubmittedThreadSummary } from "@/features/review-workspace/comments/submitted-thread-summary";
import { canAccessStaffFeatures, formatAppUserRoleLabel, isTrainee } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import { emitReviewSubmissionsChanged } from "@/lib/hooks/use-review-submissions";
import { createEmptyRichNoteValue, createRichNoteEditorValue, type RichNoteEditorValue } from "@/lib/rich-note";
import { useCurrentUser } from "@/components/current-user-provider";
import { useSimulatorComments } from "@/lib/hooks/use-simulator-comments";
import { canCreatePrivateNotes, canReplyAsQA, canViewPrivateNotes, canWriteTraineeDiscussion } from "@/lib/permissions/checks";
import { submitReviewSubmission } from "@/lib/services/review-submissions";
import { createClient } from "@/lib/supabase";
import type { ReviewSubmissionRow, SimulatorCommentRow } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Stable defaults — `= []` / `= {}` in props create new references each render and break useSimulatorComments' effect deps. */
const EMPTY_SUBMISSIONS: ReviewSubmissionRow[] = [];
const EMPTY_SIMULATOR_COMMENTS: SimulatorCommentRow[] = [];
const EMPTY_AUTHOR_LABELS: Record<string, string> = {};

type Props = {
  /** Review workspace thread (review_threads.id) */
  threadId?: string | null;
  /** When true and threadId set, load thread comments */
  reviewMode?: boolean;
  /** Targets for admin_private_notes (canonical ids) */
  privateAlertInternalId?: string | null;
  privateSimulatorUserId?: string | null;
  /** Heading above the panel (default: "Comments") */
  title?: string;
  /** When set, renders this as a page-style section heading with room for save feedback on the same row (for example, a case note panel). */
  sectionHeaderTitle?: string;
  showTitle?: boolean;
  withTopBorder?: boolean;
  emptyMessage?: string;
  adminModeOverride?: "reply" | "private";
  highlightRootCommentId?: string | null;
  submissions?: ReviewSubmissionRow[];
  createThread?: (() => Promise<string | null>) | null;
  showComposer?: boolean;
  showItems?: boolean;
  showStatusMessages?: boolean;
  onDeleteDraftThread?: ((threadId: string) => Promise<void>) | null;
  prepareTraineeThread?: ((threadId: string) => Promise<void>) | null;
  composerTitle?: string;
  composerDescription?: string | null;
  flushTop?: boolean;
  predefinedNotes?: {
    id: string;
    note_text: string;
    created_at: string;
    created_by: string | null;
  }[];
  hasInitialCommentData?: boolean;
  initialDiscussionComments?: SimulatorCommentRow[];
  initialPrivateNotes?: SimulatorCommentRow[];
  initialAuthorLabels?: Record<string, string>;
  traineeSubmittedSummaryLayout?: "default" | "alert";
  showSubmittedSummary?: boolean;
  showQaReplyAction?: boolean;
  showReviewerFeedbackInThread?: boolean;
};

const EMPTY_PREDEFINED_NOTES: NonNullable<Props["predefinedNotes"]> = [];

export function SimulatorCommentsPanel({
  threadId = null,
  reviewMode = false,
  privateAlertInternalId = null,
  privateSimulatorUserId = null,
  title = "Comments",
  sectionHeaderTitle,
  showTitle = true,
  withTopBorder = true,
  emptyMessage = "No comments yet.",
  adminModeOverride,
  highlightRootCommentId = null,
  submissions = EMPTY_SUBMISSIONS,
  createThread = null,
  showComposer = true,
  showItems = true,
  showStatusMessages = true,
  onDeleteDraftThread = null,
  prepareTraineeThread = null,
  composerTitle,
  composerDescription = null,
  flushTop = false,
  predefinedNotes = EMPTY_PREDEFINED_NOTES,
  hasInitialCommentData = false,
  initialDiscussionComments = EMPTY_SIMULATOR_COMMENTS,
  initialPrivateNotes = EMPTY_SIMULATOR_COMMENTS,
  initialAuthorLabels = EMPTY_AUTHOR_LABELS,
  traineeSubmittedSummaryLayout = "default",
  showSubmittedSummary = true,
  showQaReplyAction = true,
  showReviewerFeedbackInThread: _showReviewerFeedbackInThread = false,
}: Props) {
  void _showReviewerFeedbackInThread;
  const { appUser, loading: sessionLoading } = useCurrentUser();
  const [adminMode, setAdminMode] = useState<"reply" | "private">(adminModeOverride ?? "reply");
  const hasPrivateTarget = Boolean(privateAlertInternalId || privateSimulatorUserId);
  const includeAdminPrivate = canViewPrivateNotes(appUser?.role) && adminMode === "private";
  const {
    discussionComments,
    privateNotes,
    authorLabels,
    loading,
    error,
    refresh: refreshDiscussion,
    addUserComment,
    addUserReply,
    updateUserRootComment,
    addAdminPrivateComment,
    addAdminQaReply,
  } =
    useSimulatorComments({
      threadId,
      reviewMode: Boolean(threadId && reviewMode),
      privateAlertInternalId,
      privateSimulatorUserId,
      viewerAppUserId: appUser?.id ?? null,
      viewerRole: appUser?.role ?? null,
      includeAdminPrivate,
      hydrateFromInitialData: hasInitialCommentData,
      initialDiscussionComments,
      initialPrivateNotes,
      initialAuthorLabels,
    });
  const effectiveDiscussionComments = useMemo(
    () =>
      hasInitialCommentData && discussionComments.length === 0
        ? initialDiscussionComments
        : discussionComments,
    [discussionComments, hasInitialCommentData, initialDiscussionComments]
  );
  const effectivePrivateNotes = useMemo(
    () =>
      hasInitialCommentData && privateNotes.length === 0
        ? initialPrivateNotes
        : privateNotes,
    [hasInitialCommentData, initialPrivateNotes, privateNotes]
  );
  const effectiveAuthorLabels = useMemo(
    () =>
      hasInitialCommentData && Object.keys(authorLabels).length === 0
        ? initialAuthorLabels
        : authorLabels,
    [authorLabels, hasInitialCommentData, initialAuthorLabels]
  );
  const [composerNote, setComposerNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyNote, setReplyNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [actionOkVisible, setActionOkVisible] = useState(false);
  const [editingRootId, setEditingRootId] = useState<string | null>(null);
  const [editRootNote, setEditRootNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [resubmittingRootId, setResubmittingRootId] = useState<string | null>(null);
  const [replyResubmittingRootId, setReplyResubmittingRootId] = useState<string | null>(null);
  const [deletingDraftThreadId, setDeletingDraftThreadId] = useState<string | null>(null);
  const [traineeComposerMode, setTraineeComposerMode] = useState<"draft" | "review">("review");
  const [transientNotice, setTransientNotice] = useState<{
    message: string;
    tone: "success" | "error";
    /** `sectionHeader` = same row as `sectionHeaderTitle`; `card` = corner of composer shell */
    placement?: "card" | "sectionHeader";
  } | null>(null);
  const [transientNoticeVisible, setTransientNoticeVisible] = useState(false);

  const predefinedItems = useMemo(() => {
    return predefinedNotes
      .map((n) => ({
        key: `p-${n.id}`,
        created_at: n.created_at,
        created_by: n.created_by,
        text: n.note_text,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [predefinedNotes]);

  const topLevelComments = useMemo(() => {
    return effectiveDiscussionComments
      .filter((c) => c.parent_comment_id == null && c.comment_type === "user_comment")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [effectiveDiscussionComments]);

  const latestSubmissionByRootId = useMemo(() => {
    const map = new Map<string, ReviewSubmissionRow>();
    for (const submission of submissions) {
      const rootId = submission.submitted_root_comment_id;
      if (!rootId) continue;
      const existing = map.get(rootId);
      if (!existing || submission.submission_version > existing.submission_version) {
        map.set(rootId, submission);
      }
    }
    return map;
  }, [submissions]);

  const adminPrivateNotes = useMemo(() => {
    return [...effectivePrivateNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [effectivePrivateNotes]);

  const activeAdminThreadRootId = useMemo(() => {
    if (!canAccessStaffFeatures(appUser?.role)) return null;
    return topLevelComments[0]?.id ?? null;
  }, [appUser?.role, topLevelComments]);

  const canEditTraineeRoot = useCallback(
    (c: SimulatorCommentRow) => {
      if (!appUser || !isTrainee(appUser.role) || appUser.id !== c.author_app_user_id) return false;
      if (c.comment_type !== "user_comment" || c.parent_comment_id != null) return false;
      if (!latestSubmissionByRootId.get(c.id)) return true;
      if (Date.now() - new Date(c.created_at).getTime() >= TRAINEE_ROOT_EDIT_MS) return false;
      return !subtreeHasAdminQa(c.id, effectiveDiscussionComments);
    },
    [appUser, effectiveDiscussionComments, latestSubmissionByRootId]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, typeof effectiveDiscussionComments> = {};
    for (const c of effectiveDiscussionComments) {
      if (!c.parent_comment_id) continue;
      if (!map[c.parent_comment_id]) map[c.parent_comment_id] = [];
      map[c.parent_comment_id].push(c);
    }
    for (const parentId of Object.keys(map)) {
      map[parentId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [effectiveDiscussionComments]);

  const threadFeedItemsByRootId = useMemo(() => {
    const map = new Map<string, Array<{ kind: "reply"; sortAt: string; reply: SimulatorCommentRow }>>();

    for (const [parentId, replies] of Object.entries(repliesByParent)) {
      map.set(
        parentId,
        replies.map((reply) => ({
          kind: "reply" as const,
          sortAt: reply.created_at,
          reply,
        }))
      );
    }

    for (const items of map.values()) {
      items.sort((a, b) => new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime());
    }

    return map;
  }, [repliesByParent]);

  const hasVisibleItems =
    canViewPrivateNotes(appUser?.role)
      ? adminMode === "private"
        ? adminPrivateNotes.length > 0
        : predefinedItems.length > 0 || topLevelComments.length > 0
      : predefinedItems.length > 0 || topLevelComments.length > 0;
  const hasUserThreads = topLevelComments.length > 0;
  const showAdminThreadHint =
    canReplyAsQA(appUser?.role) &&
    adminMode === "reply" &&
    !threadId &&
    !hasUserThreads;
  const traineeNeedsThread = canWriteTraineeDiscussion(appUser?.role) && reviewMode && !threadId && !createThread;
  const canWriteTraineeNotes = canWriteTraineeDiscussion(appUser?.role);
  const canWriteAdminPrivateNote =
    adminMode === "private" && !!appUser?.role && canCreatePrivateNotes(appUser.role);
  const composerActionLabel =
    traineeComposerMode === "draft" ? "Save as draft" : "Submit for review";

  useEffect(() => {
    if (!transientNotice) return;
    setTransientNoticeVisible(true);
    const fadeOutId = window.setTimeout(() => {
      setTransientNoticeVisible(false);
    }, 1800);
    const timeoutId = window.setTimeout(() => {
      setTransientNotice(null);
    }, 2400);
    return () => {
      window.clearTimeout(fadeOutId);
      window.clearTimeout(timeoutId);
    };
  }, [transientNotice]);

  useEffect(() => {
    if (!actionOk) return;
    setActionOkVisible(true);
    const fadeOutId = window.setTimeout(() => {
      setActionOkVisible(false);
    }, 1800);
    const timeoutId = window.setTimeout(() => {
      setActionOk(null);
    }, 2400);
    return () => {
      window.clearTimeout(fadeOutId);
      window.clearTimeout(timeoutId);
    };
  }, [actionOk]);

  useEffect(() => {
    if (!canViewPrivateNotes(appUser?.role)) return;
    if (adminModeOverride) {
      setAdminMode(adminModeOverride);
      return;
    }
    if (threadId) {
      setAdminMode("reply");
    } else {
      setAdminMode("private");
    }
  }, [appUser?.role, threadId, adminModeOverride]);

  const getAuthorLabel = useCallback(
    (comment: SimulatorCommentRow) => {
      if (comment.author_app_user_id === appUser?.id) {
        const viewerFullName = (appUser.full_name ?? "").trim();
        const viewerEmail = (appUser.email ?? "").trim();
        if (viewerFullName && viewerEmail) return `${viewerFullName} · ${viewerEmail}`;
        if (viewerFullName || viewerEmail) return viewerFullName || viewerEmail;
      }
      return (
        effectiveAuthorLabels[comment.author_app_user_id] ??
        (comment.author_role === "trainee" ? "user" : formatAppUserRoleLabel(comment.author_role))
      );
    },
    [appUser?.email, appUser?.full_name, appUser?.id, effectiveAuthorLabels]
  );

  const onAddTrainee = useCallback(async (mode: "draft" | "review" = "review") => {
    if (!composerNote.body.trim() || !appUser?.id) return;
    setActionError(null);
    setActionOk(null);
    try {
      if (canViewPrivateNotes(appUser.role)) {
        if (adminMode === "private") {
          await addAdminPrivateComment(composerNote, appUser.id);
          setTransientNotice({
            message: "Private note saved.",
            tone: "success",
            placement: sectionHeaderTitle ? "sectionHeader" : "card",
          });
        } else {
          if (!activeAdminThreadRootId) {
            throw new Error("Open a review case from the Admin panel to add an admin reply.");
          }
          await addAdminQaReply(composerNote, activeAdminThreadRootId, appUser.id);
          setActionOk("QA reply sent.");
        }
      } else {
        const workingThreadId = createThread ? await createThread() : threadId;
        if (!workingThreadId) {
          throw new Error("No cases for review yet. Wait a moment or refresh the page.");
        }

        if (prepareTraineeThread) {
          await prepareTraineeThread(workingThreadId);
        }

        const createdCommentId = await addUserComment(composerNote, appUser.id, workingThreadId);
        if (mode === "draft") {
          setActionOk("Draft note saved.");
          if (!showStatusMessages) {
            setTransientNotice({ message: "Draft saved.", tone: "success" });
          }
        } else {
          const supabase = createClient();
          const { submission, error: submitError } = await submitReviewSubmission(supabase, {
            threadId: workingThreadId,
            submittedRootCommentId: createdCommentId,
            activityAppUserId: appUser.id,
          });

          if (submitError) {
            throw new Error(`Note was saved, but review snapshot was not created: ${submitError}`);
          }

          emitReviewSubmissionsChanged(workingThreadId);
          setActionOk(
            submission
              ? `Review note submitted as snapshot v${submission.submission_version}.`
              : "Review note submitted."
          );
          if (!showStatusMessages) {
            setTransientNotice({ message: "Sent to reviewer.", tone: "success" });
          }
        }
      }
      setComposerNote(createEmptyRichNoteValue());
    } catch (e) {
      if (!showStatusMessages) {
        setTransientNotice({ message: "Could not save your note.", tone: "error" });
      }
      setActionError(getErrorMessage(e, "Failed to add comment"));
    }
  }, [
    activeAdminThreadRootId,
    addAdminPrivateComment,
    addAdminQaReply,
    addUserComment,
    adminMode,
    appUser,
    composerNote,
    createThread,
    prepareTraineeThread,
    sectionHeaderTitle,
    showStatusMessages,
    threadId,
  ]);

  const onSendQa = useCallback(
    async (parentId: string) => {
      if (!replyNote.body.trim() || !appUser?.id) return;
      setActionError(null);
      setActionOk(null);
      try {
        await addAdminQaReply(replyNote, parentId, appUser.id);
        setReplyNote(createEmptyRichNoteValue());
        setReplyTo(null);
        setActionOk("QA reply sent.");
      } catch (e) {
        setActionError(getErrorMessage(e, "Failed to send QA reply"));
      }
    },
    [addAdminQaReply, appUser, replyNote]
  );

  const onResubmitRoot = useCallback(
    async (rootId: string, nextNote?: RichNoteEditorValue) => {
      if (!appUser?.id || !threadId) return;
      setActionError(null);
      setActionOk(null);
      setResubmittingRootId(rootId);
      try {
        if (nextNote) {
          await updateUserRootComment(rootId, nextNote, appUser.id);
        }

        const supabase = createClient();
        const { submission, error: submitError } = await submitReviewSubmission(supabase, {
          threadId,
          submittedRootCommentId: rootId,
          activityAppUserId: appUser.id,
        });

        if (submitError) {
          throw new Error(`Update was saved, but review snapshot was not created: ${submitError}`);
        }

        emitReviewSubmissionsChanged(threadId);
        setEditingRootId(null);
        setEditRootNote(createEmptyRichNoteValue());
        setActionOk(
          submission
            ? `Resubmitted for review as snapshot v${submission.submission_version}.`
            : "Resubmitted for review."
        );
      } catch (e) {
        setActionError(getErrorMessage(e, "Failed to resubmit note"));
      } finally {
        setResubmittingRootId(null);
      }
    },
    [appUser, threadId, updateUserRootComment]
  );

  const onTraineeReplyThenNewSnapshot = useCallback(
    async (rootId: string) => {
      if (!appUser?.id || !threadId || !replyNote.body.trim()) return;
      setActionError(null);
      setActionOk(null);
      setReplyResubmittingRootId(rootId);
      try {
        await addUserReply(replyNote, rootId, appUser.id);
        const supabase = createClient();
        const { submission, error: submitError } = await submitReviewSubmission(supabase, {
          threadId,
          submittedRootCommentId: rootId,
          activityAppUserId: appUser.id,
        });
        if (submitError) {
          throw new Error(`Reply was saved, but a new snapshot was not created: ${submitError}`);
        }
        emitReviewSubmissionsChanged(threadId);
        void refreshDiscussion();
        setReplyNote(createEmptyRichNoteValue());
        setReplyTo(null);
        setActionOk(
          submission
            ? `Reply posted and snapshot v${submission.submission_version} submitted for review.`
            : "Reply posted and submitted for review."
        );
      } catch (e) {
        setActionError(getErrorMessage(e, "Failed to submit for review"));
      } finally {
        setReplyResubmittingRootId(null);
      }
    },
    [addUserReply, appUser, replyNote, threadId, refreshDiscussion]
  );

  const onDeleteDraft = useCallback(async () => {
    if (!threadId || !onDeleteDraftThread) return;
    setActionError(null);
    setActionOk(null);
    setDeletingDraftThreadId(threadId);
    try {
      await onDeleteDraftThread(threadId);
      setActionOk("Draft deleted.");
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to delete draft"));
    } finally {
      setDeletingDraftThreadId(null);
    }
  }, [onDeleteDraftThread, threadId]);

  const shouldRenderPanel =
    Boolean(threadId) ||
    (includeAdminPrivate && hasPrivateTarget) ||
    predefinedNotes.length > 0 ||
    reviewMode ||
    Boolean(adminModeOverride);

  if (!shouldRenderPanel) {
    return null;
  }

  const transientNoticeBubble = transientNotice ? (
    <div
      className={`rounded-[0.9rem] px-3 py-1.5 text-xs font-medium shadow-[0_14px_28px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out sm:px-3.5 sm:py-2 sm:text-sm ${
        transientNoticeVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-1 opacity-0"
      } ${
        transientNotice.tone === "success"
          ? "border border-emerald-200 bg-emerald-50/95 text-emerald-800"
          : "border border-rose-200 bg-rose-50/95 text-rose-800"
      }`}
      role="status"
      aria-live="polite"
    >
      {transientNotice.message}
    </div>
  ) : null;

  return (
    <div className={`${withTopBorder ? "mt-6 border-t border-slate-200 pt-4" : flushTop ? "mt-0" : "mt-3"} space-y-3`}>
      {sectionHeaderTitle ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="heading-section flex-1 border-b-0 border-transparent pb-0 pr-2">
              {sectionHeaderTitle}
            </h2>
            <div className="pointer-events-none flex min-w-0 shrink-0 justify-end">
              {transientNotice?.placement === "sectionHeader" ? transientNoticeBubble : null}
            </div>
          </div>
          <div className="mt-3 border-b border-[var(--border-subtle)]" aria-hidden />
        </div>
      ) : null}
      {showTitle && !sectionHeaderTitle ? <h3 className="text-sm font-semibold text-slate-800">{title}</h3> : null}
      {sessionLoading ? (
        <p className="text-xs text-slate-500">Loading session…</p>
      ) : !appUser ? (
        <p className="text-xs text-slate-500">Sign in to add or view comments.</p>
      ) : (
        <div className="space-y-2">
          {canViewPrivateNotes(appUser.role) && !adminModeOverride ? (
            <div className="flex gap-2">
              {hasUserThreads ? (
                <button
                  type="button"
                  className={`rounded px-2.5 py-1 text-xs ${
                    adminMode === "reply"
                      ? "ui-btn ui-btn-primary min-h-0 rounded-[1.2rem] px-3 py-1.5 text-xs"
                      : "ui-btn ui-btn-secondary min-h-0 rounded-[1.2rem] px-3 py-1.5 text-xs"
                  }`}
                  onClick={() => setAdminMode("reply")}
                >
                  Users response
                </button>
              ) : null}
                <button
                  type="button"
                  className={`rounded px-2.5 py-1 text-xs ${
                  adminMode === "private"
                    ? "ui-btn ui-btn-primary min-h-0 rounded-[1.2rem] px-3 py-1.5 text-xs"
                    : "ui-btn ui-btn-secondary min-h-0 rounded-[1.2rem] px-3 py-1.5 text-xs"
                }`}
                onClick={() => setAdminMode("private")}
              >
                Private note (admin only)
              </button>
            </div>
          ) : null}
          {!showComposer ? null : traineeNeedsThread ? (
            <div className="empty-state text-left">
              Preparing review workspace…
            </div>
          ) : canWriteTraineeNotes || adminMode === "private" ? (
            <div
              className={`evidence-shell relative space-y-4 rounded-[1rem] ${
                composerTitle || composerDescription ? "p-4 sm:p-5" : "px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4"
              }`}
            >
              {!showStatusMessages && transientNotice && transientNotice.placement !== "sectionHeader" ? (
                <div className="pointer-events-none absolute right-4 top-4 z-10">{transientNoticeBubble}</div>
              ) : null}
              {composerTitle || composerDescription ? (
                <div className="space-y-2">
                  {composerTitle ? (
                    <h4 className="heading-section border-b-0 pb-0 text-left">{composerTitle}</h4>
                  ) : null}
                  {composerDescription ? (
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">{composerDescription}</p>
                  ) : null}
                </div>
              ) : null}

              {canWriteTraineeNotes ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-[0.78rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(244,248,251,0.96),rgba(236,243,248,0.96))] p-[2px] shadow-[inset_0_1px_2px_rgba(169,188,201,0.18)]">
                      <button
                        type="button"
                        onClick={() => setTraineeComposerMode("draft")}
                        className={`rounded-[0.64rem] px-2.25 py-[0.36rem] text-[0.84rem] font-medium transition ${
                          traineeComposerMode === "draft"
                            ? "border border-slate-300/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,251,0.96))] text-slate-900 shadow-[inset_0_1px_2px_rgba(255,255,255,0.78),inset_0_-1px_2px_rgba(166,183,196,0.18)]"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Save as draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setTraineeComposerMode("review")}
                        className={`rounded-[0.64rem] px-2.25 py-[0.36rem] text-[0.84rem] font-medium transition ${
                          traineeComposerMode === "review"
                            ? "border border-[rgba(20,63,67,0.92)] bg-[linear-gradient(180deg,rgba(41,95,101,0.98),rgba(28,77,82,0.98))] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(11,32,35,0.28)]"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Submit for review
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.15rem] border border-slate-200/90 bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <RichNoteEditor
                      value={composerNote}
                      onChange={setComposerNote}
                      placeholder={
                        traineeComposerMode === "draft"
                          ? "Write a private working note for yourself..."
                          : "Write the note you want the reviewer to see..."
                      }
                      onSubmitShortcut={() => {
                        void onAddTrainee(traineeComposerMode);
                      }}
                    />
                    <div className="mt-3 flex flex-col gap-3 border-t border-slate-200/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500">
                        Use Ctrl/Cmd + Enter to {traineeComposerMode === "draft" ? "save as draft" : "submit for review"}.
                      </p>
                      <button
                        type="button"
                        disabled={!composerNote.body.trim()}
                        onClick={() => {
                          void onAddTrainee(traineeComposerMode);
                        }}
                        className={`ui-btn min-h-0 px-3 py-1.5 text-[0.9rem] disabled:cursor-not-allowed disabled:opacity-60 ${
                          traineeComposerMode === "review"
                            ? "ui-btn-primary"
                            : "border border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(241,246,250,1))] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(18,31,46,0.09)] hover:border-slate-400 hover:bg-[linear-gradient(180deg,rgba(250,252,253,1),rgba(234,241,246,1))]"
                        }`}
                      >
                        {composerActionLabel}
                      </button>
                    </div>
                  </div>
                </div>
              ) : canWriteAdminPrivateNote ? (
                <div className="space-y-3 rounded-[1.15rem] border border-slate-200/90 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-xs leading-5 text-slate-500">
                    Private notes are visible only to staff and do not affect the trainee case directly.
                  </p>
                  <RichNoteEditor
                    value={composerNote}
                    onChange={setComposerNote}
                    placeholder="Add an internal admin note..."
                    onSubmitShortcut={() => {
                      void onAddTrainee();
                    }}
                  />
                  <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">Use Ctrl/Cmd + Enter to save this note.</p>
                    <button
                      type="button"
                      disabled={!composerNote.body.trim()}
                      onClick={() => {
                        void onAddTrainee();
                      }}
                      className="ui-btn ui-btn-primary min-h-0 px-3 py-1.5 text-[0.9rem] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save private note
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {showStatusMessages && actionError ? <p className="text-xs text-rose-600">{formatPanelActionError(actionError)}</p> : null}
      {showStatusMessages && actionOk ? (
        <div
          className={`inline-flex rounded-[0.9rem] border border-emerald-200 bg-emerald-50/95 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out ${
            actionOkVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          {actionOk}
        </div>
      ) : null}
      {showStatusMessages && error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {!showItems ? null : loading && !hasInitialCommentData ? (
        reviewMode && canAccessStaffFeatures(appUser?.role) ? (
          <ReviewThreadLoadingSkeleton />
        ) : (
          <p className="text-xs text-slate-500">Loading comments…</p>
        )
      ) : traineeNeedsThread ? (
        <div className="empty-state">
          Review case is being created for this workspace.
        </div>
      ) : !hasVisibleItems ? (
        emptyMessage ? (
        <div className="empty-state">
          {canReplyAsQA(appUser?.role) && !threadId && adminMode === "reply"
            ? "Open the case note on the case page to use the training case."
            : emptyMessage}
        </div>
        ) : null
      ) : (
        <ul className="space-y-2">
          {showAdminThreadHint ? (
            <li className="empty-state">
              Open a review case from the Admin panel to view notes for a specific user.
            </li>
          ) : null}
          {(!canViewPrivateNotes(appUser?.role) || adminMode === "reply") &&
            predefinedItems.map((item) => (
            <li key={item.key} className="content-panel p-3 text-sm text-slate-800">
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>{item.created_by ?? "—"}</span>
                <span className="tabular-nums">{formatDateTime(item.created_at)}</span>
              </div>
              <RichNoteContent body={item.text} className="text-slate-900" />
            </li>
          ))}
          {canViewPrivateNotes(appUser?.role) && adminMode === "private"
            ? adminPrivateNotes.map((note) => (
            <li key={note.id} className="muted-panel p-3 text-sm text-slate-800">
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>Admin internal</span>
                <span className="tabular-nums">{formatDateTime(note.created_at)}</span>
              </div>
              <RichNoteContent
                body={note.body}
                bodyJson={note.body_json}
                bodyFormat={note.body_format}
                className="text-slate-900"
              />
            </li>
          ))
            : null}
          {(!canViewPrivateNotes(appUser?.role) || adminMode === "reply") &&
            topLevelComments.map((item) => {
              const threadFeedItems = threadFeedItemsByRootId.get(item.id) ?? [];
              const hasThreadFeed = threadFeedItems.length > 0;
              const showTraineeRootToolbar =
                isTrainee(appUser?.role) &&
                editingRootId !== item.id &&
                (canEditTraineeRoot(item) ||
                  !latestSubmissionByRootId.get(item.id) ||
                  Boolean(threadId && onDeleteDraftThread));
              const showTraineeReplySection =
                isTrainee(appUser?.role) &&
                item.comment_type === "user_comment" &&
                Boolean(latestSubmissionByRootId.get(item.id)) &&
                editingRootId !== item.id;
              const traineeFooterCombined =
                !hasThreadFeed && (showTraineeRootToolbar || showTraineeReplySection);
              const showTraineeRootToolbarRow = showTraineeRootToolbar && hasThreadFeed;
              const showTraineeReplySeparate = showTraineeReplySection && hasThreadFeed;

              const isPrivateDraft = !latestSubmissionByRootId.get(item.id);
              const isStaffReviewThreadItem =
                !isTrainee(appUser?.role) && reviewMode && Boolean(latestSubmissionByRootId.get(item.id));

              return (
            <li
              key={item.id}
              className={`text-sm text-slate-800 ${
                isStaffReviewThreadItem
                  ? "rounded-[1.1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,252,254,0.98),rgba(242,247,251,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
                  : isPrivateDraft
                    ? "private-draft-panel p-3"
                    : "content-panel p-3"
              } ${item.id === highlightRootCommentId ? "ring-1 ring-[rgb(154_143_135_/_0.35)]" : ""}`}
            >
              {latestSubmissionByRootId.get(item.id) ? (
                <SubmittedThreadSummary
                  submission={latestSubmissionByRootId.get(item.id)!}
                  authorLabel={getAuthorLabel(item)}
                  showAuthor={!isTrainee(appUser?.role)}
                  traineeLayout={traineeSubmittedSummaryLayout}
                  headerOnly={!showSubmittedSummary || isStaffReviewThreadItem}
                />
              ) : (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="ui-badge ui-badge-private">
                    Private
                  </span>
                  <span>Saved {formatDateTime(item.created_at)}</span>
                  {!isTrainee(appUser?.role) ? (
                    <>
                      <span className="text-slate-400">by</span>
                      <span className="text-slate-600">{getAuthorLabel(item)}</span>
                    </>
                  ) : null}
                </div>
              )}
              {editingRootId === item.id ? (
                <div className="space-y-2">
                  <RichNoteEditor
                    value={editRootNote}
                    onChange={setEditRootNote}
                    placeholder="Update your note..."
                    size="compact"
                    onSubmitShortcut={() => {
                      if (!appUser?.id || !editRootNote.body.trim()) return;
                      void (async () => {
                        setActionError(null);
                        try {
                          await updateUserRootComment(item.id, editRootNote, appUser.id);
                          setEditingRootId(null);
                          setEditRootNote(createEmptyRichNoteValue());
                        } catch (e) {
                          setActionError(getErrorMessage(e, "Failed to save edit"));
                        }
                      })();
                    }}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className={THREAD_ACTION_SAVE}
                      onClick={async () => {
                        if (!appUser?.id || !editRootNote.body.trim()) return;
                        setActionError(null);
                        try {
                          await updateUserRootComment(item.id, editRootNote, appUser.id);
                          setEditingRootId(null);
                          setEditRootNote(createEmptyRichNoteValue());
                        } catch (e) {
                          setActionError(getErrorMessage(e, "Failed to save edit"));
                        }
                      }}
                    >
                      Save changes
                    </button>
                    {isTrainee(appUser?.role) &&
                    latestSubmissionByRootId.get(item.id) &&
                    latestSubmissionByRootId.get(item.id)!.review_state !== "changes_requested" ? (
                      <button
                        type="button"
                        className={THREAD_ACTION_PRIMARY}
                        disabled={resubmittingRootId === item.id || !editRootNote.body.trim()}
                        onClick={() => {
                          void onResubmitRoot(item.id, editRootNote);
                        }}
                      >
                        {resubmittingRootId === item.id ? "Resubmitting..." : "Save and resubmit for review"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={THREAD_ACTION_SECONDARY_NEUTRAL}
                      onClick={() => {
                        setEditingRootId(null);
                        setEditRootNote(createEmptyRichNoteValue());
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`${isStaffReviewThreadItem ? "py-1" : "px-1 py-1"}`}>
                  <RichNoteContent
                    body={item.body}
                    bodyJson={item.body_json}
                    bodyFormat={item.body_format}
                    className={isStaffReviewThreadItem ? "text-[0.97rem] leading-6 text-slate-900" : "text-slate-900"}
                  />
                </div>
              )}
              {showTraineeRootToolbarRow ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200/80 pt-4">
                  {canEditTraineeRoot(item) ? (
                    <button
                      type="button"
                      className={THREAD_ACTION_SECONDARY}
                      onClick={() => {
                        setReplyTo(null);
                        setReplyNote(createEmptyRichNoteValue());
                        setEditingRootId(item.id);
                        setEditRootNote(
                          createRichNoteEditorValue({
                            body: item.body,
                            bodyJson: item.body_json,
                            bodyFormat: item.body_format,
                          })
                        );
                      }}
                    >
                      {latestSubmissionByRootId.get(item.id)
                        ? "Edit (5 min)"
                        : "Edit"}
                    </button>
                  ) : null}
                  {!latestSubmissionByRootId.get(item.id) ? (
                    <button
                      type="button"
                      className={THREAD_ACTION_PRIMARY}
                      disabled={resubmittingRootId === item.id}
                      onClick={() => {
                        void onResubmitRoot(item.id);
                      }}
                    >
                      {resubmittingRootId === item.id ? "Submitting..." : "Submit for review"}
                    </button>
                  ) : null}
                  {threadId && onDeleteDraftThread ? (
                    <button
                      type="button"
                      className={THREAD_ACTION_DESTRUCTIVE}
                      disabled={deletingDraftThreadId === threadId}
                      onClick={() => {
                        void onDeleteDraft();
                      }}
                    >
                      {deletingDraftThreadId === threadId ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {traineeFooterCombined ? (
                <div className="mt-4 border-t border-slate-200/80 pt-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    {showTraineeRootToolbar ? (
                      <>
                        {canEditTraineeRoot(item) ? (
                          <button
                            type="button"
                            className={THREAD_ACTION_SECONDARY}
                            onClick={() => {
                              setReplyTo(null);
                              setReplyNote(createEmptyRichNoteValue());
                              setEditingRootId(item.id);
                              setEditRootNote(
                                createRichNoteEditorValue({
                                  body: item.body,
                                  bodyJson: item.body_json,
                                  bodyFormat: item.body_format,
                                })
                              );
                            }}
                          >
                            {latestSubmissionByRootId.get(item.id)
                              ? "Edit (5 min)"
                              : "Edit"}
                          </button>
                        ) : null}
                        {!latestSubmissionByRootId.get(item.id) ? (
                          <button
                            type="button"
                            className={THREAD_ACTION_PRIMARY}
                            disabled={resubmittingRootId === item.id}
                            onClick={() => {
                              void onResubmitRoot(item.id);
                            }}
                          >
                            {resubmittingRootId === item.id ? "Submitting..." : "Submit for review"}
                          </button>
                        ) : null}
                        {threadId && onDeleteDraftThread ? (
                          <button
                            type="button"
                            className={THREAD_ACTION_DESTRUCTIVE}
                            disabled={deletingDraftThreadId === threadId}
                            onClick={() => {
                              void onDeleteDraft();
                            }}
                          >
                            {deletingDraftThreadId === threadId ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {showTraineeReplySection && replyTo !== item.id ? (
                      <button
                        type="button"
                        className={THREAD_ACTION_SECONDARY}
                        onClick={() => {
                          setReplyTo(item.id);
                          setReplyNote(createEmptyRichNoteValue());
                        }}
                      >
                        Reply
                      </button>
                    ) : null}
                  </div>
                  {showTraineeReplySection && replyTo === item.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested" ? (
                        <p className="text-xs text-slate-600">
                          The reviewer asked for changes. Your message is added to this case and sent as a new version
                          for staff.
                        </p>
                      ) : null}
                      <RichNoteEditor
                        value={replyNote}
                        onChange={setReplyNote}
                        placeholder={
                          latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested"
                            ? "Write your response to the reviewer…"
                            : "Reply…"
                        }
                        size="compact"
                        onSubmitShortcut={() => {
                          if (!appUser?.id || !replyNote.body.trim()) return;
                          if (latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested") {
                            void onTraineeReplyThenNewSnapshot(item.id);
                            return;
                          }
                          void (async () => {
                            setActionError(null);
                            setActionOk(null);
                            try {
                              await addUserReply(replyNote, item.id, appUser.id);
                              setReplyNote(createEmptyRichNoteValue());
                              setReplyTo(null);
                              setActionOk("Reply sent.");
                            } catch (e) {
                              setActionError(getErrorMessage(e, "Failed to send reply"));
                            }
                          })();
                        }}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className={THREAD_ACTION_PRIMARY}
                          disabled={
                            !replyNote.body.trim() ||
                            (latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested" &&
                              replyResubmittingRootId === item.id)
                          }
                          onClick={async () => {
                            if (!appUser?.id || !replyNote.body.trim()) return;
                            if (latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested") {
                              await onTraineeReplyThenNewSnapshot(item.id);
                              return;
                            }
                            setActionError(null);
                            setActionOk(null);
                            try {
                              await addUserReply(replyNote, item.id, appUser.id);
                              setReplyNote(createEmptyRichNoteValue());
                              setReplyTo(null);
                              setActionOk("Reply sent.");
                            } catch (e) {
                              setActionError(getErrorMessage(e, "Failed to send reply"));
                            }
                          }}
                        >
                          {latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested"
                            ? replyResubmittingRootId === item.id
                              ? "Submitting…"
                              : "Submit for review"
                            : "Send reply"}
                        </button>
                        <button
                          type="button"
                          className={THREAD_ACTION_SECONDARY_NEUTRAL}
                          onClick={() => {
                            setReplyTo(null);
                            setReplyNote(createEmptyRichNoteValue());
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {hasThreadFeed ? (
                <div className="mt-4 border-t border-slate-200/80 pt-4">
                  <div className="space-y-3">
                    {threadFeedItems.map((entry) => {
                      if (entry.kind === "reply") {
                        const reply = entry.reply;
                        const isTraineeReply = reply.author_role === "trainee";
                        const authorLabel = getAuthorLabel(reply);
                        const compactAuthorLabel = authorLabel.split(" · ")[0] ?? authorLabel;
                        const bubbleClass = isTraineeReply
                          ? "border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(250,252,254,0.985))] shadow-[0_3px_10px_rgba(15,23,42,0.025)]"
                          : "border-[rgb(196_220_220_/_0.96)] bg-[linear-gradient(180deg,rgba(246,251,251,0.992),rgba(236,245,245,0.992))] shadow-[inset_0_0_0_1px_rgba(90,134,138,0.05),0_4px_12px_rgba(30,90,95,0.04)]";

                        return (
                          <div
                            key={reply.id}
                            className={`flex ${isTraineeReply ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`w-full rounded-[1.15rem] border px-4 py-3 sm:max-w-[76%] ${
                                isTraineeReply ? "sm:max-w-[68%]" : ""
                              } ${bubbleClass}`}
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
                                <span className="tabular-nums">{formatDateTime(reply.created_at)}</span>
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
                      }

                    })}
                  </div>
                </div>
              ) : null}
              {showQaReplyAction && canReplyAsQA(appUser?.role) && item.comment_type === "user_comment" ? (
                <div className="mt-4 border-t border-slate-200/80 pt-4">
                  {replyTo === item.id ? (
                    <div className="flex flex-col gap-2">
                      <RichNoteEditor
                        value={replyNote}
                        onChange={setReplyNote}
                        placeholder="QA reply…"
                        size="compact"
                        onSubmitShortcut={() => {
                          void onSendQa(item.id);
                        }}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className={THREAD_ACTION_PRIMARY}
                          onClick={() => onSendQa(item.id)}
                        >
                          Send QA
                        </button>
                        <button
                          type="button"
                          className={THREAD_ACTION_SECONDARY_NEUTRAL}
                          onClick={() => {
                            setReplyTo(null);
                            setReplyNote(createEmptyRichNoteValue());
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className={THREAD_ACTION_SECONDARY}
                        onClick={() => {
                          setReplyTo(item.id);
                          setReplyNote(createEmptyRichNoteValue());
                        }}
                      >
                        Reply (QA)
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              {showTraineeReplySeparate ? (
                <div className="mt-4 border-t border-slate-200/80 pt-4">
                  {replyTo === item.id ? (
                    <div className="flex flex-col gap-2">
                      {latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested" ? (
                        <p className="text-xs text-slate-600">
                          The reviewer asked for changes. Your message is added to this case and sent as a new version
                          for staff.
                        </p>
                      ) : null}
                      <RichNoteEditor
                        value={replyNote}
                        onChange={setReplyNote}
                        placeholder={
                          latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested"
                            ? "Write your response to the reviewer…"
                            : "Reply…"
                        }
                        size="compact"
                        onSubmitShortcut={() => {
                          if (!appUser?.id || !replyNote.body.trim()) return;
                          if (latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested") {
                            void onTraineeReplyThenNewSnapshot(item.id);
                            return;
                          }
                          void (async () => {
                            setActionError(null);
                            setActionOk(null);
                            try {
                              await addUserReply(replyNote, item.id, appUser.id);
                              setReplyNote(createEmptyRichNoteValue());
                              setReplyTo(null);
                              setActionOk("Reply sent.");
                            } catch (e) {
                              setActionError(getErrorMessage(e, "Failed to send reply"));
                            }
                          })();
                        }}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className={THREAD_ACTION_PRIMARY}
                          disabled={
                            !replyNote.body.trim() ||
                            (latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested" &&
                              replyResubmittingRootId === item.id)
                          }
                          onClick={async () => {
                            if (!appUser?.id || !replyNote.body.trim()) return;
                            if (latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested") {
                              await onTraineeReplyThenNewSnapshot(item.id);
                              return;
                            }
                            setActionError(null);
                            setActionOk(null);
                            try {
                              await addUserReply(replyNote, item.id, appUser.id);
                              setReplyNote(createEmptyRichNoteValue());
                              setReplyTo(null);
                              setActionOk("Reply sent.");
                            } catch (e) {
                              setActionError(getErrorMessage(e, "Failed to send reply"));
                            }
                          }}
                        >
                          {latestSubmissionByRootId.get(item.id)?.review_state === "changes_requested"
                            ? replyResubmittingRootId === item.id
                              ? "Submitting…"
                              : "Submit for review"
                            : "Send reply"}
                        </button>
                        <button
                          type="button"
                          className={THREAD_ACTION_SECONDARY_NEUTRAL}
                          onClick={() => {
                            setReplyTo(null);
                            setReplyNote(createEmptyRichNoteValue());
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className={THREAD_ACTION_SECONDARY}
                        onClick={() => {
                          setReplyTo(item.id);
                          setReplyNote(createEmptyRichNoteValue());
                        }}
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
