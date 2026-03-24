"use client";

import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createClient } from "@/lib/supabase";
import type { SimulatorCommentRow, UserRow } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TargetKind = "alert" | "user_profile";

type CommentThread = {
  root: SimulatorCommentRow;
  replies: SimulatorCommentRow[];
  targetKind: TargetKind;
  targetLabel: string;
  targetHref: string;
};

type AdminAlertRow = {
  id: string;
  internal_id: string | null;
  alert_type?: string | null;
  type?: string | null;
  severity: string | null;
  user_id: string | null;
};

export default function AdminHomePage() {
  const { appUser, loading: userLoading } = useCurrentUser();
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const isAdmin = appUser?.role === "admin";

  const refreshThreads = async () => {
    if (!isAdmin) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);
    setError(null);

    const { data: rawComments, error: commentsErr } = await supabase
      .from("simulator_comments")
      .select("*")
      .order("created_at", { ascending: false });

    if (commentsErr) {
      setError(commentsErr.message);
      setThreads([]);
      setLoading(false);
      return;
    }

    const comments = (rawComments as SimulatorCommentRow[]) ?? [];
    const userRoots = comments.filter((c) => c.comment_type === "user_comment" && c.parent_comment_id == null);

    const userIds = Array.from(new Set(userRoots.map((c) => c.user_id).filter(Boolean))) as string[];
    const alertInternalIds = Array.from(new Set(userRoots.map((c) => c.alert_id).filter(Boolean))) as string[];

    const [usersRes, alertsResPrimary] = await Promise.all([
      userIds.length
        ? supabase.from("users").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      alertInternalIds.length
        ? supabase
            .from("alerts")
            .select("id, internal_id, alert_type, severity, user_id")
            .in("internal_id", alertInternalIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (usersRes.error) {
      setError(usersRes.error.message);
      setThreads([]);
      setLoading(false);
      return;
    }
    let alertsData: AdminAlertRow[] = [];
    if (alertsResPrimary.error && alertInternalIds.length) {
      const alertsResFallback = await supabase
        .from("alerts")
        .select("id, internal_id, type, severity, user_id")
        .in("internal_id", alertInternalIds);
      if (alertsResFallback.error) {
        setError(alertsResFallback.error.message);
        setThreads([]);
        setLoading(false);
        return;
      }
      alertsData = (alertsResFallback.data as AdminAlertRow[]) ?? [];
    } else {
      alertsData = (alertsResPrimary.data as AdminAlertRow[]) ?? [];
    }

    const usersMap = new Map<string, Pick<UserRow, "id" | "full_name" | "email">>();
    for (const u of (usersRes.data as Pick<UserRow, "id" | "full_name" | "email">[]) ?? []) {
      usersMap.set(u.id, u);
    }

    const alertsMap = new Map<string, AdminAlertRow>();
    for (const a of alertsData) {
      if (a.internal_id) alertsMap.set(a.internal_id, a);
    }

    const repliesByParent = new Map<string, SimulatorCommentRow[]>();
    for (const c of comments) {
      if (c.comment_type !== "admin_qa" || !c.parent_comment_id) continue;
      const list = repliesByParent.get(c.parent_comment_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_comment_id, list);
    }

    const built = userRoots.map((root) => {
      const replies = (repliesByParent.get(root.id) ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      if (root.alert_id) {
        const alert = alertsMap.get(root.alert_id);
        const alertPublicId = alert?.id ?? "unknown";
        const type = (alert?.alert_type ?? alert?.type ?? "alert").toUpperCase();
        const severity = alert?.severity ? ` · ${alert.severity}` : "";
        return {
          root,
          replies,
          targetKind: "alert" as const,
          targetLabel: `Alert ${alertPublicId} · ${type}${severity}`,
          targetHref: `/alerts/${alertPublicId}`,
        };
      }

      const profileUserId = root.user_id ?? "unknown";
      const user = usersMap.get(profileUserId);
      const userLabelBase = user?.full_name?.trim() || user?.email?.trim() || profileUserId;
      return {
        root,
        replies,
        targetKind: "user_profile" as const,
        targetLabel: `User profile · ${userLabelBase}`,
        targetHref: `/users/${profileUserId}`,
      };
    });

    built.sort((a, b) => new Date(b.root.created_at).getTime() - new Date(a.root.created_at).getTime());
    setThreads(built);
    setLoading(false);
  };

  useEffect(() => {
    void refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const onSendReply = async (thread: CommentThread) => {
    if (!appUser?.id || !replyBody.trim()) return;
    const supabase = createClient();
    setActionError(null);
    setActionOk(null);

    const { error: insErr } = await supabase.from("simulator_comments").insert({
      user_id: thread.root.user_id,
      alert_id: thread.root.alert_id,
      author_app_user_id: appUser.id,
      author_role: "admin",
      comment_type: "admin_qa",
      parent_comment_id: thread.root.id,
      body: replyBody.trim(),
    });

    if (insErr) {
      setActionError(insErr.message);
      return;
    }

    setReplyBody("");
    setReplyTo(null);
    setActionOk("Reply sent.");
    await refreshThreads();
  };

  const emptyState = useMemo(
    () => (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
        No user comments yet.
      </div>
    ),
    []
  );

  if (userLoading) {
    return <section className="space-y-3 text-slate-900"><p className="text-sm text-slate-600">Loading admin...</p></section>;
  }

  if (!isAdmin) {
    return (
      <section className="space-y-3 text-slate-900">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-slate-600">Access restricted to admins only.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-sm text-slate-600">User comment threads from simulator comments.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshThreads()}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
      {actionOk ? <p className="text-sm text-emerald-700">{actionOk}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-600">Loading comments...</p>
      ) : threads.length === 0 ? (
        emptyState
      ) : (
        <ul className="space-y-3">
          {threads.map((thread) => (
            <li key={thread.root.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{thread.targetKind === "alert" ? "Alert comment" : "User profile comment"}</span>
                <span className="tabular-nums">{formatDateTime(thread.root.created_at)}</span>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{thread.targetLabel}</span>
                <Link
                  href={`${thread.targetHref}?thread=${thread.root.id}`}
                  className="text-[#264B5A] underline"
                >
                  Open source page
                </Link>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                <p className="mb-1 text-xs text-slate-500">User comment</p>
                <p className="whitespace-pre-wrap text-sm text-slate-900">{thread.root.body}</p>
              </div>

              {thread.replies.map((reply) => (
                <div key={reply.id} className="mt-2 ml-4 rounded-lg border border-violet-200 bg-violet-50/70 p-3">
                  <div className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                    <span>Admin reply</span>
                    <span className="tabular-nums">{formatDateTime(reply.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-900">{reply.body}</p>
                </div>
              ))}

              <div className="mt-3">
                {replyTo === thread.root.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      placeholder="Write admin reply..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
                        onClick={() => void onSendReply(thread)}
                      >
                        Send reply
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyBody("");
                          setActionError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-sm text-[#264B5A] underline"
                    onClick={() => {
                      setReplyTo(thread.root.id);
                      setReplyBody("");
                      setActionError(null);
                    }}
                  >
                    Reply from admin panel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
