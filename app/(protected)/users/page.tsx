"use client";

import { SimulatorUserForm } from "@/components/simulator-user-form";
import { SimulatorUserImportModal } from "@/components/simulator-user-import-modal";
import { ModalShell } from "@/components/modal-shell";
import { QueryErrorBanner } from "@/components/query-error";
import { FilterSelect } from "@/components/filter-select";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { useCurrentUser } from "@/components/current-user-provider";
import { canSeeStaffActionControls } from "@/lib/permissions/checks";
import { TABLE_PY } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import type { ImportedSimulatorUserRow, UserRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const USER_LIST_LIMIT = 2000;
const USER_LIST_COLS =
  "id, email, full_name, country_name, tier, status, risk_level, registration_date, created_at" as const;

type UserListRow = Pick<
  UserRow,
  | "id"
  | "email"
  | "full_name"
  | "country_name"
  | "tier"
  | "status"
  | "risk_level"
  | "registration_date"
  | "created_at"
>;

type UserListSortKey = "id" | "full_name" | "registration_date" | "created_at";

function defaultSortDirForKey(key: UserListSortKey): "asc" | "desc" {
  if (key === "registration_date" || key === "created_at") return "desc";
  return "asc";
}

function parseSortTime(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === "") return null;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? null : t;
}

function formatUserListDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const t = Date.parse(String(value));
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatUserListDateTime(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const t = Date.parse(String(value));
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const USER_STATUS_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "active", label: "Active" },
  { value: "restricted", label: "Restricted" },
  { value: "blocked", label: "Blocked" },
] as const;

