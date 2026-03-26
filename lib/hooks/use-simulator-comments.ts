"use client";

import { createClient } from "@/lib/supabase";
import type { SimulatorCommentRow } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

type AdminPrivateNoteRow = {
  id: string;
  user_id: string | null;
  alert_id: string | null;
  author_app_user_id: string;
  author_role: "admin" | "user";
  parent_note_id: string | null;
  body: string;
  is_edited?: boolean | null;
  is_deleted?: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

export type UseSimulatorCommentsArgs = {
  /** Review workspace: required for thread-scoped comments */
  threadId?: string | null;
  reviewMode?: boolean;
  /** Admin private notes target (canonical ids, not written to alerts/users tables) */
  privateAlertInternalId?: string | null;
  privateSimulatorUserId?: string | null;
  viewerAppUserId?: string | null;
  viewerRole?: "admin" | "user" | null;
  /** Show admin private scratch notes (admin only, review or admin panel) */
  includeAdminPrivate?: boolean;
};

function mapPrivateNote(n: AdminPrivateNoteRow): SimulatorCommentRow {
  return {
    id: n.id,
    thread_id: null,
    decision_id: null,
    user_id: n.user_id,
    alert_id: n.alert_id,
    author_app_user_id: n.author_app_user_id,
    author_role: "admin",
    comment_type: "admin_private",
    parent_comment_id: null,
    body: n.body,
    created_at: n.created_at,
  };
}

export function useSimulatorComments({
  threadId = null,
  reviewMode = false,
  privateAlertInternalId = null,
  privateSimulatorUserId = null,
  viewerAppUserId = null,
  viewerRole = null,
  includeAdminPrivate = false,
}: UseSimulatorCommentsArgs) {
  const [comments, setComments] = useState<SimulatorCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setError(null);

    const wantPrivate =
      includeAdminPrivate &&
      viewerRole === "admin" &&
      viewerAppUserId &&
      (privateAlertInternalId || privateSimulatorUserId);

    if (!reviewMode || !threadId) {
      if (!wantPrivate) {
        setComments([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let q = supabase
        .from("admin_private_notes")
        .select("id, user_id, alert_id, author_app_user_id, author_role, parent_note_id, body, is_edited, is_deleted, created_at, updated_at")
        .eq("author_app_user_id", viewerAppUserId)
        .eq("author_role", "admin")
        .order("created_at", { ascending: false });
      if (privateSimulatorUserId) q = q.eq("user_id", privateSimulatorUserId).is("alert_id", null);
      else if (privateAlertInternalId) q = q.eq("alert_id", privateAlertInternalId).is("user_id", null);
      const { data: privateRows, error: privateErr } = await q;
      if (privateErr) {
        setError(privateErr.message);
        setComments([]);
        setLoading(false);
        return;
      }
      const privateNotes = ((privateRows as AdminPrivateNoteRow[]) ?? [])
        .filter((n) => !n.is_deleted)
        .map(mapPrivateNote);
      setComments(privateNotes);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: threadRows, error: threadErr } = await supabase
      .from("simulator_comments")
      .select("*")
      .eq("thread_id", threadId)
      .neq("comment_type", "admin_private")
      .order("created_at", { ascending: true });

    if (threadErr) {
      setError(threadErr.message);
      setComments([]);
      setLoading(false);
      return;
    }

    const threadComments = (threadRows as unknown as SimulatorCommentRow[]) ?? [];

    if (!wantPrivate) {
      setComments(threadComments);
      setLoading(false);
      return;
    }

    let pq = supabase
      .from("admin_private_notes")
      .select("id, user_id, alert_id, author_app_user_id, author_role, parent_note_id, body, is_edited, is_deleted, created_at, updated_at")
      .eq("author_app_user_id", viewerAppUserId)
      .eq("author_role", "admin")
      .order("created_at", { ascending: false });
    if (privateSimulatorUserId) pq = pq.eq("user_id", privateSimulatorUserId).is("alert_id", null);
    else if (privateAlertInternalId) pq = pq.eq("alert_id", privateAlertInternalId).is("user_id", null);

    const { data: privateRows, error: privateErr } = await pq;
    if (privateErr) {
      setError(privateErr.message);
      setComments(threadComments);
      setLoading(false);
      return;
    }
    const privateNotes = ((privateRows as AdminPrivateNoteRow[]) ?? [])
      .filter((n) => !n.is_deleted)
      .map(mapPrivateNote);
    setComments([...threadComments, ...privateNotes]);
    setLoading(false);
  }, [
    threadId,
    reviewMode,
    privateAlertInternalId,
    privateSimulatorUserId,
    viewerAppUserId,
    viewerRole,
    includeAdminPrivate,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addUserComment = useCallback(
    async (body: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      if (!threadId) {
        throw new Error("No review thread yet. Wait a moment or refresh the page.");
      }
      const { error: insErr } = await supabase.from("simulator_comments").insert({
        thread_id: threadId,
        author_app_user_id: authorAppUserId,
        author_role: "user",
        comment_type: "user_comment",
        parent_comment_id: null,
        body: body.trim(),
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [threadId, refresh]
  );

  const addUserReply = useCallback(
    async (body: string, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      if (!threadId) {
        throw new Error("No review thread yet. Wait a moment or refresh the page.");
      }
      const { error: insErr } = await supabase.from("simulator_comments").insert({
        thread_id: threadId,
        author_app_user_id: authorAppUserId,
        author_role: "user",
        comment_type: "user_comment",
        parent_comment_id: parentCommentId,
        body: body.trim(),
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [threadId, refresh]
  );

  const addAdminQaReply = useCallback(
    async (body: string, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim() || !threadId) return;
      const { error: insErr } = await supabase.from("simulator_comments").insert({
        thread_id: threadId,
        author_app_user_id: authorAppUserId,
        author_role: "admin",
        comment_type: "admin_qa",
        parent_comment_id: parentCommentId,
        body: body.trim(),
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [threadId, refresh]
  );

  const updateUserRootComment = useCallback(
    async (commentId: string, body: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim() || !threadId) return;
      const { error: uErr } = await supabase
        .from("simulator_comments")
        .update({
          body: body.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .eq("author_app_user_id", authorAppUserId)
        .eq("comment_type", "user_comment")
        .is("parent_comment_id", null)
        .eq("thread_id", threadId);
      if (uErr) throw uErr;
      await refresh();
    },
    [threadId, refresh]
  );

  const addAdminPrivateComment = useCallback(
    async (body: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      if (!privateSimulatorUserId && !privateAlertInternalId) return;
      const row: Record<string, unknown> = {
        author_app_user_id: authorAppUserId,
        author_role: "admin",
        parent_note_id: null,
        body: body.trim(),
        is_edited: false,
        is_deleted: false,
      };
      if (privateSimulatorUserId) {
        row.user_id = privateSimulatorUserId;
        row.alert_id = null;
      } else {
        row.alert_id = privateAlertInternalId;
        row.user_id = null;
      }
      const { error: insErr } = await supabase.from("admin_private_notes").insert(row);
      if (insErr) throw insErr;
      await refresh();
    },
    [privateAlertInternalId, privateSimulatorUserId, refresh]
  );

  return {
    comments,
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
