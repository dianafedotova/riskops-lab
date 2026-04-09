"use client";

import { FilterSelect } from "@/components/filter-select";
import { QueryErrorBanner } from "@/components/query-error";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { formatAppUserRoleLabel, isSuperAdmin, type AppUserRole } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import { filterAdminPeople, listAdminPeople } from "@/lib/services/admin-people";
import { createClient } from "@/lib/supabase";
import type { AdminPersonListRow } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const ROLE_FILTER_OPTIONS: { value: AppUserRole | "all"; label: string }[] = [
  { value: "trainee", label: "Trainees" },
  { value: "reviewer", label: "Reviewers" },
  { value: "ops_admin", label: "Ops Admins" },
  { value: "super_admin", label: "Super Admins" },
  { value: "all", label: "All roles" },
];

function personHref(row: AdminPersonListRow): string {
  return row.role === "trainee" ? `/admin/trainees/${row.id}` : `/admin/people/${row.id}`;
}

function activeLabel(row: AdminPersonListRow): string {
  return row.is_active === false ? "Inactive" : "Active";
}

function activeBadgeClass(row: AdminPersonListRow): string {
  return row.is_active === false ? "ui-badge-rose" : "ui-badge-emerald";
}

function copyIcon(copied: boolean) {
  return copied ? (
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
  );
}

export function AdminPeoplePanel() {
  const { appUser, canViewAdminPanel } = useReviewWorkspaceActor();
  const [rows, setRows] = useState<AdminPersonListRow[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<{ value: string; label: string }[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppUserRole | "all">("trainee");
  const [organizationFilter, setOrganizationFilter] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser || !canViewAdminPanel) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { rows: nextRows, organizations, error: listError } = await listAdminPeople(supabase, appUser);
      if (cancelled) return;

      setError(listError);
      setRows(nextRows);
      setOrganizationOptions(
        organizations.map((organization) => ({
          value: organization.id,
          label: organization.name,
        }))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [appUser, canViewAdminPanel, reloadTick]);

  const isSuperAdminViewer = isSuperAdmin(appUser?.role);
  const visibleRows = useMemo(
    () =>
      filterAdminPeople(rows, {
        query,
        role: isSuperAdminViewer ? roleFilter : "trainee",
        organizationId: isSuperAdminViewer ? organizationFilter : "all",
      }),
    [rows, query, roleFilter, organizationFilter, isSuperAdminViewer]
  );

  const copyId = async (personId: string) => {
    await navigator.clipboard.writeText(personId);
    setCopiedId(personId);
    setTimeout(() => {
      setCopiedId((current) => (current === personId ? null : current));
    }, 1500);
  };

  if (!canViewAdminPanel) return null;

  return (
    <div className="space-y-4">
      {error ? <QueryErrorBanner message={error} onRetry={() => setReloadTick((tick) => tick + 1)} /> : null}

      <section className="workspace-shell space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-people-search" className="mb-1 block pl-3 text-sm font-medium text-slate-600">
              Search people
            </label>
            <input
              id="admin-people-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, or account ID…"
              className="dark-input h-10 w-full rounded-[0.7rem] px-4 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {isSuperAdminViewer ? (
              <>
                <div className="flex min-w-[12rem] flex-col gap-1">
                  <span className="pl-3 text-sm font-medium text-slate-600">Role</span>
                  <FilterSelect
                    ariaLabel="Role filter"
                    value={roleFilter}
                    onChange={(nextValue) => setRoleFilter(nextValue as AppUserRole | "all")}
                    options={ROLE_FILTER_OPTIONS}
                    className="dark-input h-10 w-full"
                  />
                </div>
                <div className="flex min-w-[13rem] flex-col gap-1">
                  <span className="pl-3 text-sm font-medium text-slate-600">Organization</span>
                  <FilterSelect
                    ariaLabel="Organization filter"
                    value={organizationFilter}
                    onChange={(nextValue) => setOrganizationFilter(nextValue)}
                    options={[{ value: "all", label: "All organizations" }, ...organizationOptions]}
                    className="dark-input h-10 w-full"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-slate-200/90 bg-white/75">
          <TableSwipeHint />
          <div className="scroll-x-touch">
            <table className="min-w-[860px] w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[21%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200/90 text-left text-xs uppercase tracking-[0.11em] text-slate-500">
                  <th className="px-4 py-3">Account ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                </tr>
              </thead>
              {loading ? (
                <TableSkeleton rows={6} cols={7} />
              ) : (
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8">
                        <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center text-sm text-slate-500">
                          No people match the current view.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-200/80 align-top last:border-b-0">
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2">
                            <span className="min-w-0 break-all font-mono text-[11px] text-slate-600">{row.id}</span>
                            <button
                              type="button"
                              onClick={() => void copyId(row.id)}
                              className="mt-0.5 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                              title={copiedId === row.id ? "Copied" : "Copy ID"}
                              aria-label={copiedId === row.id ? "Copied ID" : "Copy ID"}
                            >
                              {copyIcon(copiedId === row.id)}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link href={personHref(row)} className="font-semibold text-[var(--brand-700)] hover:underline">
                            {row.full_name?.trim() || row.email?.trim() || row.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{row.email ?? "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className="ui-badge ui-badge-neutral text-[11px]">{formatAppUserRoleLabel(row.role)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{row.organization_name ?? "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className={`ui-badge text-[11px] ${activeBadgeClass(row)}`}>{activeLabel(row)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[0.76rem] tabular-nums text-slate-500">{formatDateTime(row.last_login_at)}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