const USER_RISK_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
] as const;

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
] as const;

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
  const [sortKey, setSortKey] = useState<UserListSortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [copiedGeneratedIds, setCopiedGeneratedIds] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [generatedUsers, setGeneratedUsers] = useState<ImportedSimulatorUserRow[]>([]);
  const [generatedUsersTitle, setGeneratedUsersTitle] = useState<string | null>(null);

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
    if (v === "active") return "ui-badge-emerald";
    if (v === "restricted") return "ui-badge-amber";
    if (v === "blocked" || v === "closed") return "ui-badge-rose";
    if (v === "not_active") return "ui-badge-neutral";
    return "ui-badge-neutral";
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
    if (v === "high") return "ui-badge-rose";
    if (v === "medium") return "ui-badge-amber";
    if (v === "low") return "ui-badge-emerald";
    return "ui-badge-neutral";
  };

  const tierBadge = "ui-badge-blue";
  const countryBadge = "ui-badge-neutral";

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

  const sortedFilteredUsers = useMemo(() => {
    const list = [...filteredUsers];
    const mul = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "id":
          return mul * a.id.localeCompare(b.id);
        case "full_name": {
          const av = (a.full_name ?? "").trim();
          const bv = (b.full_name ?? "").trim();
          const aEmpty = !av;
          const bEmpty = !bv;
          if (aEmpty && bEmpty) return a.id.localeCompare(b.id);
          if (aEmpty) return 1;
          if (bEmpty) return -1;
          const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
          if (cmp !== 0) return mul * cmp;
          return a.id.localeCompare(b.id);
        }
        case "registration_date":
        case "created_at": {
          const at = parseSortTime(a[sortKey]);
          const bt = parseSortTime(b[sortKey]);
          const aNull = at == null;
          const bNull = bt == null;
          if (aNull && bNull) return a.id.localeCompare(b.id);
          if (aNull) return 1;
          if (bNull) return -1;
          if (at !== bt) return mul * (at - bt);
          return a.id.localeCompare(b.id);
        }
        default:
          return 0;
      }
    });
    return list;
  }, [filteredUsers, sortDir, sortKey]);

  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const currentPage = Math.min(page, totalPages);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedFilteredUsers.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedFilteredUsers]);

  const toggleUserSort = (key: UserListSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDirForKey(key));
    }
    setPage(1);
  };

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
    setSortKey("id");
    setSortDir("asc");
    setPage(1);
  };

  const isFiltersActive =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    riskFilter !== "all" ||
    tierFilter !== "all" ||
    countryFilter !== "all" ||
    sortKey !== "id" ||
    sortDir !== "asc";

  const copyUserId = async (userId: string) => {
    await navigator.clipboard.writeText(userId);
    setCopiedUserId(userId);
    setTimeout(() => {
      setCopiedUserId((current) => (current === userId ? null : current));
    }, 1500);
  };

  const copyGeneratedUserIds = async () => {
    if (generatedUsers.length === 0) return;
    await navigator.clipboard.writeText(generatedUsers.map((user) => user.id).join("\n"));
    setCopiedGeneratedIds(true);
    setTimeout(() => setCopiedGeneratedIds(false), 1500);
  };

  const handleUserCreated = (user: UserRow) => {
    setCreateOpen(false);
    setGeneratedUsers([
      {
        id: user.id,
        email: user.email ?? null,
        full_name: user.full_name ?? null,
      },
    ]);
    setGeneratedUsersTitle("User created");
    setReloadTick((tick) => tick + 1);
  };

  const handleUsersImported = (created: ImportedSimulatorUserRow[]) => {
    setImportOpen(false);
    setGeneratedUsers(created);
    setGeneratedUsersTitle(created.length === 1 ? "1 user imported" : `${created.length} users imported`);
    setReloadTick((tick) => tick + 1);
  };

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <div className="w-full space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h1 className="heading-page">Users</h1>
        </div>
        {canViewStaffActions ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="ui-btn ui-btn-secondary"
            >
              Import Users CSV
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ui-btn ui-btn-primary"
            >
              Add User
            </button>
          </div>
        ) : null}
      </div>

      {generatedUsers.length > 0 ? (
        <div className="workspace-shell space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-900">
                {generatedUsersTitle ?? "Generated user IDs"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Save these `user_id` values for later alert imports. The IDs below were generated during the last successful create/import action.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyGeneratedUserIds()}
                className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-3.5 py-2 text-sm"
              >
                {copiedGeneratedIds ? "Copied IDs" : "Copy all IDs"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeneratedUsers([]);
                  setGeneratedUsersTitle(null);
                }}
                className="rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white/90">
            <div className="scroll-x-touch">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-200/70 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{user.id}</td>
                      <td className="px-4 py-3 text-slate-700">{user.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/users/${user.id}`)}
                          className="ui-btn ui-btn-secondary min-h-0 rounded-[0.85rem] px-3 py-1.5 text-xs"
                        >
                          Open profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {error && (
        <QueryErrorBanner message={error} onRetry={() => setReloadTick((n) => n + 1)} hint={hint} />
      )}

      <div className="workspace-shell flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="min-w-0 w-full max-w-md flex-1">
            <label htmlFor="users-search" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
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
              className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
            />
          </div>
          <div className="flex flex-wrap items-end gap-x-2.5 gap-y-2.5 sm:gap-x-3 lg:flex-nowrap lg:justify-end">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Account status</span>
              <FilterSelect
                ariaLabel="User status"
                value={statusFilter}
                onChange={(nextValue) => {
                  setStatusFilter(nextValue);
                  setPage(1);
                }}
                options={[...USER_STATUS_OPTIONS]}
                className="w-[min(100%,9rem)] min-w-[7.5rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Risk level</span>
              <FilterSelect
                ariaLabel="User risk level"
                value={riskFilter}
                onChange={(nextValue) => {
                  setRiskFilter(nextValue);
                  setPage(1);
                }}
                options={[...USER_RISK_OPTIONS]}
                className="w-[min(100%,8rem)] min-w-[7rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Account tier</span>
              <FilterSelect
                ariaLabel="User account tier"
                value={tierFilter}
                onChange={(nextValue) => {
                  setTierFilter(nextValue);
                  setPage(1);
                }}
                options={[{ value: "all", label: "Any" }, ...tierOptions.map((t) => ({ value: t, label: t }))]}
                className="w-[min(100%,8rem)] min-w-[7rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="pl-3 text-sm font-medium text-slate-600">Country</span>
              <FilterSelect
                ariaLabel="User country"
                value={countryFilter}
                onChange={(nextValue) => {
                  setCountryFilter(nextValue);
                  setPage(1);
                }}
                options={[{ value: "all", label: "Any" }, ...countryOptions.map((c) => ({ value: c, label: c }))]}
                className="w-[7.5rem] max-w-[7.5rem]"
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              disabled={!isFiltersActive}
              className="ui-btn ui-btn-secondary ui-filter-reset h-10 min-h-0 shrink-0 self-end rounded-[0.65rem] px-4 text-sm font-medium disabled:cursor-default"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="workspace-shell overflow-hidden p-0">
        <TableSwipeHint />
        <div className="scroll-x-touch">
        <table className="w-full table-fixed min-w-[1020px] border-collapse text-sm">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[17%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
              <th
                className={`px-4 ${TABLE_PY}`}
                aria-sort={sortKey === "id" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() => toggleUserSort("id")}
                  className="group inline-flex max-w-full items-center gap-1 text-left font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:text-slate-900"
                >
                  <span className="truncate">User ID</span>
                  <span className="shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden>
                    {sortKey === "id" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </button>
              </th>
              <th
                className={`px-4 ${TABLE_PY}`}
                aria-sort={sortKey === "full_name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() => toggleUserSort("full_name")}
                  className="group inline-flex max-w-full items-center gap-1 text-left font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:text-slate-900"
                >
                  <span className="truncate">Full Name</span>
                  <span className="shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden>
                    {sortKey === "full_name" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </button>
              </th>
              <th
                className={`px-4 ${TABLE_PY}`}
                aria-sort={
                  sortKey === "registration_date" ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => toggleUserSort("registration_date")}
                  className="group inline-flex max-w-full items-center gap-1 text-left font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:text-slate-900"
                >
                  <span className="truncate">Registered</span>
                  <span className="shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden>
                    {sortKey === "registration_date" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </button>
              </th>
              <th
                className={`px-4 ${TABLE_PY}`}
                aria-sort={sortKey === "created_at" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() => toggleUserSort("created_at")}
                  className="group inline-flex max-w-full items-center gap-1 text-left font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:text-slate-900"
                >
                  <span className="truncate">Added</span>
                  <span className="shrink-0 text-slate-400 group-hover:text-slate-600" aria-hidden>
                    {sortKey === "created_at" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </button>
              </th>
              <th className={`px-4 ${TABLE_PY}`}>Email</th>
              <th className={`px-4 ${TABLE_PY}`}>Country</th>
              <th className={`px-4 ${TABLE_PY}`}>Tier</th>
              <th className={`px-4 ${TABLE_PY}`}>User Status</th>
              <th className={`px-4 ${TABLE_PY}`}>Risk Level</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={8} cols={9} />
          ) : (
            <tbody>
              {totalFiltered === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8">
                    <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No users yet.
                    </div>
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user) => {
                  const risk = user.risk_level ?? "";
                  const uid = user.id;
                  const fullName = user.full_name ?? "";
                  const country = (user.country_name ?? "").trim() || "—";
                  const tier = (user.tier ?? "").trim() || "—";
                  return (
                    <tr
                      key={uid}
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="cursor-pointer border-b border-slate-200 bg-white/55 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-100/85"
                    >
                      <td className={`px-4 font-mono text-xs text-slate-600 ${TABLE_PY}`}>
                        <div className="flex items-start gap-1.5">
                          <span className="min-w-0 break-words">{uid}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyUserId(uid);
                            }}
                            className="mt-0.5 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title={copiedUserId === uid ? "Copied" : "Copy user ID"}
                            aria-label={copiedUserId === uid ? "Copied user ID" : "Copy user ID"}
                          >
                            {copiedUserId === uid ? (
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="m3.5 8 2.6 2.6 6.4-6.4" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <rect x="5" y="3.5" width="7" height="9" rx="1.3" />
                                <path d="M3.5 10.5h-.3A1.7 1.7 0 0 1 1.5 8.8V3.2c0-.94.76-1.7 1.7-1.7h4.6c.94 0 1.7.76 1.7 1.7v.3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className={`px-4 ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap`} title={fullName || "—"}>
                        {fullName || "—"}
                      </td>
                      <td
                        className={`px-4 ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap tabular-nums text-slate-600`}
                        title={user.registration_date ?? ""}
                      >
                        {formatUserListDate(user.registration_date)}
                      </td>
                      <td
                        className={`px-4 ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap tabular-nums text-slate-600`}
                        title={user.created_at ?? ""}
                      >
                        {formatUserListDateTime(user.created_at)}
                      </td>
                      <td className={`px-4 ${TABLE_PY} overflow-hidden text-ellipsis whitespace-nowrap`} title={user.email}>
                        {user.email}
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span className={`ui-badge inline-block max-w-full text-[11px] ${countryBadge} whitespace-nowrap`} title={country}>
                          {country}
                        </span>
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span className={`ui-badge text-[11px] ${tierBadge}`}>
                          {tier}
                        </span>
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span className={`ui-badge text-[11px] ${statusBadgeClass(user.status)}`}>
                          {formatStatusLabel(user.status)}
                        </span>
                      </td>
                      <td className={`px-4 ${TABLE_PY}`}>
                        <span
                          className={`ui-badge tabular-nums text-[11px] ${riskBadgeClass(risk)}`}
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
          <span>Items per page</span>
          <FilterSelect
            ariaLabel="Users items per page"
            value={String(itemsPerPage)}
            onChange={(nextValue) => {
              setItemsPerPage(Number(nextValue));
              setPage(1);
            }}
            options={[...PAGE_SIZE_OPTIONS]}
            className="ui-page-size min-w-[4.25rem]"
            menuClassName="left-auto right-0 min-w-[4.5rem]"
          />
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="ui-pager-btn"
              >
                Previous
              </button>
            ) : null}
            <button type="button" className="ui-pager-current">
              {currentPage}
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="ui-pager-btn"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      </div>
      {importOpen && canViewStaffActions ? (
        <SimulatorUserImportModal
          viewer={appUser}
          onClose={() => setImportOpen(false)}
          onImported={handleUsersImported}
        />
      ) : null}
      {createOpen && canViewStaffActions ? (
        <ModalShell
          title="Add simulator user"
          description="IDs are generated automatically. Start with the core profile fields, then refine the rest from the detail page."
          onClose={() => setCreateOpen(false)}
        >
          <SimulatorUserForm
            viewer={appUser}
            mode="create"
            fieldset="minimal"
            submitLabel="Create user"
            onSaved={handleUserCreated}
            onCancel={() => setCreateOpen(false)}
          />
        </ModalShell>
      ) : null}
    </section>
  );
}
