"use client";

import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { listAdminConsoleThreads, type AdminConsoleThreadListItem } from "@/lib/services/admin-review-console";
import { addStaffQaReply } from "@/lib/services/comments";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function AdminHomePage() {
  const { appUser, loading: userLoading, canViewAdminPanel } = useReviewWorkspaceActor();
  const [threads, setThreads] = useState<AdminConsoleThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!canViewAdminPanel) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      setLoading(true);
      setError(null);
      const result = await listAdminConsoleThreads(supabase);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setThreads([]);
        setLoading(false);
        return;
      }

      setThreads(result.threads);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canViewAdminPanel, reloadTick]);

  const refreshThreads = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const onSendReply = async (thread: AdminConsoleThreadListItem) => {
    if (!appUser?.id || !replyBody.trim()) return;
    if (!thread.qaParentId) {
      setActionError("There is no trainee top-level comment to reply to yet. Open the case and wait for a user message.");
      return;
    }
    const supabase = createClient();
    setActionError(null);
    setActionOk(null);
    try {
      await addStaffQaReply(supabase, {
        threadId: thread.threadId,
        parentCommentId: thread.qaParentId,
        authorAppUserId: appUser.id,
        role: appUser.role,
        body: replyBody.trim(),
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not send QA reply");
      return;
    }

    setReplyBody("");
    setReplyTo(null);
    setActionOk("Reply sent.");
    refreshThreads();
  };

  const dashedPanelClass =
    "rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500";

  if (userLoading) {
    return (
      <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
        <div className="mx-auto w-full min-w-0 max-w-6xl">
          <div className={dashedPanelClass}>Loading admin…</div>
        </div>
      </section>
    );
  }

  if (!canViewAdminPanel) {
    return (
      <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-3">
          <h1 className="heading-page">Admin</h1>
          <div className={dashedPanelClass}>Access restricted to admins only.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-[#264B5A]">
            Home
          </Link>{" "}
          / <span className="text-slate-700">Admin</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="heading-page">Admin</h1>
            <p className="mt-1 text-sm text-slate-600">Trainee review threads — reply to QA from here.</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshThreads()}
            className="h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
        {actionOk ? <p className="text-sm text-emerald-700">{actionOk}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 shadow-sm">
          {loading ? (
            <div className={dashedPanelClass}>Loading review threads…</div>
          ) : threads.length === 0 ? (
            <div className={dashedPanelClass}>No review threads yet.</div>
          ) : (
            <ul className="space-y-3">
          {threads.map((thread) => (
            <li
              key={thread.threadId}
              className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Trainee · {thread.traineeLabel}</span>
                <span className="tabular-nums">{thread.createdAtLabel}</span>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{thread.targetLabel}</span>
                <Link href={thread.targetHref} className="text-[#264B5A] underline">
                  Open in review mode
                </Link>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                <p className="mb-1 text-xs text-slate-500">Latest trainee activity</p>
                <p className="whitespace-pre-wrap text-sm text-slate-900">{thread.preview}</p>
              </div>

              {!thread.qaParentId ? (
                <p className="mt-2 text-xs text-amber-800">
                  QA reply is available after the trainee posts a top-level thread message on the case page.
                </p>
              ) : null}

              <div className="mt-3">
                {replyTo === thread.threadId ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      placeholder="Write admin QA reply..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                        disabled={!thread.qaParentId}
                        onClick={() => void onSendReply(thread)}
                      >
                        Send QA
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
                    className="text-sm text-[#264B5A] underline disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!thread.qaParentId}
                    onClick={() => {
                      setReplyTo(thread.threadId);
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
        </div>
      </div>
    </section>
  );
}
