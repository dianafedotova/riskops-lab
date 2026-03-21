"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

type TabKey =
  | "overview"
  | "transactions"
  | "accounts"
  | "network"
  | "activity"
  | "opslog"
  | "alerts"
  | "notes";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id ?? "u-unknown";
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState<
    { text: string; type: "system" | "analyst" | "admin" }[]
  >([
    { text: "EDD review requested due to increased monthly turnover.", type: "system" },
    { text: "Verified proof of address (utility bill, issued < 90 days).", type: "system" },
    { text: "SOF docs reviewed and accepted. No further action.", type: "analyst" },
    { text: "Case escalated to compliance for final sign-off.", type: "admin" },
  ]);

  const isHighTier = true;
  const userStatus = "Active" as string;
  const isLocked = userStatus === "Blocked" || userStatus === "Restricted";

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((prev) => [{ text: noteText.trim(), type: "analyst" }, ...prev]);
    setNoteText("");
  };

  const copyUserId = async () => {
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#264B5A]">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/users" className="hover:text-[#264B5A]">
          Users
        </Link>{" "}
        / <span className="text-slate-700">User Profile</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User Profile</h1>
        <button
          type="button"
          onClick={copyUserId}
          className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          title="Copy ID"
        >
          {userId}
          <span className={copied ? "text-emerald-600" : "opacity-0 transition group-hover:opacity-100"}>
            {copied ? "✓" : "📋"}
          </span>
        </button>
      </div>

      <div className="mt-4 flex flex-nowrap items-center justify-between gap-4 overflow-x-auto">
        <div className="flex shrink-0 items-center gap-6 rounded-lg border border-slate-200 bg-transparent px-4 py-2 sm:gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
            <p className="text-sm font-semibold text-emerald-600">{userStatus}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Tier</p>
            <p className="text-sm font-semibold text-sky-600">Tier 3</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk</p>
            <p className="text-sm font-semibold text-rose-600">High</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Country</p>
            <p className="text-sm font-semibold text-slate-900">🇸🇬 Singapore</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-transparent px-3 py-2">
          {isLocked ? (
            <button className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-200">
              Unblock
            </button>
          ) : (
            <>
              <button className="rounded-md border border-rose-300 bg-rose-100 px-2.5 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200">
                Full Block
              </button>
              <button className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-700 hover:bg-amber-100">
                Partial Block
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <aside className="space-y-4 xl:col-span-4">
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-300 bg-slate-200">
                <Image
                  src="/user-maya-chen-placeholder.svg"
                  alt="Maya Chen profile photo"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Maya Chen</p>
                <button
                  type="button"
                  onClick={copyUserId}
                  className="group flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-slate-800"
                  title="Copy ID"
                >
                  {userId}
                  <span className={copied ? "text-emerald-600" : "opacity-0 transition group-hover:opacity-100"}>
                    {copied ? " ✓" : " 📋"}
                  </span>
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium">Email:</span> maya.chen@example.com
              </p>
              <p>
                <span className="font-medium">Registration date:</span> 2024-02-03
              </p>
              <p>
                <span className="font-medium">Phone:</span> 🇸🇬 +65 8123 4455
              </p>
              <p>
                <span className="font-medium">Date of birth:</span> 1992-09-18
              </p>
              <p>
                <span className="font-medium">Age:</span> 33
              </p>
              <p>
                <span className="font-medium">Address:</span> 12 Marina View, #18-07, Singapore 018961
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Documents
            </h2>
            <ul className="space-y-1.5 text-sm text-slate-700">
              <li><span className="font-medium">Proof of Identity:</span> Passport — issued by Singapore</li>
              <li><span className="font-medium">Proof of Address:</span> Utility bill</li>
              <li><span className="font-medium">Source of funds:</span> Employer payslips, bank statement</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Balance and Turnover
            </h2>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium">Current balance:</span> 84,250 USD
              </p>
              <p>
                <span className="font-medium">Total turnover:</span> 1,021,300 USD
              </p>
            </div>
          </div>

        </aside>

        <div className="space-y-4 xl:col-span-8">
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-slate-100 p-2">
            {[
              { key: "overview", label: "Overview" },
              { key: "transactions", label: "Transactions" },
              { key: "accounts", label: "Cards & Accounts" },
              { key: "network", label: "Devices & Links" },
              { key: "activity", label: "Activity" },
              { key: "opslog", label: "Ops Log" },
              { key: "alerts", label: "Linked Alerts" },
              { key: "notes", label: "Notes" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`rounded-md px-2.5 py-1.5 text-sm ${
                  activeTab === tab.key
                    ? "bg-[#264B5A] text-slate-100"
                    : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                SOF Questionnaire
              </h2>
              {isHighTier ? (
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <p>
                    <span className="font-medium">Occupation:</span> Product Manager
                  </p>
                  <p>
                    <span className="font-medium">Employment:</span> Full-time
                  </p>
                  <p>
                    <span className="font-medium">Annual income:</span> 180,000 USD
                  </p>
                  <p>
                    <span className="font-medium">Primary source of funds:</span> Salary + investments
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-700">
                  SOF questionnaire not required for this tier.
                </p>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Rail</th>
                    <th className="px-3 py-2">Direction</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2">2026-03-20</td>
                    <td className="px-3 py-2">Crypto transfer</td>
                    <td className="px-3 py-2">Internal wallet</td>
                    <td className="px-3 py-2">Outbound</td>
                    <td className="px-3 py-2">Completed</td>
                    <td className="px-3 py-2 font-medium text-rose-600">−12,000 USDT</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2">2026-03-19</td>
                    <td className="px-3 py-2">Fiat transfer</td>
                    <td className="px-3 py-2">SEPA</td>
                    <td className="px-3 py-2">Inbound</td>
                    <td className="px-3 py-2">Completed</td>
                    <td className="px-3 py-2 font-medium text-emerald-600">+8,400 EUR</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">2026-03-18</td>
                    <td className="px-3 py-2">Exchange</td>
                    <td className="px-3 py-2">Internal exchange</td>
                    <td className="px-3 py-2">Inbound</td>
                    <td className="px-3 py-2">Completed</td>
                    <td className="px-3 py-2 font-medium text-emerald-600">+15,000 USD</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Cards
                </h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>Visa **** 4421 (active)</li>
                  <li>Mastercard **** 1198 (frozen)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Accounts
                </h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>IBAN DE09...1183 (EUR)</li>
                  <li>Wallet BTC-01 (crypto)</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "network" && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Devices
                </h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>iPhone 15 (trusted)</li>
                  <li>Windows Chrome (new)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  IP Addresses
                </h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>103.22.14.90 (SG)</li>
                  <li>185.211.33.17 (DE)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Linked Accounts
                </h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>
                    <Link
                      href="/users/u-7781"
                      className="font-mono text-[#264B5A] hover:underline"
                    >
                      u-7781
                    </Link>{" "}
                    (shared device)
                  </li>
                  <li>
                    <Link
                      href="/users/u-9022"
                      className="font-mono text-[#264B5A] hover:underline"
                    >
                      u-9022
                    </Link>{" "}
                    (shared beneficiary)
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100">
              <h2 className="mb-3 px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                User Activity
              </h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-2">Date & Time</th>
                    <th className="px-4 py-2">Event</th>
                    <th className="px-4 py-2">IP</th>
                    <th className="px-4 py-2">Country</th>
                    <th className="px-4 py-2">Device</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200 text-slate-700">
                    <td className="px-4 py-2">2026-03-20 11:37</td>
                    <td className="px-4 py-2">Device changed from iOS to Windows</td>
                    <td className="px-4 py-2 font-mono text-xs">185.32.1.44</td>
                    <td className="px-4 py-2">🇸🇬 SG</td>
                    <td className="px-4 py-2">Windows PC</td>
                  </tr>
                  <tr className="border-b border-slate-200 text-slate-700">
                    <td className="px-4 py-2">2026-03-20 11:35</td>
                    <td className="px-4 py-2">Address updated (new proof uploaded)</td>
                    <td className="px-4 py-2 font-mono text-xs">185.32.1.44</td>
                    <td className="px-4 py-2">🇸🇬 SG</td>
                    <td className="px-4 py-2">iPhone 14</td>
                  </tr>
                  <tr className="text-slate-700">
                    <td className="px-4 py-2">2026-03-19 09:15</td>
                    <td className="px-4 py-2">Large transfer initiated</td>
                    <td className="px-4 py-2 font-mono text-xs">92.118.45.12</td>
                    <td className="px-4 py-2">🇩🇪 DE</td>
                    <td className="px-4 py-2">MacBook Pro</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "opslog" && (
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Operations Log
              </h2>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>2026-03-20 12:10 - Risk updated from Medium to High by analyst.ops</li>
                <li>2026-03-20 12:04 - Partial block applied to outbound crypto transfers</li>
                <li>2026-03-20 11:58 - SOF questionnaire marked complete</li>
              </ul>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Alert ID</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2">
                      <Link
                        href="/alerts/a-5001"
                        className="font-mono text-xs text-[#264B5A] hover:underline"
                      >
                        a-5001
                      </Link>
                    </td>
                    <td className="px-3 py-2">Fraud</td>
                    <td className="px-3 py-2">High</td>
                    <td className="px-3 py-2">Open</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <Link
                        href="/alerts/a-4920"
                        className="font-mono text-xs text-[#264B5A] hover:underline"
                      >
                        a-4920
                      </Link>
                    </td>
                    <td className="px-3 py-2">AML</td>
                    <td className="px-3 py-2">Medium</td>
                    <td className="px-3 py-2">Monitoring</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Analyst Notes
              </h2>
              <div className="mb-3 flex gap-2">
                <input
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
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
          )}
        </div>
      </div>
    </section>
  );
}
