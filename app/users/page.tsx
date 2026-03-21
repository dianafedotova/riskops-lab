"use client";

import { useRouter } from "next/navigation";

const mockUsers = [
  {
    id: "u-1001",
    email: "maya.chen@example.test",
    country: "SG",
    tier: "Tier 3",
    userStatus: "Active",
    riskLevel: "Low",
  },
  {
    id: "u-1002",
    email: "ibrahim.noor@example.test",
    country: "AE",
    tier: "Tier 2",
    userStatus: "Restricted",
    riskLevel: "Medium",
  },
  {
    id: "u-1003",
    email: "elena.voss@example.test",
    country: "DE",
    tier: "Tier 1",
    userStatus: "Blocked",
    riskLevel: "High",
  },
];

export default function UsersPage() {
  const router = useRouter();

  return (
    <section className="space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Users</h1>
        <button className="rounded-md bg-[#264B5A] px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-[#315E70]">
          Add User
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-slate-100 p-3">
        <input
          type="text"
          placeholder="Search users..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#264B5A]"
        />
        <select className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <option>Status: all</option>
          <option>Active</option>
          <option>Restricted</option>
          <option>Blocked</option>
        </select>
        <select className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <option>Risk: all</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <button className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-200">
          Export
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">User Status</th>
              <th className="px-4 py-3">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr
                key={user.id}
                onClick={() => router.push(`/users/${user.id}`)}
                className="cursor-pointer border-b border-slate-200 text-slate-700 transition hover:bg-slate-200/70 last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.id}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.country}</td>
                <td className="px-4 py-3">{user.tier}</td>
                <td className="px-4 py-3">{user.userStatus}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.riskLevel === "High"
                        ? "bg-rose-100 text-rose-700"
                        : user.riskLevel === "Medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {user.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3 text-sm text-slate-600">
        <p>Showing 1-3 of 3 users</p>
        <div className="flex items-center gap-2">
          <label htmlFor="users-per-page">Items per page</label>
          <select
            id="users-per-page"
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
