"use client";

import { AdminAppUserActivityLog } from "@/components/admin-app-user-activity-log";
import { AdminTraineeWorkspacePanel } from "@/components/admin-trainee-workspace-panel";
import { AppUserAvatar } from "@/components/app-user-avatar";
import { QueryErrorBanner } from "@/components/query-error";
import { FilterSelect } from "@/components/filter-select";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { canManageAppUserIdentity } from "@/lib/permissions/checks";
import { formatAppUserRoleLabel, type AppUserRole } from "@/lib/app-user-role";
import { formatDateTime } from "@/lib/format";
import {
  createAdminOrganization,
  getAdminPersonProfile,
  listAdminOrganizations,
  updateAdminPersonIdentity,
} from "@/lib/services/admin-people";
import { createClient } from "@/lib/supabase";
import type { AdminStaffProfileRow, AdminTraineeProfileRow, OrganizationRow } from "@/lib/types";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const ROLE_OPTIONS: { value: AppUserRole; label: string }[] = [
  { value: "trainee", label: "Trainee" },
  { value: "reviewer", label: "Reviewer" },
  { value: "ops_admin", label: "Ops Admin" },
  { value: "super_admin", label: "Super Admin" },
];
const ADD_ORGANIZATION_VALUE = "__add_organization__";

const ADD_ORG_TYPE_OPTIONS: { value: OrganizationRow["org_type"]; label: string }[] = [
  { value: "b2b", label: "B2B — client organization" },
  { value: "b2c", label: "B2C — direct trainees" },
  { value: "internal", label: "Internal" },
];

function displayNameForProfile(profile: AdminTraineeProfileRow | AdminStaffProfileRow | null): string {
  if (!profile) return "Profile";
  return profile.full_name?.trim() || profile.email?.trim() || profile.id;
}

