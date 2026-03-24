"use client";

import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useSimulatorComments } from "@/lib/hooks/use-simulator-comments";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  userId?: string | null;
  alertId?: string | null;
  showTitle?: boolean;
  withTopBorder?: boolean;
  emptyMessage?: string;
  adminModeOverride?: "reply" | "private";
  predefinedNotes?: {
    id: string;
    note_text: string;
    created_at: string;
    created_by: string | null;
  }[];
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function SimulatorCommentsPanel({
  userId = null,
  alertId = null,
  showTitle = true,
  withTopBorder = true,
  emptyMessage = "No comments yet.",
  adminModeOverride,
  predefinedNotes = [],
}: Props) {
  const { appUser, loading: sessionLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const adminThreadRootId = searchParams.get("thread");
  const [adminMode, setAdminMode] = useState<"reply" | "private">(adminModeOverride ?? "reply");
  const { comments, loading, error, addUserComment, addUserReply, addAdminPrivateComment, addAdminQaReply } =
    useSimulatorComments({
      userId,
      alertId,
      viewerAppUserId: appUser?.id ?? null,
      viewerRole: appUser?.role ?? null,
      adminThreadRootId,
    });
  const [authorLabels, setAuthorLabels] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (!userId && !alertId) return null;

  const onAddTrainee = async () => {
    if (!body.trim() || !appUser?.id) return;
    setActionError(null);
    try {
      if (appUser.role === "admin") {
        if (adminMode === "private") {
          await addAdminPrivateComment(body, appUser.id);
        } else {
          if (!activeAdminThreadRootId) {
            throw new Error("Open a thread from Admin panel to add an admin reply.");
          }
          await addAdminQaReply(body, activeAdminThreadRootId, appUser.id);
        }
      } else {
        await addUserComment(body, appUser.id);
      }
      setBody("");
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to add comment"));
    }
  };

  const onSendQa = async (parentId: string) => {
    if (!replyBody.trim() || !appUser?.id) return;
    setActionError(null);
    try {
      await addAdminQaReply(replyBody, parentId, appUser.id);
      setReplyBody("");
      setReplyTo(null);
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to send QA reply"));
    }
  };

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
    return comments
      .filter((c) => c.parent_comment_id == null && c.comment_type === "user_comment")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments]);

  const adminPrivateNotes = useMemo(() => {
    if (appUser?.role !== "admin") return [];
    return comments
      .filter((c) => c.comment_type === "admin_private" && c.author_app_user_id === appUser.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments, appUser?.id, appUser?.role]);

  const activeAdminThreadRootId = useMemo(() => {
    if (appUser?.role !== "admin") return null;
    return topLevelComments[0]?.id ?? null;
  }, [appUser?.role, topLevelComments]);

  const repliesByParent = useMemo(() => {
    const map: Record<string, typeof comments> = {};
    for (const c of comments) {
      if (!c.parent_comment_id) continue;
      if (!map[c.parent_comment_id]) map[c.parent_comment_id] = [];
      map[c.parent_comment_id].push(c);
    }
    for (const parentId of Object.keys(map)) {
      map[parentId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [comments]);

  const hasVisibleItems =
    appUser?.role === "admin"
      ? adminMode === "private"
        ? adminPrivateNotes.length > 0
        : predefinedItems.length > 0 || topLevelComments.length > 0
      : predefinedItems.length > 0 || topLevelComments.length > 0;
  const hasUserThreads = topLevelComments.length > 0;
  const showAdminThreadHint =
    appUser?.role === "admin" &&
    adminMode === "reply" &&
    !adminThreadRootId &&
    !hasUserThreads;

  useEffect(() => {
    if (appUser?.role !== "admin") return;
    if (adminModeOverride) {
      setAdminMode(adminModeOverride);
      return;
    }
    if (adminThreadRootId) {
      setAdminMode("reply");
    } else {
      setAdminMode("private");
    }
  }, [appUser?.role, adminThreadRootId, adminModeOverride]);

  useEffect(() => {
    const authorIds = Array.from(new Set(comments.map((c) => c.author_app_user_id).filter(Boolean)));
    if (authorIds.length === 0) {
      setAuthorLabels({});
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      let rows: { id: string; email: string | null; full_name?: string | null }[] = [];
      const withFullName = await supabase
        .from("app_users")
        .select("id, email, full_name")
        .in("id", authorIds);
      if (withFullName.error) {
        const fallback = await supabase
          .from("app_users")
          .select("id, email")
          .in("id", authorIds);
        rows = (fallback.data as { id: string; email: string | null }[]) ?? [];
      } else {
        rows = (withFullName.data as { id: string; email: string | null; full_name?: string | null }[]) ?? [];
      }
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const row of rows) {
        const fullName = (row.full_name ?? "").trim();
        const email = (row.email ?? "").trim();
        map[row.id] = fullName && email ? `${fullName} · ${email}` : (fullName || email || "user");
      }
      setAuthorLabels(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [comments]);

  return (
    <div className={`${withTopBorder ? "mt-6 border-t border-slate-200 pt-4" : "mt-3"} space-y-3`}>
      {showTitle ? <h3 className="text-sm font-semibold text-slate-800">Comments</h3> : null}
      {sessionLoading ? (
        <p className="text-xs text-slate-500">Loading session…</p>
      ) : !appUser ? (
        <p className="text-xs text-slate-500">Sign in to add or view comments.</p>
      ) : (
        <div className="space-y-2">
          {appUser.role === "admin" && !adminModeOverride ? (
            <div className="flex gap-2">
              {hasUserThreads ? (
                <button
                  type="button"
                  className={`rounded px-2.5 py-1 text-xs ${
                    adminMode === "reply"
                      ? "bg-[#264B5A] text-white"
                      : "border border-slate-300 text-slate-700"
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
                    ? "bg-[#264B5A] text-white"
                    : "border border-slate-300 text-slate-700"
                }`}
                onClick={() => setAdminMode("private")}
              >
                Private note (admin only)
              </button>
            </div>
          ) : null}
          {appUser.role !== "admin" || adminMode === "private" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  appUser.role === "admin"
                    ? "Add private admin note..."
                    : "Add note..."
                }
                className="min-h-10 w-full flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
              />
              <button
                type="button"
                onClick={onAddTrainee}
                className="rounded bg-slate-700 px-3 py-2 text-sm text-white"
              >
                Add
              </button>
            </div>
          ) : null}
        </div>
      )}

      {actionError ? <p className="text-xs text-rose-600">{actionError}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-xs text-slate-500">Loading comments…</p>
      ) : !hasVisibleItems ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
          {appUser?.role === "admin" && !adminThreadRootId && adminMode === "reply"
            ? "Open a comment thread from Admin panel to view notes for a specific user."
            : emptyMessage}
        </div>
      ) : (
        <ul className="space-y-2">
          {showAdminThreadHint ? (
            <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
              Open a comment thread from Admin panel to view notes for a specific user.
            </li>
          ) : null}
          {(appUser?.role !== "admin" || adminMode === "reply") &&
            predefinedItems.map((item) => (
            <li
              key={item.key}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
            >
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>{item.created_by ?? "—"}</span>
                <span className="tabular-nums">{formatDateTime(item.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-900">{item.text}</p>
            </li>
          ))}
          {appUser?.role === "admin" && adminMode === "private"
            ? adminPrivateNotes.map((note) => (
            <li
              key={note.id}
              className="rounded-xl border border-amber-300 bg-amber-100/80 p-3 text-sm text-slate-800"
            >
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>admin (private)</span>
                <span className="tabular-nums">{formatDateTime(note.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-900">{note.body}</p>
            </li>
          ))
            : null}
          {(appUser?.role !== "admin" || adminMode === "reply") &&
            topLevelComments.map((item) => (
            <li key={item.id} className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-sm text-slate-800">
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>
                  {item.author_role === "admin"
                    ? "admin"
                    : (authorLabels[item.author_app_user_id] ?? "user")}
                </span>
                <span className="tabular-nums">{formatDateTime(item.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-900">{item.body}</p>
              {appUser?.role === "admin" && item.comment_type === "user_comment" ? (
                <div className="mt-2">
                  {replyTo === item.id ? (
                    <div className="flex flex-col gap-1">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-800"
                        placeholder="QA reply…"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                          onClick={() => onSendQa(item.id)}
                        >
                          Send QA
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                          onClick={() => {
                            setReplyTo(null);
                            setReplyBody("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-[#264B5A] underline"
                      onClick={() => setReplyTo(item.id)}
                    >
                      Reply (QA)
                    </button>
                  )}
                </div>
              ) : null}
              {appUser?.role === "user" && item.comment_type === "user_comment" ? (
                <div className="mt-2">
                  {replyTo === item.id ? (
                    <div className="flex flex-col gap-1">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-800"
                        placeholder="Reply..."
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                          onClick={async () => {
                            if (!appUser?.id || !replyBody.trim()) return;
                            setActionError(null);
                            try {
                              await addUserReply(replyBody, item.id, appUser.id);
                              setReplyBody("");
                              setReplyTo(null);
                            } catch (e) {
                              setActionError(getErrorMessage(e, "Failed to send reply"));
                            }
                          }}
                        >
                          Send reply
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                          onClick={() => {
                            setReplyTo(null);
                            setReplyBody("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-[#264B5A] underline"
                      onClick={() => setReplyTo(item.id)}
                    >
                      Reply
                    </button>
                  )}
                </div>
              ) : null}
              {(repliesByParent[item.id] ?? []).map((reply) => (
                <div
                  key={reply.id}
                  className="mt-2 ml-4 rounded-lg border border-violet-200 bg-violet-50/70 p-2"
                >
                  <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                    <span>
                      {reply.author_role === "admin"
                        ? "admin"
                        : (authorLabels[reply.author_app_user_id] ?? "user")}
                    </span>
                    <span className="tabular-nums">{formatDateTime(reply.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-900">{reply.body}</p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
