"use client";

import { canAccessStaffFeatures, isTrainee } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useSimulatorComments } from "@/lib/hooks/use-simulator-comments";
import { canCreatePrivateNotes, canReplyAsQA, canViewPrivateNotes, canWriteTraineeDiscussion } from "@/lib/permissions/checks";
import { createClient } from "@/lib/supabase";
import type { SimulatorCommentRow } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const TRAINEE_ROOT_EDIT_MS = 5 * 60 * 1000;

function subtreeHasAdminQa(rootId: string, all: SimulatorCommentRow[]): boolean {
  const byParent = new Map<string, SimulatorCommentRow[]>();
  for (const row of all) {
    if (!row.parent_comment_id) continue;
    const list = byParent.get(row.parent_comment_id) ?? [];
    list.push(row);
    byParent.set(row.parent_comment_id, list);
  }
  const queue = [...(byParent.get(rootId) ?? [])];
  while (queue.length) {
    const row = queue.shift()!;
    if (row.comment_type === "admin_qa") return true;
    for (const ch of byParent.get(row.id) ?? []) queue.push(ch);
  }
  return false;
}

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
  threadId = null,
  reviewMode = false,
  privateAlertInternalId = null,
  privateSimulatorUserId = null,
  title = "Comments",
  showTitle = true,
  withTopBorder = true,
  emptyMessage = "No comments yet.",
  adminModeOverride,
  predefinedNotes = [],
}: Props) {
  const { appUser, loading: sessionLoading } = useCurrentUser();
  const [adminMode, setAdminMode] = useState<"reply" | "private">(adminModeOverride ?? "reply");
  const hasPrivateTarget = Boolean(privateAlertInternalId || privateSimulatorUserId);
  const includeAdminPrivate = canViewPrivateNotes(appUser?.role) && adminMode === "private";
  const {
    discussionComments,
    privateNotes,
    loading,
    error,
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
    });
  const [authorLabels, setAuthorLabels] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingRootId, setEditingRootId] = useState<string | null>(null);
  const [editRootBody, setEditRootBody] = useState("");

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
    return discussionComments
      .filter((c) => c.parent_comment_id == null && c.comment_type === "user_comment")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [discussionComments]);

  const adminPrivateNotes = useMemo(() => {
    return [...privateNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [privateNotes]);

  const activeAdminThreadRootId = useMemo(() => {
    if (!canAccessStaffFeatures(appUser?.role)) return null;
    return topLevelComments[0]?.id ?? null;
  }, [appUser?.role, topLevelComments]);

  const canEditTraineeRoot = useCallback(
    (c: SimulatorCommentRow) => {
      if (!appUser || !isTrainee(appUser.role) || appUser.id !== c.author_app_user_id) return false;
      if (c.comment_type !== "user_comment" || c.parent_comment_id != null) return false;
      if (Date.now() - new Date(c.created_at).getTime() >= TRAINEE_ROOT_EDIT_MS) return false;
      return !subtreeHasAdminQa(c.id, discussionComments);
    },
    [appUser, discussionComments]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, typeof discussionComments> = {};
    for (const c of discussionComments) {
      if (!c.parent_comment_id) continue;
      if (!map[c.parent_comment_id]) map[c.parent_comment_id] = [];
      map[c.parent_comment_id].push(c);
    }
    for (const parentId of Object.keys(map)) {
      map[parentId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [discussionComments]);

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

  useEffect(() => {
    const authorIds = Array.from(
      new Set([...discussionComments, ...privateNotes].map((c) => c.author_app_user_id).filter(Boolean))
    );
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
  }, [discussionComments, privateNotes]);

  const onAddTrainee = useCallback(async () => {
    if (!body.trim() || !appUser?.id) return;
    setActionError(null);
    try {
      if (canViewPrivateNotes(appUser.role)) {
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
  }, [
    activeAdminThreadRootId,
    addAdminPrivateComment,
    addAdminQaReply,
    addUserComment,
    adminMode,
    appUser,
    body,
  ]);

  const onSendQa = useCallback(
    async (parentId: string) => {
      if (!replyBody.trim() || !appUser?.id) return;
      setActionError(null);
      try {
        await addAdminQaReply(replyBody, parentId, appUser.id);
        setReplyBody("");
        setReplyTo(null);
      } catch (e) {
        setActionError(getErrorMessage(e, "Failed to send QA reply"));
      }
    },
    [addAdminQaReply, appUser, replyBody]
  );

  if (!threadId && !(includeAdminPrivate && hasPrivateTarget) && predefinedNotes.length === 0) {
    return null;
  }

  return (
    <div className={`${withTopBorder ? "mt-6 border-t border-slate-200 pt-4" : "mt-3"} space-y-3`}>
      {showTitle ? <h3 className="text-sm font-semibold text-slate-800">{title}</h3> : null}
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
          {canWriteTraineeDiscussion(appUser.role) || adminMode === "private" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  void onAddTrainee();
                }}
                placeholder={
                  canCreatePrivateNotes(appUser.role)
                    ? "Add admin note..."
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
          {canReplyAsQA(appUser?.role) && !threadId && adminMode === "reply"
            ? "Open Internal Notes on the case page to use the training thread."
            : emptyMessage}
        </div>
      ) : (
        <ul className="space-y-2">
          {showAdminThreadHint ? (
            <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
              Open a comment thread from Admin panel to view notes for a specific user.
            </li>
          ) : null}
          {(!canViewPrivateNotes(appUser?.role) || adminMode === "reply") &&
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
          {canViewPrivateNotes(appUser?.role) && adminMode === "private"
            ? adminPrivateNotes.map((note) => (
            <li
              key={note.id}
              className="rounded-xl border border-amber-300 bg-amber-100/80 p-3 text-sm text-slate-800"
            >
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>Admin internal</span>
                <span className="tabular-nums">{formatDateTime(note.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-900">{note.body}</p>
            </li>
          ))
            : null}
          {(!canViewPrivateNotes(appUser?.role) || adminMode === "reply") &&
            topLevelComments.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-sm text-slate-800"
            >
              <div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>
                  {item.author_role === "admin"
                    ? "admin"
                    : (authorLabels[item.author_app_user_id] ?? "user")}
                </span>
                <span className="tabular-nums">{formatDateTime(item.created_at)}</span>
              </div>
              {editingRootId === item.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editRootBody}
                    onChange={(e) => setEditRootBody(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-800"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                      onClick={async () => {
                        if (!appUser?.id || !editRootBody.trim()) return;
                        setActionError(null);
                        try {
                          await updateUserRootComment(item.id, editRootBody, appUser.id);
                          setEditingRootId(null);
                          setEditRootBody("");
                        } catch (e) {
                          setActionError(getErrorMessage(e, "Failed to save edit"));
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() => {
                        setEditingRootId(null);
                        setEditRootBody("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-slate-900">{item.body}</p>
              )}
              {isTrainee(appUser?.role) && canEditTraineeRoot(item) && editingRootId !== item.id ? (
                <button
                  type="button"
                  className="mt-1 text-xs text-[#264B5A] underline"
                  onClick={() => {
                    setEditingRootId(item.id);
                    setEditRootBody(item.body);
                  }}
                >
                  Edit (5 min, until admin replies)
                </button>
              ) : null}
              {canReplyAsQA(appUser?.role) && item.comment_type === "user_comment" ? (
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
              {isTrainee(appUser?.role) && item.comment_type === "user_comment" ? (
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