function activeBadgeClass(isActive: boolean | null | undefined): string {
  return isActive === false ? "ui-badge-rose" : "ui-badge-emerald";
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

function profileField(label: string, value: React.ReactNode) {
  return (
    <div className="rounded-[0.95rem] border border-slate-200/90 bg-white/90 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export function AdminPersonProfile({
  targetAppUserId,
  mode,
}: {
  targetAppUserId: string;
  mode: "trainee" | "staff";
}) {
  const { appUser, loading: actorLoading, canViewAdminPanel, refresh } = useReviewWorkspaceActor();
  const [profile, setProfile] = useState<AdminTraineeProfileRow | AdminStaffProfileRow | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [roleDraft, setRoleDraft] = useState<AppUserRole>("trainee");
  const [organizationDraft, setOrganizationDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [addOrgOpen, setAddOrgOpen] = useState(false);
  const [addOrgName, setAddOrgName] = useState("");
  const [addOrgType, setAddOrgType] = useState<OrganizationRow["org_type"]>("b2b");
  const [addOrgModalError, setAddOrgModalError] = useState<string | null>(null);
  const addOrgDialogTitleId = useId();
  const addOrgNameInputRef = useRef<HTMLInputElement>(null);

  const canManageIdentity = canManageAppUserIdentity(appUser?.role);

  useEffect(() => {
    if (!appUser || !canViewAdminPanel) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const [{ profile: nextProfile, error: profileError }, { organizations: nextOrgs, error: orgError }] =
        await Promise.all([
          getAdminPersonProfile(supabase, appUser, targetAppUserId),
          listAdminOrganizations(supabase, appUser),
        ]);

      if (cancelled) return;

      const nextError = profileError ?? null;
      setError(nextError);
      setProfile(nextProfile);
      setRoleDraft(nextProfile?.role ?? "trainee");
      setOrganizationDraft(nextProfile?.organization_id ?? "");
      setOrganizations(nextOrgs);
      setSaveError((current) => current ?? (orgError && canManageIdentity ? orgError : null));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [appUser, canManageIdentity, canViewAdminPanel, reloadTick, targetAppUserId]);

  useEffect(() => {
    if (!addOrgOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creatingOrganization) setAddOrgOpen(false);
    };
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => addOrgNameInputRef.current?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [addOrgOpen, creatingOrganization]);

  const organizationOptions = useMemo(() => {
    const options = organizations.map((organization) => ({
      value: organization.id,
      label: organization.name,
    }));

    if (profile?.organization_id && !options.some((option) => option.value === profile.organization_id)) {
      options.unshift({
        value: profile.organization_id,
        label: profile.organization_name?.trim() || "Unknown organization",
      });
    }

    return options;
  }, [organizations, profile]);

  const resolvedOrganizationName = useMemo(() => {
    if (!profile?.organization_id) return null;
    const direct = profile.organization_name?.trim();
    if (direct) return direct;
    return organizations.find((organization) => organization.id === profile.organization_id)?.name ?? null;
  }, [organizations, profile]);

  const organizationMenuOptions = useMemo(
    () =>
      canManageIdentity
        ? [...organizationOptions, { value: ADD_ORGANIZATION_VALUE, label: "+ Add organization" }]
        : organizationOptions,
    [canManageIdentity, organizationOptions]
  );

  const copyId = async () => {
    await navigator.clipboard.writeText(targetAppUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openAddOrganizationModal = () => {
    setAddOrgModalError(null);
    setAddOrgName("");
    setAddOrgType("b2b");
    setAddOrgOpen(true);
  };

  const closeAddOrganizationModal = () => {
    if (creatingOrganization) return;
    setAddOrgOpen(false);
    setAddOrgModalError(null);
  };

  const submitAddOrganization = async () => {
    if (!appUser || !canManageIdentity) return;
    const name = addOrgName.trim();
    if (!name) {
      setAddOrgModalError("Enter an organization name.");
      return;
    }

    setCreatingOrganization(true);
    setAddOrgModalError(null);
    setSaveError(null);
    setSaveMessage(null);

    const supabase = createClient();
    const { organization, error: createError } = await createAdminOrganization(supabase, appUser, {
      name,
      orgType: addOrgType,
    });

    if (createError || !organization) {
      setAddOrgModalError(createError ?? "Could not create organization.");
      setCreatingOrganization(false);
      return;
    }

    setOrganizations((current) =>
      [...current, organization].sort((left, right) => left.name.localeCompare(right.name))
    );
    setOrganizationDraft(organization.id);
    setSaveMessage(`Added ${organization.name}.`);
    setCreatingOrganization(false);
    setAddOrgOpen(false);
    setAddOrgName("");
  };

  const handleOrganizationChange = (nextValue: string) => {
    if (nextValue === ADD_ORGANIZATION_VALUE) {
      openAddOrganizationModal();
      return;
    }
    setOrganizationDraft(nextValue);
  };

  const saveIdentity = async () => {
    if (!profile) return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    const supabase = createClient();
    const { error: updateError } = await updateAdminPersonIdentity(supabase, appUser, {
      targetAppUserId: profile.id,
      role: roleDraft,
      organizationId: organizationDraft,
    });

    if (updateError) {
      setSaveError(updateError);
      setSaving(false);
      return;
    }

    setSaveMessage("Saved.");
    setSaving(false);
    if (profile.id === appUser?.id) {
      await refresh(false);
    }
    setReloadTick((tick) => tick + 1);
  };

  if (actorLoading || loading) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <div className="h-7 w-40 animate-pulse rounded-[0.8rem] bg-slate-200" />
        <div className="workspace-shell space-y-4 p-5">
          <div className="h-24 animate-pulse rounded-[1.2rem] bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-[1rem] bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!canViewAdminPanel) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-sm text-slate-600">This page is only available to staff.</p>
        <Link href="/admin/review" className="text-sm text-[var(--brand-700)] hover:underline">
          Back to Review queue
        </Link>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <QueryErrorBanner
          message={error ?? "Could not load this profile."}
          onRetry={() => setReloadTick((tick) => tick + 1)}
        />
        <Link href="/admin/review" className="text-sm text-[var(--brand-700)] hover:underline">
          Back to Review queue
        </Link>
      </section>
    );
  }

  if (mode === "trainee" && profile.role !== "trainee") {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-sm text-slate-600">This person is not a trainee account.</p>
        <Link href={`/admin/people/${profile.id}`} className="text-sm text-[var(--brand-700)] hover:underline">
          Open staff account page
        </Link>
      </section>
    );
  }

  if (mode === "staff" && profile.role === "trainee") {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-sm text-slate-600">This person is a trainee account.</p>
        <Link href={`/admin/trainees/${profile.id}`} className="text-sm text-[var(--brand-700)] hover:underline">
          Open trainee profile
        </Link>
      </section>
    );
  }

  return (
    <section className="page-panel space-y-4 p-4 sm:p-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/review" className="hover:text-[var(--brand-700)] hover:underline">
          Review queue
        </Link>
        <span>/</span>
        <Link href="/admin/people" className="hover:text-[var(--brand-700)] hover:underline">
          People
        </Link>
        <span>/</span>
        <span className="text-slate-800">{displayNameForProfile(profile)}</span>
      </nav>

      <section className="workspace-shell space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/80 bg-[#d7e3ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_14px_rgba(15,23,42,0.08)]">
              <AppUserAvatar
                avatarField={profile.avatar_url}
                initials={displayNameForProfile(profile)
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("") || "U"}
                fallbackClassName="text-base font-bold"
                imgClassName="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`ui-badge ${activeBadgeClass(profile.is_active)}`}>
                  {profile.is_active === false ? "Inactive" : "Active"}
                </span>
                <span className="ui-badge ui-badge-neutral">{formatAppUserRoleLabel(profile.role)}</span>
                {resolvedOrganizationName ? (
                  <span className="ui-badge ui-badge-blue">{resolvedOrganizationName}</span>
                ) : null}
              </div>
              <h1 className="mt-3 truncate text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[1.55rem]">
                {displayNameForProfile(profile)}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{profile.email ?? "No email provided"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {profileField(
            "Account ID",
            <button
              type="button"
              onClick={() => void copyId()}
              className="group flex w-full items-start gap-2.5 cursor-copy text-left"
              title={copied ? "Copied" : "Copy account ID"}
            >
              <span className="min-w-0 flex-1 break-all font-mono text-xs leading-6 text-slate-900 transition group-hover:text-[var(--brand-700)]">
                {profile.id}
              </span>
              <span className="mt-[1px] inline-flex shrink-0 items-center text-slate-400 transition group-hover:text-slate-600">
                {copyIcon(copied)}
              </span>
            </button>
          )}
          {profileField("Role", canManageIdentity ? (
            <FilterSelect
              ariaLabel="Role"
              value={roleDraft}
              onChange={(nextValue) => setRoleDraft(nextValue as AppUserRole)}
              options={ROLE_OPTIONS}
              className="dark-input h-11 w-full"
            />
          ) : (
            formatAppUserRoleLabel(profile.role)
          ))}
          {profileField("Organization", canManageIdentity ? (
            <FilterSelect
              ariaLabel="Organization"
              value={organizationDraft}
              onChange={handleOrganizationChange}
              options={organizationOptions}
              menuOptions={organizationMenuOptions}
              className="dark-input h-11 w-full"
            />
          ) : (
            resolvedOrganizationName ?? "—"
          ))}
          {profileField("Last Login", formatDateTime(profile.last_login_at))}
          {profileField("Member Since", formatDateTime(profile.created_at))}
          {profileField("Provider", profile.provider ?? "—")}
          {profileField("Country", profile.country_name ?? "—")}
          {profileField("Status", profile.status ?? "—")}
        </div>

        {canManageIdentity ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
            {saveError ? <span className="text-sm font-medium text-rose-700">{saveError}</span> : null}
            {creatingOrganization ? <span className="text-sm font-medium text-slate-500">Creating organization…</span> : null}
            {saveMessage ? <span className="text-sm font-medium text-emerald-700">{saveMessage}</span> : null}
            <button
              type="button"
              onClick={() => void saveIdentity()}
              disabled={
                saving ||
                creatingOrganization ||
                !organizationDraft ||
                (roleDraft === profile.role && organizationDraft === (profile.organization_id ?? ""))
              }
              className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
            >
              {saving ? "Saving…" : "Save identity"}
            </button>
          </div>
        ) : null}
      </section>

      {mode === "trainee" ? <AdminTraineeWorkspacePanel traineeAppUserId={profile.id} /> : null}

      <AdminAppUserActivityLog appUserId={profile.id} refreshKey={reloadTick} />

      {addOrgOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddOrganizationModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={addOrgDialogTitleId}
            className="w-full max-w-md overflow-hidden rounded-[1.2rem] border border-slate-200/95 bg-[linear-gradient(180deg,rgb(255_255_255/_0.99),rgb(248_250_252/_0.99))] shadow-[0_24px_56px_rgba(15,23,42,0.22)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200/80 px-5 py-4">
              <h2 id={addOrgDialogTitleId} className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                New organization
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Create an org, then assign this person to it. Only super admins can add organizations.
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="add-org-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Name
                </label>
                <input
                  ref={addOrgNameInputRef}
                  id="add-org-name"
                  type="text"
                  value={addOrgName}
                  onChange={(e) => setAddOrgName(e.target.value)}
                  autoComplete="organization"
                  placeholder="e.g. Acme Risk Academy"
                  disabled={creatingOrganization}
                  className="dark-input h-11 w-full px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="add-org-type" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Type
                </label>
                <select
                  id="add-org-type"
                  value={addOrgType}
                  onChange={(e) => setAddOrgType(e.target.value as OrganizationRow["org_type"])}
                  disabled={creatingOrganization}
                  className="dark-input h-11 w-full cursor-pointer px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60"
                >
                  {ADD_ORG_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {addOrgModalError ? (
                <p className="text-sm font-medium text-rose-700" role="alert">
                  {addOrgModalError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200/80 px-5 py-4">
              <button
                type="button"
                onClick={closeAddOrganizationModal}
                disabled={creatingOrganization}
                className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingOrganization || !addOrgName.trim()}
                onClick={() => void submitAddOrganization()}
                className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
              >
                {creatingOrganization ? "Creating…" : "Create organization"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
