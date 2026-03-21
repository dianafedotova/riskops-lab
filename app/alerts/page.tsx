"use client";

import { useRouter } from "next/navigation";

const mockAlerts = [
  {
    id: "a-5001",
    userId: "u-1003",
    type: "Fraud",
    severity: "High",
    status: "Open",
    createdAt: "2026-03-20 11:42",
  },
  {
    id: "a-5002",
    userId: "u-1002",
    type: "AML",
    severity: "Critical",
    status: "Escalated",
    createdAt: "2026-03-20 10:18",
  },
  {
    id: "a-5003",
    userId: "u-1001",
    type: "Fraud",
    severity: "Medium",
    status: "Monitoring",
    createdAt: "2026-03-19 19:07",
  },
];

export default function AlertsPage() {
  const router = useRouter();

  return (
    <section className="space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Alerts</h1>
          <div className="flex items-center gap-2">
            <button className="rounded-md bg-[#264B5A] px-2.5 py-1 text-sm font-medium text-slate-100">
              Fraud
            </button>
            <button className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-200">
              AML
            </button>
          </div>
        </div>
        <button className="rounded-md bg-[#264B5A] px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-[#315E70]">
          Create Alert
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-slate-100 p-3">
        <input
          type="text"
          placeholder="Search alerts..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#264B5A]"
        />
        <select className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <option>Severity: all</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>
        <select className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <option>Status: all</option>
          <option>Open</option>
          <option>Monitoring</option>
          <option>Escalated</option>
          <option>Closed</option>
        </select>
        <input
          type="date"
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3">Alert ID</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
            </tr>
          </thead>
          <tbody>
            {mockAlerts.map((alert) => (
              <tr
                key={alert.id}
                onClick={() => router.push(`/alerts/${alert.id}`)}
                className="cursor-pointer border-b border-slate-200 text-slate-700 transition hover:bg-slate-200/70 last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs">{alert.id}</td>
                <td className="px-4 py-3 font-mono text-xs">{alert.userId}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      alert.type === "AML"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {alert.type}
                  </span>
                </td>
                <td className="px-4 py-3">{alert.severity}</td>
                <td className="px-4 py-3">{alert.status}</td>
                <td className="px-4 py-3">{alert.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3 text-sm text-slate-600">
        <p>Showing 1-3 of 3 alerts</p>
        <div className="flex items-center gap-2">
          <label htmlFor="alerts-per-page">Items per page</label>
          <select
            id="alerts-per-page"
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-200">
            Previous
          </button>
          <button className="rounded-md border border-slate-300 bg-slate-200 px-2.5 py-1 text-sm">
            1
          </button>
          <button className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-200">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
