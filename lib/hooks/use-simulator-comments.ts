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

type UseSimulatorCommentsArgs = {
  userId?: string | null;
  alertId?: string | null;
  viewerAppUserId?: string | null;
  viewerRole?: "admin" | "user" | null;
  adminThreadRootId?: string | null;
};

export function useSimulatorComments({
  userId = null,
  alertId = null,
  viewerAppUserId = null,
  viewerRole = null,
  adminThreadRootId = null,
}: UseSimulatorCommentsArgs) {
  const [comments, setComments] = useState<SimulatorCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const hasTarget = Boolean(userId || alertId);
    if (!hasTarget) {
      setComments([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    setLoading(true);
    setError(null);

    const applyTarget = (query: any) => {
      let next = query;
      if (userId) next = next.eq("user_id", userId);
      if (alertId) next = next.eq("alert_id", alertId);
      return next;
    };

    if (viewerRole === "admin") {
      const privateQueryBase = supabase
        .from("admin_private_notes")
        .select("*")
        .eq("author_app_user_id", viewerAppUserId)
        .eq("author_role", "admin")
        .order("created_at", { ascending: false });
      const privateQuery = applyTarget(privateQueryBase);

      if (!adminThreadRootId) {
        const { data: privateRows, error: privateErr } = await privateQuery;
        if (privateErr) {
          setError(privateErr.message);
          setComments([]);
          setLoading(false);
          return;
        }
        const privateNotes = ((privateRows as AdminPrivateNoteRow[]) ?? [])
          .filter((n) => !n.is_deleted)
          .map(
            (n): SimulatorCommentRow => ({
              id: n.id,
              user_id: n.user_id,
              alert_id: n.alert_id,
              author_app_user_id: n.author_app_user_id,
              author_role: "admin",
              comment_type: "admin_private",
              parent_comment_id: null,
              body: n.body,
              created_at: n.created_at,
            })
          );
        setComments(privateNotes);
        setLoading(false);
        return;
      }

      const rootQuery = applyTarget(
        supabase
          .from("simulator_comments")
          .select("*")
          .eq("id", adminThreadRootId)
          .eq("comment_type", "user_comment")
          .is("parent_comment_id", null)
          .limit(1)
      );
      const repliesQuery = applyTarget(
        supabase
          .from("simulator_comments")
          .select("*")
          .neq("comment_type", "admin_private")
          .not("parent_comment_id", "is", null)
          .eq("parent_comment_id", adminThreadRootId)
          .order("created_at", { ascending: false })
      );

      const [
        { data: rootRows, error: rootErr },
        { data: repliesRows, error: repliesErr },
        { data: privateRows, error: privateErr },
      ] = await Promise.all([
        rootQuery,
        repliesQuery,
        privateQuery,
      ]);
      if (rootErr) {
        setError(rootErr.message);
        setComments([]);
        setLoading(false);
        return;
      }
      if (repliesErr) {
        setError(repliesErr.message);
        setComments([]);
        setLoading(false);
        return;
      }
      if (privateErr) {
        setError(privateErr.message);
        setComments([]);
        setLoading(false);
        return;
      }

      const root = ((rootRows as SimulatorCommentRow[]) ?? [])[0] ?? null;
      if (!root) {
        const privateNotes = ((privateRows as AdminPrivateNoteRow[]) ?? [])
          .filter((n) => !n.is_deleted)
          .map(
            (n): SimulatorCommentRow => ({
              id: n.id,
              user_id: n.user_id,
              alert_id: n.alert_id,
              author_app_user_id: n.author_app_user_id,
              author_role: "admin",
              comment_type: "admin_private",
              parent_comment_id: null,
              body: n.body,
              created_at: n.created_at,
            })
          );
        setComments(privateNotes);
        setLoading(false);
        return;
      }

      const replies = (repliesRows as SimulatorCommentRow[]) ?? [];
      const privateNotes = ((privateRows as AdminPrivateNoteRow[]) ?? [])
        .filter((n) => !n.is_deleted)
        .map(
          (n): SimulatorCommentRow => ({
            id: n.id,
            user_id: n.user_id,
            alert_id: n.alert_id,
            author_app_user_id: n.author_app_user_id,
            author_role: "admin",
            comment_type: "admin_private",
            parent_comment_id: null,
            body: n.body,
            created_at: n.created_at,
          })
        );
      setComments([root, ...replies, ...privateNotes]);
      setLoading(false);
      return;
    }

    if (!viewerAppUserId) {
      setComments([]);
      setLoading(false);
      return;
    }

    const ownTopLevelQuery = applyTarget(
      supabase
        .from("simulator_comments")
        .select("*")
        .eq("author_app_user_id", viewerAppUserId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: true })
    );
    const { data: ownTopLevel, error: ownErr } = await ownTopLevelQuery;
    if (ownErr) {
      setError(ownErr.message);
      setComments([]);
      setLoading(false);
      return;
    }

    const ownRoots = (ownTopLevel as SimulatorCommentRow[]) ?? [];
    const ownRootIds = ownRoots.map((c) => c.id);
    if (ownRootIds.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const adminRepliesQuery = applyTarget(
      supabase
        .from("simulator_comments")
        .select("*")
          .eq("author_role", "admin")
        .in("parent_comment_id", ownRootIds)
        .order("created_at", { ascending: true })
    );
    const ownRepliesQuery = applyTarget(
      supabase
        .from("simulator_comments")
        .select("*")
        .eq("author_app_user_id", viewerAppUserId)
        .not("parent_comment_id", "is", null)
        .in("parent_comment_id", ownRootIds)
        .order("created_at", { ascending: true })
    );
    const [{ data: adminReplies, error: repliesErr }, { data: ownReplies, error: ownRepliesErr }] =
      await Promise.all([adminRepliesQuery, ownRepliesQuery]);
    if (repliesErr) {
      setError(repliesErr.message);
      setComments([]);
      setLoading(false);
      return;
    }
    if (ownRepliesErr) {
      setError(ownRepliesErr.message);
      setComments([]);
      setLoading(false);
      return;
    }

    const visible = [
      ...ownRoots,
      ...(((adminReplies as SimulatorCommentRow[]) ?? [])),
      ...(((ownReplies as SimulatorCommentRow[]) ?? [])),
    ].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    setComments(visible);
    setLoading(false);
  }, [userId, alertId, viewerAppUserId, viewerRole, adminThreadRootId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addUserComment = useCallback(
    async (body: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      const { error: insErr } = await supabase.from("simulator_comments").insert({
        user_id: userId,
        alert_id: alertId,
        author_app_user_id: authorAppUserId,
        author_role: "user",
        comment_type: "user_comment",
        parent_comment_id: null,
        body: body.trim(),
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [userId, alertId, refresh]
  );

  const addUserReply = useCallback(
    async (body: string, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      const { error: insErr } = await supabase.from("simulator_comments").insert({
        user_id: userId,
        alert_id: alertId,
        author_app_user_id: authorAppUserId,
        author_role: "user",
        comment_type: "user_comment",
        parent_comment_id: parentCommentId,
        body: body.trim(),
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [userId, alertId, refresh]
  );

  const addAdminQaReply = useCallback(
    async (body: string, parentCommentId: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      const { error: insErr } = await supabase.from("simulator_comments").insert({
        user_id: userId,
        alert_id: alertId,
        author_app_user_id: authorAppUserId,
        author_role: "admin",
        comment_type: "admin_qa",
        parent_comment_id: parentCommentId,
        body: body.trim(),
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [userId, alertId, refresh]
  );

  const addAdminPrivateComment = useCallback(
    async (body: string, authorAppUserId: string) => {
      const supabase = createClient();
      if (!body.trim()) return;
      const { error: insErr } = await supabase.from("admin_private_notes").insert({
        user_id: userId,
        alert_id: alertId,
        author_app_user_id: authorAppUserId,
        author_role: "admin",
        parent_note_id: null,
        body: body.trim(),
        is_edited: false,
        is_deleted: false,
      });
      if (insErr) throw insErr;
      await refresh();
    },
    [userId, alertId, refresh]
  );

  return {
    comments,
    loading,
    error,
    refresh,
    addUserComment,
    addUserReply,
    addAdminPrivateComment,
    addAdminQaReply,
  };
}
