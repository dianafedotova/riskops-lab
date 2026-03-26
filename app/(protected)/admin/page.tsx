"use client";

import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createClient } from "@/lib/supabase";
import type { UserRow } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const THREAD_COLS = "id, app_user_id, alert_id, user_id, context_type, created_at" as const;

type ReviewThreadListRow = {
  id: string;
  app_user_id: string;
  alert_id: string | null;
  user_id: string | null;
  context_type: string | null;
  created_at: string;
};

type ThreadListItem = {
  threadId: string;
  traineeLabel: string;
  targetLabel: string;
  targetHref: string;
  qaParentId: string | null;
  preview: string;
  created_at: string;
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
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const isAdmin = appUser?.role === "admin";

  const refreshThreads = useCallback(async () => {
    if (!isAdmin) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);
    setError(null);

    const { data: threadRows, error: threadsErr } = await supabase
      .from("review_threads")
      .select(THREAD_COLS)
      .order("created_at", { ascending: false })
      .limit(100);

    if (threadsErr) {
      setError(threadsErr.message);
      setThreads([]);
      setLoading(false);
      return;
    }

    const rows = (threadRows as ReviewThreadListRow[]) ?? [];
    if (rows.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const threadIds = rows.map((r) => r.id);
    const traineeIds = Array.from(new Set(rows.map((r) => r.app_user_id)));
    const alertIds = Array.from(new Set(rows.map((r) => r.alert_id).filter(Boolean))) as string[];
    const simUserIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];

    const [traineesRes, usersRes, alertsResPrimary, rootsRes, decsRes] = await Promise.all([
      supabase.from("app_users").select("id, email, full_name").in("id", traineeIds),
      simUserIds.length
        ? supabase.from("users").select("id, full_name, email").in("id", simUserIds)
        : Promise.resolve({ data: [], error: null }),
      alertIds.length
        ? supabase.from("alerts").select("id, internal_id, alert_type, severity, user_id").in("id", alertIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("simulator_comments")
        .select("id, thread_id, body, created_at, comment_type, parent_comment_id")
        .in("thread_id", threadIds)
        .is("parent_comment_id", null)
        .eq("comment_type", "user_comment")
        .order("created_at", { ascending: false }),
      supabase
        .from("trainee_decisions")
        .select("thread_id, rationale, decision, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false }),
    ]);

    if (traineesRes.error) {
      setError(traineesRes.error.message);
      setThreads([]);
      setLoading(false);
      return;
    }
    if (usersRes.error) {
      setError(usersRes.error.message);
      setThreads([]);
      setLoading(false);
      return;
    }

    let alertsData: AdminAlertRow[] = [];
    if (alertsResPrimary.error && alertIds.length) {
      const alertsResFallback = await supabase
        .from("alerts")
        .select("id, internal_id, alert_type, severity, user_id")
        .in("id", alertIds);
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

    const traineesMap = new Map<string, { id: string; email: string | null; full_name: string | null }>();
    for (const t of (traineesRes.data as { id: string; email: string | null; full_name: string | null }[]) ?? []) {
      traineesMap.set(t.id, t);
    }

    const usersMap = new Map<string, Pick<UserRow, "id" | "full_name" | "email">>();
    for (const u of (usersRes.data as Pick<UserRow, "id" | "full_name" | "email">[]) ?? []) {
      usersMap.set(u.id, u);
    }

    const alertsMap = new Map<string, AdminAlertRow>();
    for (const a of alertsData) {
      if (a.id) alertsMap.set(String(a.id), a);
    }

    const rootByThread = new Map<string, { id: string; body: string }>();
    for (const c of (rootsRes.data as { id: string; thread_id: string | null; body: string }[]) ?? []) {
      if (!c.thread_id) continue;
      if (!rootByThread.has(c.thread_id)) {
        rootByThread.set(c.thread_id, { id: c.id, body: c.body });
      }
    }

    const latestDecPreview = new Map<string, string>();
    for (const d of (decsRes.data as { thread_id: string; rationale: string | null; decision: string }[]) ?? []) {
      if (!latestDecPreview.has(d.thread_id)) {
        latestDecPreview.set(d.thread_id, (d.rationale ?? d.decision ?? "").trim());
      }
    }

    if (rootsRes.error || decsRes.error) {
      setError(rootsRes.error?.message ?? decsRes.error?.message ?? "Failed to load thread activity");
      setThreads([]);
      setLoading(false);
      return;
    }

    const built: ThreadListItem[] = rows.map((rt) => {
      const trainee = traineesMap.get(rt.app_user_id);
      const traineeLabel =
        (trainee?.full_name ?? "").trim() || (trainee?.email ?? "").trim() || rt.app_user_id.slice(0, 8);

      let targetLabel = "Review thread";
      let targetHref = "/";
      if (rt.context_type === "alert" && rt.alert_id) {
        const alert = alertsMap.get(String(rt.alert_id));
        const alertPublicId = alert?.id ?? "unknown";
        const type = (alert?.alert_type ?? alert?.type ?? "alert").toString().toUpperCase();
        const severity = alert?.severity ? ` · ${alert.severity}` : "";
        targetLabel = `Alert ${alertPublicId} · ${type}${severity}`;
        targetHref = `/alerts/${alertPublicId}`;
      } else if (rt.context_type === "profile" && rt.user_id) {
        const su = usersMap.get(rt.user_id);
        const uLabel = (su?.full_name ?? "").trim() || (su?.email ?? "").trim() || rt.user_id;
        targetLabel = `User profile · ${uLabel}`;
        targetHref = `/users/${rt.user_id}`;
      }

      const root = rootByThread.get(rt.id);
      const decPrev = latestDecPreview.get(rt.id);
      const preview = (root?.body ?? decPrev ?? "").trim() || "—";

      return {
        threadId: rt.id,
        traineeLabel,
        targetLabel,
        targetHref,
        qaParentId: root?.id ?? null,
        preview,
        created_at: rt.created_at,
      };
    });

    setThreads(built);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  const onSendReply = async (thread: ThreadListItem) => {
    if (!appUser?.id || !replyBody.trim()) return;
    if (!thread.qaParentId) {
      setActionError("There is no trainee top-level comment to reply to yet. Open the case and wait for a user message.");
      return;
    }
    const supabase = createClient();
    setActionError(null);
    setActionOk(null);

    const { error: insErr } = await supabase.from("simulator_comments").insert({
      thread_id: thread.threadId,
      author_app_user_id: appUser.id,
      author_role: "admin",
      comment_type: "admin_qa",
      parent_comment_id: thread.qaParentId,
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

  if (!isAdmin) {
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
                <span className="tabular-nums">{formatDateTime(thread.created_at)}</span>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{thread.targetLabel}</span>
                <Link href={`${thread.targetHref}?thread=${thread.threadId}`} className="text-[#264B5A] underline">
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
