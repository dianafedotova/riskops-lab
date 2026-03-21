"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const otherAlerts = [
  { id: "a-4920", type: "AML", status: "Monitoring", createdAt: "2026-03-18 14:22" },
];

type Decision = "false_positive" | "true_positive" | "info_requested" | "escalated" | null;

function getStatus(decision: Decision): string {
  if (!decision) return "Open";
  if (decision === "false_positive" || decision === "true_positive") return "Resolved";
  return "In Review";
}

export default function AlertDetailsPage() {
  const params = useParams<{ id: string }>();
  const alertId = params?.id ?? "a-unknown";
  const userId = "u-1001";
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [notes, setNotes] = useState<
    { text: string; type: "system" | "analyst" | "admin" }[]
  >([
    { text: "Alert triaged for fraud review.", type: "system" },
    { text: "Requesting SOF docs from user.", type: "analyst" },
  ]);

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

  const status = getStatus(decision);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Alert Details</h1>
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

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Alert Information
            </h2>
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-medium">User ID:</span>{" "}
                <Link
                  href={`/users/${userId}`}
                  className="font-mono text-[#264B5A] hover:underline"
                >
                  {userId}
                </Link>
              </p>
              <p>
                <span className="font-medium">Type:</span>{" "}
                <span className="font-semibold text-sky-600">Fraud</span>
              </p>
              <p>
                <span className="font-medium">Severity:</span>{" "}
                <span className="font-semibold text-rose-600">High</span>
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`font-semibold ${
                    status === "Open"
                      ? "text-amber-600"
                      : status === "Resolved"
                        ? "text-emerald-600"
                        : "text-sky-600"
                  }`}
                >
                  {status}
                </span>
              </p>
              <p>
                <span className="font-medium">Created At:</span> 2026-03-20 11:42
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Description
            </h2>
            <p className="text-sm leading-6 text-slate-700">
              Unusual transaction velocity detected over a short time window
              after recent credential reset. Pattern exceeds account baseline and
              triggers fraud review workflow.
            </p>
          </div>

          {otherAlerts.length > 0 && (
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Other Alerts
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="py-2 pr-4">Alert</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherAlerts.map((a) => (
                      <tr key={a.id} className="border-b border-slate-200 text-slate-700 last:border-0">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/alerts/${a.id}`}
                            className="font-mono text-xs text-[#264B5A] hover:underline"
                          >
                            {a.id}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{a.type}</td>
                        <td className="py-2 pr-4">{a.status}</td>
                        <td className="py-2">{a.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Analyst Notes
            </h2>
            <div className="mb-3 flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Leave a note..."
                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#264B5A]"
              />
              <button
                onClick={addNote}
                className="rounded-md bg-[#264B5A] px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-[#315E70]"
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

        <aside className="xl:col-span-4">
          <div className="sticky top-6 rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Decision
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
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
                onClick={() => setDecision("info_requested")}
                className={`rounded-md border border-slate-300 px-2.5 py-1.5 text-sm ${
                  decision === "info_requested" ? "bg-slate-200" : "bg-slate-50 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Info requested
              </button>
              <button
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
