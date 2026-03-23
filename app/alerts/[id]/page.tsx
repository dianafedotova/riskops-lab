"use client";

import { AlertDetailSkeleton } from "@/components/alert-detail-skeleton";
import { QueryErrorBanner } from "@/components/query-error";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { formatDateTime } from "@/lib/format";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import { supabase } from "@/lib/supabase";
import type { AlertRow } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Decision = "false_positive" | "true_positive" | "info_requested" | "escalated" | null;

function getStatus(decision: Decision): string {
  if (!decision) return "Open";
  if (decision === "false_positive" || decision === "true_positive") return "Resolved";
  return "In Review";
}

export default function AlertDetailsPage() {
  const params = useParams<{ id: string }>();
  const alertId = params?.id ?? "a-unknown";
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [notes, setNotes] = useState<
    { text: string; type: "system" | "analyst" | "admin" }[]
  >([
    { text: "Alert triaged for fraud review.", type: "system" },
    { text: "Requesting SOF docs from user.", type: "analyst" },
  ]);

  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [otherAlerts, setOtherAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: row, error: qError } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", alertId)
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setAlert(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      if (!row) {
        setAlert(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      const a = row as AlertRow;
      setAlert(a);
      const uid = a.user_id;
      if (uid) {
        const { data: others } = await supabase
          .from("alerts")
          .select("*")
          .eq("user_id", uid)
          .neq("id", alertId)
          .order("created_at", { ascending: false });
        if (!cancelled) setOtherAlerts((others as AlertRow[]) ?? []);
      } else {
        setOtherAlerts([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [alertId, reloadTick]);

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((prev) => [{ text: noteText.trim(), type: "analyst" }, ...prev]);
    setNoteText("");
  };

  const copyAlertId = async () => {
    await navigator.clipboard.writeText(alertId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const userId = alert?.user_id ?? "—";
  const displayStatus = decision != null ? getStatus(decision) : (alert?.status ?? "Open");

  if (loading) {
    return <AlertDetailSkeleton />;
  }

  if (error) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <QueryErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
          hint={
            <p className="text-xs text-rose-800/90">
              Check <code className="rounded bg-rose-100 px-1 font-mono">.env.local</code> and Supabase project access.
            </p>
          }
        />
      </section>
    );
  }

  if (!alert) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-slate-600">
          Alert not found. Run <code className="font-mono text-xs">supabase/schema.sql</code> or check the ID.
        </p>
        <Link href="/alerts" className="text-sm text-[#264B5A] hover:underline">
          Back to Alerts
        </Link>
      </section>
    );
  }

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#264B5A]">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/alerts" className="hover:text-[#264B5A]">
          Alerts
        </Link>{" "}
        / <span className="text-slate-700">Alert Details</span>
      </nav>

      <div className="flex items-start justify-between gap-3">
        <h1 className="heading-page">Alert Details</h1>
        <button
          type="button"
          onClick={copyAlertId}
          className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          title="Copy ID"
        >
          {alertId}
          <span className={copied ? "text-emerald-600" : "opacity-0 transition group-hover:opacity-100"}>
            {copied ? "✓" : "📋"}
          </span>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="heading-section mb-3">Alert Information</h2>
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-medium">User ID:</span>{" "}
                {alert.user_id ? (
                  <Link
                    href={`/users/${alert.user_id}`}
                    className="font-mono text-[#264B5A] hover:underline"
                  >
                    {alert.user_id}
                  </Link>
                ) : (
                  <span className="font-mono">{userId}</span>
                )}
              </p>
              <p>
                <span className="font-medium">Type:</span>{" "}
                <span className="font-semibold text-sky-600">{alert.type ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">Severity:</span>{" "}
                <span className="font-semibold text-rose-600">{alert.severity ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`font-semibold ${
                    displayStatus === "Open"
                      ? "text-amber-600"
                      : displayStatus === "Resolved"
                        ? "text-emerald-600"
                        : "text-sky-600"
                  }`}
                >
                  {displayStatus}
                </span>
              </p>
              <p>
                <span className="font-medium">Created At:</span> {formatDateTime(alert.created_at)}
              </p>
              <p>
                <span className="font-medium">Decision:</span>{" "}
                <span className="font-semibold text-slate-600">
                  {decision
                    ? decision === "false_positive"
                      ? "False Positive"
                      : decision === "true_positive"
                        ? "True Positive"
                        : decision === "info_requested"
                          ? "Info requested"
                          : "Escalated"
                    : "N/A"}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="heading-section mb-3">Description</h2>
            <p className="text-sm leading-6 text-slate-700">
              {alert.description ??
                "No description stored for this alert."}
            </p>
          </div>

          {otherAlerts.length > 0 && (
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <h2 className="heading-section mb-3">Other Alerts</h2>
              <TableSwipeHint />
              <div className="scroll-x-touch">
                <table className="min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Alert</th>
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Type</th>
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Status</th>
                      <th className={`text-right tabular-nums ${TABLE_PY_INNER}`}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherAlerts.map((a, idx) => (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-200/50 ${
                          idx % 2 === 1 ? "bg-slate-50/70" : ""
                        }`}
                      >
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>
                          <Link
                            href={`/alerts/${a.id}`}
                            className="font-mono text-xs text-[#264B5A] hover:underline"
                          >
                            {a.id}
                          </Link>
                        </td>
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>{a.type ?? "—"}</td>
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>{a.status ?? "—"}</td>
                        <td className={`text-right tabular-nums ${TABLE_PY_INNER}`}>
                          {formatDateTime(a.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="heading-section mb-3">Analyst Notes</h2>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Leave a note..."
                className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#264B5A] sm:min-h-0"
              />
              <button
                type="button"
                onClick={addNote}
                className="min-h-11 shrink-0 rounded-md bg-[#264B5A] px-4 py-2 text-sm font-medium text-slate-100 hover:bg-[#315E70] sm:min-h-0 sm:px-3 sm:py-1.5"
              >
                Add
              </button>
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              {notes.map((note, i) => (
                <li
                  key={`${note.text}-${i}`}
                  className={`rounded-md border px-3 py-2 ${
                    note.type === "system"
                      ? "border-slate-300 bg-slate-50"
                      : note.type === "analyst"
                        ? "border-[#345868]/60 bg-[#264B5A]/15"
                        : "border-violet-300/60 bg-violet-50"
                  }`}
                >
                  {note.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 lg:sticky lg:top-4">
            <h2 className="heading-section mb-3">Decision</h2>
            <div className="flex flex-wrap gap-2 [&_button]:min-h-11 [&_button]:px-3 sm:[&_button]:min-h-0 sm:[&_button]:px-2.5 sm:[&_button]:py-1.5">
              <button
                type="button"
                onClick={() => setDecision("false_positive")}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
                  decision === "false_positive"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                False Positive
              </button>
              <button
                type="button"
                onClick={() => setDecision("true_positive")}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
                  decision === "true_positive"
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                True Positive
              </button>
              <button
                type="button"
                onClick={() => setDecision("info_requested")}
                className={`rounded-md border border-slate-300 px-2.5 py-1.5 text-sm ${
                  decision === "info_requested" ? "bg-slate-200" : "bg-slate-50 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Info requested
              </button>
              <button
                type="button"
                onClick={() => setDecision("escalated")}
                className={`rounded-md border border-amber-300 px-2.5 py-1.5 text-sm ${
                  decision === "escalated" ? "bg-amber-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Escalated
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
