"use client";

import { QueryErrorBanner } from "@/components/query-error";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { canSeeStaffActionControls } from "@/lib/permissions/checks";
import { TABLE_PY } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import type { UserRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const USER_LIST_LIMIT = 2000;
const USER_LIST_COLS =
  "id, email, full_name, country_name, tier, status, risk_level" as const;

type UserListRow = Pick<
  UserRow,
  "id" | "email" | "full_name" | "country_name" | "tier" | "status" | "risk_level"
>;

export default function UsersPage() {
  const { appUser } = useCurrentUser();
  const canViewStaffActions = canSeeStaffActionControls(appUser?.role);
  const router = useRouter();
  const [users, setUsers] = useState<UserListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | string>("all");
  const [tierFilter, setTierFilter] = useState<"all" | string>("all");
  const [countryFilter, setCountryFilter] = useState<"all" | string>("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      setLoading(true);
      setError(null);
      const { data, error: qError } = await supabase
        .from("users")
        .select(USER_LIST_COLS)
        .order("id", { ascending: true })
        .limit(USER_LIST_LIMIT);
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setUsers([]);
      } else {
        setUsers((data as UserListRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const normalizeStr = (v: unknown) => (v == null ? "" : String(v)).trim().toLowerCase();

  const statusBadgeClass = (status: string | null | undefined) => {
    const v = normalizeStr(status);
    if (v === "active") return "bg-emerald-100 text-emerald-800";
    if (v === "restricted") return "bg-amber-100 text-amber-800";
    if (v === "blocked" || v === "closed") return "bg-rose-100 text-rose-800";
    if (v === "not_active") return "bg-slate-200 text-slate-700";
    return "bg-slate-200 text-slate-700";
  };

  const formatStatusLabel = (status: string | null | undefined) => {
    const raw = status ?? "";
    const v = normalizeStr(raw);
    if (!v) return "—";
    if (v === "active") return "Active";
    if (v === "restricted") return "Restricted";
    if (v === "blocked") return "Blocked";
    if (v === "closed") return "Closed";
    if (v === "not_active") return "Not Active";
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  const riskBadgeClass = (risk: string | null | undefined) => {
    const v = normalizeStr(risk);
    if (v === "high") return "bg-rose-100 text-rose-800";
    if (v === "medium") return "bg-amber-100 text-amber-800";
    if (v === "low") return "bg-emerald-100 text-emerald-800";
    return "bg-slate-200 text-slate-700";
  };

  const tierBadge = "bg-sky-100 text-sky-800";
  const countryBadge = "bg-slate-200 text-slate-700";

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const fullName = (u.full_name ?? "").trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] ?? "";
      const lastName = parts[parts.length - 1] ?? "";
      const country = (u.country_name ?? "").trim() || "—";
      const tier = (u.tier ?? "").trim() || "—";

      const statusOk =
        statusFilter === "all" ? true : (u.status ?? "").toLowerCase() === statusFilter.toLowerCase();
      const riskOk = riskFilter === "all" ? true : (u.risk_level ?? "").toLowerCase() === riskFilter.toLowerCase();
      const tierOk = tierFilter === "all" ? true : normalizeStr(tier) === normalizeStr(tierFilter);
      const countryOk =
        countryFilter === "all" ? true : normalizeStr(country) === normalizeStr(countryFilter);
      const queryOk =
        !q ||
        normalizeStr(u.id).includes(q) ||
        normalizeStr(u.email).includes(q) ||
        normalizeStr(fullName).includes(q) ||
        normalizeStr(firstName).includes(q) ||
        normalizeStr(lastName).includes(q);

      return statusOk && riskOk && tierOk && countryOk && queryOk;
    });
  }, [query, statusFilter, riskFilter, tierFilter, countryFilter, users]);

  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const currentPage = Math.min(page, totalPages);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [currentPage, filteredUsers, itemsPerPage]);

  const hint = (
    <div className="space-y-1 text-xs text-rose-800/90">
      {error && /timeout/i.test(error) ? (
        <p>
          Query timed out (often a very large <code className="rounded bg-rose-100 px-1 font-mono">users</code> table).
          This page loads at most {USER_LIST_LIMIT} rows. Consider an index on{" "}
          <code className="rounded bg-rose-100 px-1 font-mono">users(id)</code> (usually automatic for PK) and avoid
          importing huge datasets into the simulator.
        </p>
      ) : null}
      <p>
        Ensure <code className="rounded bg-rose-100 px-1 font-mono">supabase/schema.sql</code> is applied and env keys
        match your Supabase project.
      </p>
    </div>
  );

  const tierOptions = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      const v = (u.tier ?? "").trim();
      if (!v) continue;
      set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      const v = (u.country_name ?? "").trim();
      if (!v) continue;
      set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setRiskFilter("all");
    setTierFilter("all");
    setCountryFilter("all");
    setPage(1);
  };

  const isFiltersActive =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    riskFilter !== "all" ||
    tierFilter !== "all" ||
    countryFilter !== "all";

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
      {canViewStaffActions ? (
        <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            type="button"
            className="min-h-11 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-brand-500 sm:min-h-0 sm:px-3 sm:py-1.5"
          >
            Add User
          </button>
        </div>
      ) : null}

      {error && (
        <QueryErrorBanner message={error} onRetry={() => setReloadTick((n) => n + 1)} hint={hint} />
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-sm sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="min-w-0 w-full max-w-md flex-1">
            <label htmlFor="users-search" className="mb-1 block text-xs font-medium text-slate-600">
              Search users
            </label>
            <input
              id="users-search"
              type="text"
              placeholder="User ID, name, or email…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors duration-150 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-2 gap-y-2 sm:gap-x-2.5 lg:flex-nowrap lg:justify-end">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="filter-status" className="text-xs font-medium text-slate-600">
                Account status
              </label>
              <div className="relative">
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-[min(100%,8.5rem)] min-w-[7.25rem] appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                >
                  <option value="all">Any</option>
                  <option value="active">Active</option>
                  <option value="restricted">Restricted</option>
                  <option value="blocked">Blocked</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="filter-risk" className="text-xs font-medium text-slate-600">
                Risk level
              </label>
              <div className="relative">
                <select
                  id="filter-risk"
                  value={riskFilter}
                  onChange={(e) => {
                    setRiskFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-[min(100%,7.5rem)] min-w-[6.75rem] appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                >
                  <option value="all">Any</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="filter-tier" className="text-xs font-medium text-slate-600">
                Account tier
              </label>
              <div className="relative">
                <select
                  id="filter-tier"
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-[min(100%,7.5rem)] min-w-[6.75rem] appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                >
                  <option value="all">Any</option>
                  {tierOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="filter-country" className="text-xs font-medium text-slate-600">
                Country
              </label>
              <div className="relative">
                <select
                  id="filter-country"
                  value={countryFilter}
                  onChange={(e) => {
                    setCountryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-[7rem] max-w-[7.25rem] appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-50 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                >
                  <option value="all">Any</option>
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              disabled={!isFiltersActive}
              className="h-10 shrink-0 self-end rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-slate-50/50 shadow-sm">
        <TableSwipeHint />
        <div className="scroll-x-touch">
        <table className="w-full table-fixed min-w-[860px] border-collapse text-sm">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[19%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
              <th className={`px-4 ${TABLE_PY}`}>User ID</th>
              <th className={`px-4 ${TABLE_PY}`}>Full Name</th>
              <th className={`px-4 ${TABLE_PY}`}>Email</th>
              <th className={`px-4 ${TABLE_PY}`}>Country</th>
              <th className={`px-4 ${TABLE_PY}`}>Tier</th>
              <th className={`px-4 ${TABLE_PY}`}>User Status</th>
              <th className={`px-4 ${TABLE_PY} text-right`}>Risk Level</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : (
            <tbody>
              {totalFiltered === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No users yet.
                    </div>
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user, idx) => {
                  const risk = user.risk_level ?? "";
                  const uid = user.id;
                  const fullName = user.full_name ?? "";
                  const country = (user.country_name ?? "").trim() || "—";
                  const tier = (user.tier ?? "").trim() || "—";
                  return (
                    <tr
                      key={uid}
                      onClick={() => router.push(`/users/${user.id}`)}
                      className={`cursor-pointer border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-200/70 ${
                        idx % 2 === 1 ? "bg-slate-50/60" : "bg-white/40"
                      }`}
                    >
                      <td className={`px-4 font-mono text-xs text-slate-600 ${TABLE_PY}`}>{uid}</td>
                      <td className={`px-4 ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap`} title={fullName || "—"}>
                        {fullName || "—"}
                      </td>
                      <td className={`px-4 ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap`} title={user.email}>
                        {user.email}
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span className={`inline-block max-w-full rounded-full px-2 py-0.5 text-[11px] font-medium ${countryBadge} whitespace-nowrap`} title={country}>
                          {country}
                        </span>
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tierBadge}`}>
                          {tier}
                        </span>
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(user.status)}`}>
                          {formatStatusLabel(user.status)}
                        </span>
                      </td>
                      <td className={`px-4 text-right ${TABLE_PY}`}>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${riskBadgeClass(risk)}`}
                        >
                          {risk || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          )}
        </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-600">
        <p>
          {loading
            ? "…"
            : totalFiltered === 0
              ? "Showing 0 of 0 users"
              : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalFiltered)} of ${totalFiltered} users`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="users-per-page">Items per page</label>
          <select
            id="users-per-page"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="rounded-md bg-slate-100 px-2 py-1 shadow-sm"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button type="button" className="rounded-md bg-slate-200 px-2.5 py-1 text-sm text-slate-700 shadow-sm">
            {currentPage}
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </section>
  );
}
