"use client";

import type { AppUserRole } from "@/lib/app-user-role";
import {
  addPrivateNote,
  addStaffQaReply,
  addTraineeDiscussionComment,
  addTraineeDiscussionReply,
  loadCommentPanelData,
  updateTraineeRootDiscussionComment,
} from "@/lib/services/comments";
import { createClient } from "@/lib/supabase";
import type { SimulatorCommentRow } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export type UseSimulatorCommentsArgs = {
  threadId?: string | null;
  reviewMode?: boolean;
  privateAlertInternalId?: string | null;
  privateSimulatorUserId?: string | null;
  viewerAppUserId?: string | null;
  viewerRole?: AppUserRole | null;
  includeAdminPrivate?: boolean;
};

export function useSimulatorComments({
  threadId = null,
  reviewMode = false,
  privateAlertInternalId = null,
  privateSimulatorUserId = null,
  viewerAppUserId = null,
  viewerRole = null,
  includeAdminPrivate = false,
}: UseSimulatorCommentsArgs) {
  const [discussionComments, setDiscussionComments] = useState<SimulatorCommentRow[]>([]);
  const [privateNotes, setPrivateNotes] = useState<SimulatorCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
    privateAlertInternalId,
    privateSimulatorUserId,
    reloadTick,
  ]);

  const refresh = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const addUserComment = useCallback(
    async (body: string, authorAppUserId: string) => {
      const supabase = createClient();
      await addTraineeDiscussionComment(supabase, {
        threadId,
        authorAppUserId,
        role: viewerRole,
        body,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const addUserReply = useCallback(
    async (body: string, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      await addTraineeDiscussionReply(supabase, {
        threadId,
        parentCommentId,
        authorAppUserId,
        role: viewerRole,
        body,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const addAdminQaReply = useCallback(
    async (body: string, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      await addStaffQaReply(supabase, {
        threadId,
        parentCommentId,
        authorAppUserId,
        role: viewerRole,
        body,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const updateUserRootComment = useCallback(
    async (commentId: string, body: string, authorAppUserId: string) => {
      const supabase = createClient();
      await updateTraineeRootDiscussionComment(supabase, {
        threadId,
        commentId,
        authorAppUserId,
        role: viewerRole,
        body,
      });
      refresh();
    },
    [threadId, viewerRole, refresh]
  );

  const addAdminPrivateComment = useCallback(
    async (body: string, authorAppUserId: string) => {
      const supabase = createClient();
      await addPrivateNote(supabase, {
        authorAppUserId,
        role: viewerRole,
        body,
        target: {
          alertInternalId: privateAlertInternalId,
          simulatorUserId: privateSimulatorUserId,
        },
      });
      refresh();
    },
    [viewerRole, privateAlertInternalId, privateSimulatorUserId, refresh]
  );

  return {
    discussionComments,
    privateNotes,
    loading,
    error,
    refresh,
    addUserComment,
    addUserReply,
    updateUserRootComment,
    addAdminPrivateComment,
    addAdminQaReply,
  };
}
