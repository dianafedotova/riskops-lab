"use client";

import { canAccessStaffFeatures, type AppUserRole } from "@/lib/app-user-role";
import {
  addPrivateNote,
  addStaffQaReply,
  addTraineeDiscussionComment,
  addTraineeDiscussionReply,
  deletePrivateNote,
  loadCommentPanelData,
  updatePrivateNote,
  updateTraineeRootDiscussionComment,
} from "@/lib/services/comments";
import type { RichNoteEditorValue } from "@/lib/rich-note";
import { createClient } from "@/lib/supabase";
import type { SimulatorCommentRow } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

/** Stable defaults — inline `= []` / `= {}` in parameters are new references each render and would retrigger effects. */
const EMPTY_DISCUSSION: SimulatorCommentRow[] = [];
const EMPTY_PRIVATE_NOTES: SimulatorCommentRow[] = [];
const EMPTY_AUTHOR_LABELS: Record<string, string> = {};

export type UseSimulatorCommentsArgs = {
  threadId?: string | null;
  reviewMode?: boolean;
  privateAlertInternalId?: string | null;
  privateSimulatorUserId?: string | null;
  viewerAppUserId?: string | null;
  viewerRole?: AppUserRole | null;
  includeAdminPrivate?: boolean;
  hydrateFromInitialData?: boolean;
  initialDiscussionComments?: SimulatorCommentRow[];
  initialPrivateNotes?: SimulatorCommentRow[];
  initialAuthorLabels?: Record<string, string>;
};

export function useSimulatorComments({
  threadId = null,
  reviewMode = false,
  privateAlertInternalId = null,
  privateSimulatorUserId = null,
  viewerAppUserId = null,
  viewerRole = null,
  includeAdminPrivate = false,
  hydrateFromInitialData = false,
  initialDiscussionComments = EMPTY_DISCUSSION,
  initialPrivateNotes = EMPTY_PRIVATE_NOTES,
  initialAuthorLabels = EMPTY_AUTHOR_LABELS,
}: UseSimulatorCommentsArgs) {
  const [discussionComments, setDiscussionComments] = useState<SimulatorCommentRow[]>(
    hydrateFromInitialData ? initialDiscussionComments : []
  );
  const [privateNotes, setPrivateNotes] = useState<SimulatorCommentRow[]>(
    hydrateFromInitialData ? initialPrivateNotes : []
  );
  const [authorLabels, setAuthorLabels] = useState<Record<string, string>>(
    hydrateFromInitialData ? initialAuthorLabels : {}
  );
  const [loading, setLoading] = useState(!hydrateFromInitialData);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (hydrateFromInitialData && reloadTick === 0) {
        setDiscussionComments(initialDiscussionComments);
        setPrivateNotes(initialPrivateNotes);
        setAuthorLabels(initialAuthorLabels);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      setError(null);
      setLoading(true);

      const { data, error: loadError } = await loadCommentPanelData(supabase, {
        threadId,
        reviewMode,
        viewer: {
          appUserId: viewerAppUserId,
          role: viewerRole,
        },
        includePrivateNotes: includeAdminPrivate,
        target: {
          alertInternalId: privateAlertInternalId,
          simulatorUserId: privateSimulatorUserId,
        },
      });
      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
      }

      setDiscussionComments(data.discussionComments);
      setPrivateNotes(data.privateNotes);
      setAuthorLabels(data.authorLabels);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    threadId,
    reviewMode,
    viewerAppUserId,
    viewerRole,
    includeAdminPrivate,
    hydrateFromInitialData,
    initialDiscussionComments,
    initialPrivateNotes,
    initialAuthorLabels,
    privateAlertInternalId,
    privateSimulatorUserId,
    reloadTick,
  ]);

  /** Staff viewers: trainee comments appear in another session — poll + tab focus as fallback if Realtime is off. */
  useEffect(() => {
    if (!threadId || !reviewMode) return;
    if (!canAccessStaffFeatures(viewerRole)) return;

    const bump = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      setReloadTick((t) => t + 1);
    };

    const intervalId = window.setInterval(bump, 12_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [threadId, reviewMode, viewerRole]);

  /** Push updates when simulator_comments rows change for this thread (requires publication supabase_realtime). */
  useEffect(() => {
    if (!threadId || !reviewMode) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`simulator_comments:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "simulator_comments",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          setReloadTick((t) => t + 1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, reviewMode]);

  const refresh = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const addUserComment = useCallback(
    async (note: RichNoteEditorValue, authorAppUserId: string, overrideThreadId?: string | null) => {
      const supabase = createClient();
      const commentId = await addTraineeDiscussionComment(supabase, {
        threadId: overrideThreadId ?? threadId,
        authorAppUserId,
        role: viewerRole,
        body: note.body,
        bodyJson: note.bodyJson,
        bodyFormat: note.bodyFormat,
      });
      refresh();
      return commentId;
    },
    [threadId, viewerRole, refresh]
  );

  const addUserReply = useCallback(
    async (note: RichNoteEditorValue, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      await addTraineeDiscussionReply(supabase, {
        threadId,
        parentCommentId,
        authorAppUserId,
        role: viewerRole,
        body: note.body,
        bodyJson: note.bodyJson,
        bodyFormat: note.bodyFormat,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const addAdminQaReply = useCallback(
    async (note: RichNoteEditorValue, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      await addStaffQaReply(supabase, {
        threadId,
        parentCommentId,
        authorAppUserId,
        role: viewerRole,
        body: note.body,
        bodyJson: note.bodyJson,
        bodyFormat: note.bodyFormat,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const updateUserRootComment = useCallback(
    async (commentId: string, note: RichNoteEditorValue, authorAppUserId: string) => {
      const supabase = createClient();
      await updateTraineeRootDiscussionComment(supabase, {
        threadId,
        commentId,
        authorAppUserId,
        role: viewerRole,
        body: note.body,
        bodyJson: note.bodyJson,
        bodyFormat: note.bodyFormat,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const addAdminPrivateComment = useCallback(
    async (note: RichNoteEditorValue, authorAppUserId: string) => {
      const supabase = createClient();
      await addPrivateNote(supabase, {
        authorAppUserId,
        role: viewerRole,
        body: note.body,
        bodyJson: note.bodyJson,
        bodyFormat: note.bodyFormat,
        target: {
          alertInternalId: privateAlertInternalId,
          simulatorUserId: privateSimulatorUserId,
        },
      });
      refresh();
    },
    [viewerRole, privateAlertInternalId, privateSimulatorUserId, refresh]
  );

  const updateAdminPrivateComment = useCallback(
    async (noteId: string, note: RichNoteEditorValue, authorAppUserId: string) => {
      const supabase = createClient();
      await updatePrivateNote(supabase, {
        noteId,
        authorAppUserId,
        role: viewerRole,
        body: note.body,
        bodyJson: note.bodyJson,
        bodyFormat: note.bodyFormat,
      });
      refresh();
    },
    [refresh, viewerRole]
  );

  const deleteAdminPrivateComment = useCallback(
    async (noteId: string, authorAppUserId: string) => {
      const supabase = createClient();
      await deletePrivateNote(supabase, {
        noteId,
        authorAppUserId,
        role: viewerRole,
      });
      refresh();
    },
    [refresh, viewerRole]
  );

  return {
    discussionComments,
    privateNotes,
    authorLabels,
    loading,
    error,
    refresh,
    addUserComment,
    addUserReply,
    updateUserRootComment,
    addAdminPrivateComment,
    updateAdminPrivateComment,
    deleteAdminPrivateComment,
    addAdminQaReply,
  };
}
