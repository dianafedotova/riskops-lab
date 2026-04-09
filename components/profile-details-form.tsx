"use client";

import { FilterSelect } from "@/components/filter-select";
import { formatAppUserRoleLabel } from "@/lib/app-user-role";
import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

type ProfileDetailsFormProps = {
  appUser: AppUserRow | null;
  authEmail: string;
};

const controlClass = "dark-input h-10 w-full max-w-xs px-4 text-sm font-medium text-slate-900";
const countryOptions = [{ value: "", label: "—" }, ...COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.name }))];

function profileFieldRow(label: string, control: React.ReactNode, htmlFor?: string) {
  return (
    <div className="border-b border-slate-200/90 py-2.5 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-stretch sm:gap-4 sm:py-2.5">
      <dt className="field-label mb-0.5 flex items-center leading-tight sm:mb-0 sm:min-h-9 sm:py-px">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-center leading-tight">
            {label}
          </label>
        ) : (
          label
        )}
      </dt>
      <dd className="flex min-h-9 min-w-0 items-center text-sm font-medium text-slate-900">{control}</dd>
    </div>
  );
}

export function ProfileDetailsForm({ appUser, authEmail }: ProfileDetailsFormProps) {
  const router = useRouter();
  const firstNameId = useId();
  const lastNameId = useId();
  const [firstName, setFirstName] = useState(appUser?.first_name ?? "");
  const [lastName, setLastName] = useState(appUser?.last_name ?? "");
  const [countryCode, setCountryCode] = useState(appUser?.country_code?.trim() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!appUser) {
      setError("Profile row not found.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const { error: upErr } = await supabase.from("app_user_profiles").upsert(
        {
          app_user_id: appUser.id,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          country_code: countryCode.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "app_user_id" }
      );

      if (upErr) throw upErr;
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!appUser) {
    return (
      <p className="mt-4 text-sm text-slate-600">
        Profile details can be edited after your account is linked to the app.
      </p>
    );
  }

  const emailDisplay = (appUser.email ?? authEmail)?.trim() || "—";
  const roleDisplay = appUser.role ? formatAppUserRoleLabel(appUser.role) : "—";

  return (
    <form onSubmit={(e) => void onSave(e)} className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Edit profile</h2>
      <dl className="mt-4 border-t border-slate-200/90">
        {profileFieldRow(
          "First name",
          <input
            id={firstNameId}
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className={controlClass}
          />,
          firstNameId,
        )}
        {profileFieldRow(
          "Last name",
          <input
            id={lastNameId}
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className={controlClass}
          />,
          lastNameId,
        )}
        {profileFieldRow(
          "Country",
          <FilterSelect
            ariaLabel="Country"
            value={countryCode}
            onChange={setCountryCode}
            options={countryOptions}
            className={controlClass}
          />,
        )}
        {profileFieldRow("Email", emailDisplay)}
        {profileFieldRow("Role", roleDisplay)}
        {profileFieldRow("Member since", formatDateTime(appUser.created_at ?? null))}
      </dl>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="ui-btn ui-btn-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message ? <span className="text-sm font-medium text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm font-medium text-rose-700">{error}</span> : null}
      </div>
    </form>
  );
}

