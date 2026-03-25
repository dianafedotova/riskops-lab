"use client";

import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

type ProfileDetailsFormProps = {
  appUser: AppUserRow | null;
  authEmail: string;
};

function buildFullName(first: string, last: string): string | null {
  const t = `${first.trim()} ${last.trim()}`.trim();
  return t.length ? t : null;
}

const controlClass =
  "h-9 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-[#5e8d9c] focus:outline-none focus:ring-1 focus:ring-[#5e8d9c]/40";

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
  const countryId = useId();
  const [firstName, setFirstName] = useState(appUser?.first_name ?? "");
  const [lastName, setLastName] = useState(appUser?.last_name ?? "");
  const [countryCode, setCountryCode] = useState(appUser?.country_code?.trim() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(appUser?.first_name ?? "");
    setLastName(appUser?.last_name ?? "");
    setCountryCode(appUser?.country_code?.trim() ?? "");
  }, [appUser?.first_name, appUser?.last_name, appUser?.country_code]);

  const selectedCountryName =
    COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.name ?? null;

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const full_name = buildFullName(firstName, lastName);

      const { error: upErr } = await supabase
        .from("app_users")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name,
          country_code: countryCode.trim() || null,
          country_name: selectedCountryName,
        })
        .eq("auth_user_id", user.id);

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
  const roleDisplay = appUser.role
    ? appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)
    : "—";

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
          <select
            id={countryId}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={controlClass}
          >
            <option value="">—</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>,
          countryId,
        )}
        {profileFieldRow("Email", emailDisplay)}
        {profileFieldRow("Role", roleDisplay)}
        {profileFieldRow("Member since", formatDateTime(appUser.created_at ?? null))}
      </dl>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-[#2d5f70] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#234d5c] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message ? <span className="text-sm font-medium text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm font-medium text-rose-700">{error}</span> : null}
      </div>
    </form>
  );
}
