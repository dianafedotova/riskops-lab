"use client";

import { BrandedDatePicker } from "@/components/branded-date-picker";
import { FilterSelect } from "@/components/filter-select";
import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import {
  comparePhoneDialLabels,
  getDialCodeForCountryIso,
  labelForPhoneDialCode,
} from "@/lib/phone-dial-codes";
import { SIMULATOR_USER_TIER_VALUES } from "@/lib/simulator-user-options";
import { createSimulatorUser, updateSimulatorUser } from "@/lib/services/simulator-users";
import { createClient } from "@/lib/supabase";
import type { AppUserRow, CreateSimulatorUserInput, UserRow } from "@/lib/types";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useMemo, useState } from "react";

type SimulatorUserFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  fieldset: "minimal" | "full";
  initialValue?: Partial<UserRow> | null;
  submitLabel?: string;
  onSaved?: (user: UserRow) => void;
  onCancel?: () => void;
};

type UserFormValues = {
  email: string;
  first_name: string;
  last_name: string;
  country_code: string;
  country_name: string;
  phone_country_code: string;
  phone_last_two: string;
  tier: string;
  status: string;
  risk_level: string;
  registration_date: string;
  nationality: string;
  date_of_birth: string;
  address_text: string;
  proof_of_identity: string;
  proof_of_address: string;
  source_of_funds_docs: string;
  occupation: string;
  employment_status: string;
  annual_income_min_usd: string;
  annual_income_max_usd: string;
  primary_source_of_funds: string;
  selfie_path: string;
};

const USER_STATUS_OPTIONS = [
  { value: "", label: "Select status" },
  { value: "active", label: "Active" },
  { value: "not_active", label: "Not active" },
  { value: "restricted", label: "Restricted" },
  { value: "blocked", label: "Blocked" },
  { value: "closed", label: "Closed" },
] as const;

const USER_RISK_OPTIONS = [
  { value: "", label: "Select risk" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const USER_TIER_OPTIONS = [
  { value: "", label: "Select tier" },
  ...SIMULATOR_USER_TIER_VALUES.map((tier) => ({ value: tier, label: tier })),
] as const;

/** Allowed dial codes in the phone prefix dropdown (labels come from `country-codes-list`). */
const PHONE_DIAL_VALUES = [
  "+1",
  "+20",
  "+27",
  "+30",
  "+31",
  "+32",
  "+33",
  "+34",
  "+36",
  "+39",
  "+40",
  "+41",
  "+43",
  "+44",
  "+45",
  "+46",
  "+47",
  "+48",
  "+49",
  "+52",
  "+54",
  "+55",
  "+56",
  "+57",
  "+58",
  "+60",
  "+61",
  "+62",
  "+63",
  "+64",
  "+65",
  "+66",
  "+81",
  "+82",
  "+84",
  "+86",
  "+90",
  "+91",
  "+92",
  "+93",
  "+94",
  "+95",
  "+98",
  "+212",
  "+213",
  "+216",
  "+218",
  "+220",
  "+221",
  "+223",
  "+224",
  "+225",
  "+226",
  "+227",
  "+228",
  "+229",
  "+230",
  "+231",
  "+232",
  "+233",
  "+234",
  "+241",
  "+243",
  "+244",
  "+248",
  "+249",
  "+250",
  "+251",
  "+252",
  "+253",
  "+254",
  "+255",
  "+256",
  "+257",
  "+258",
  "+260",
  "+261",
  "+263",
  "+264",
  "+265",
  "+266",
  "+267",
  "+268",
  "+269",
  "+297",
  "+298",
  "+299",
  "+351",
  "+352",
  "+353",
  "+354",
  "+355",
  "+356",
  "+357",
  "+358",
  "+359",
  "+370",
  "+371",
  "+372",
  "+380",
  "+385",
  "+386",
  "+387",
  "+389",
  "+420",
  "+421",
  "+423",
  "+852",
  "+853",
  "+855",
  "+856",
  "+880",
  "+886",
  "+961",
  "+962",
  "+963",
  "+964",
  "+965",
  "+966",
  "+967",
  "+968",
  "+970",
  "+971",
  "+972",
  "+973",
  "+974",
  "+975",
  "+976",
  "+977",
  "+992",
  "+993",
  "+994",
  "+995",
  "+996",
  "+998",
] as const;

const PHONE_DIAL_VALUE_SET = new Set<string>(PHONE_DIAL_VALUES);

function toInputValue(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function splitFullName(value: string | null | undefined): { firstName: string; lastName: string } {
  const normalized = (value ?? "").trim();
  if (!normalized) return { firstName: "", lastName: "" };

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "" };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function parsePhoneParts(value: string | null | undefined): { countryCode: string; lastTwo: string } {
  const normalized = (value ?? "").trim();
  if (!normalized) return { countryCode: "", lastTwo: "" };

  const countryCode = normalized.match(/^\+\d{1,4}/)?.[0] ?? "";
  const digitsOnly = normalized.replace(/\D/g, "");
  const lastTwo = digitsOnly.slice(-2);

  return { countryCode, lastTwo };
}

function buildMaskedPhoneValue(lastTwo: string): string {
  const digits = lastTwo.replace(/\D/g, "").slice(-2);
  return digits ? `******${digits}` : "";
}

function buildUserFormValues(user?: Partial<UserRow> | null): UserFormValues {
  const derivedName = splitFullName(user?.full_name);
  const phoneParts = parsePhoneParts(user?.phone);

  return {
    email: toInputValue(user?.email),
    first_name: toInputValue(user?.first_name) || derivedName.firstName,
    last_name: toInputValue(user?.last_name) || derivedName.lastName,
    country_code: toInputValue(user?.country_code),
    country_name: toInputValue(user?.country_name),
    phone_country_code: phoneParts.countryCode,
    phone_last_two: phoneParts.lastTwo,
    tier: toInputValue(user?.tier),
    status: toInputValue(user?.status),
    risk_level: toInputValue(user?.risk_level).toLowerCase(),
    registration_date: toInputValue(user?.registration_date),
    nationality: toInputValue(user?.nationality),
    date_of_birth: toInputValue(user?.date_of_birth),
    address_text: toInputValue(user?.address_text),
    proof_of_identity: toInputValue(user?.proof_of_identity),
    proof_of_address: toInputValue(user?.proof_of_address),
    source_of_funds_docs: toInputValue(user?.source_of_funds_docs),
    occupation: toInputValue(user?.occupation),
    employment_status: toInputValue(user?.employment_status),
    annual_income_min_usd: toInputValue(user?.annual_income_min_usd),
    annual_income_max_usd: toInputValue(user?.annual_income_max_usd),
    primary_source_of_funds: toInputValue(user?.primary_source_of_funds),
    selfie_path: toInputValue(user?.selfie_path),
  };
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toUserInput(values: UserFormValues): CreateSimulatorUserInput {
  const firstName = toNullableString(values.first_name);
  const lastName = toNullableString(values.last_name);
  const fullName = [firstName, lastName].filter((part): part is string => Boolean(part)).join(" ").trim();
  const phoneCode = toNullableString(values.phone_country_code);
  const phoneLastTwo = values.phone_last_two.replace(/\D/g, "").slice(-2);
  const phoneValue =
    phoneCode || phoneLastTwo
      ? `${phoneCode ?? ""}${phoneCode && phoneLastTwo ? " " : ""}${buildMaskedPhoneValue(phoneLastTwo)}`.trim()
      : null;

  return {
    email: values.email,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    country_code: toNullableString(values.country_code),
    country_name: toNullableString(values.country_name),
    tier: toNullableString(values.tier),
    status: toNullableString(values.status),
    risk_level: toNullableString(values.risk_level),
    registration_date: toNullableString(values.registration_date),
    phone: phoneValue,
    nationality: toNullableString(values.nationality),
    date_of_birth: toNullableString(values.date_of_birth),
    address_text: toNullableString(values.address_text),
    proof_of_identity: toNullableString(values.proof_of_identity),
    proof_of_address: toNullableString(values.proof_of_address),
    source_of_funds_docs: toNullableString(values.source_of_funds_docs),
    occupation: toNullableString(values.occupation),
    employment_status: toNullableString(values.employment_status),
    annual_income_min_usd: toNullableString(values.annual_income_min_usd),
    annual_income_max_usd: toNullableString(values.annual_income_max_usd),
    primary_source_of_funds: toNullableString(values.primary_source_of_funds),
    selfie_path: toNullableString(values.selfie_path),
  };
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`dark-input h-11 w-full px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      data-amp-mask=""
      className={`dark-input min-h-[112px] w-full px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function SimulatorUserForm({
  viewer,
  mode,
  fieldset,
  initialValue,
  submitLabel,
  onSaved,
  onCancel,
}: SimulatorUserFormProps) {
  const [values, setValues] = useState<UserFormValues>(() => buildUserFormValues(initialValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const countrySelectOptions = useMemo(() => {
    const normalizedCode = values.country_code.trim().toUpperCase();
    const normalizedName = values.country_name.trim();
    const baseOptions = COUNTRY_OPTIONS.map((country) => ({
      value: country.code,
      label: country.name,
    }));

    if (!normalizedCode && normalizedName && !baseOptions.some((option) => option.label === normalizedName)) {
      return [{ value: `custom:${normalizedName}`, label: normalizedName }, ...baseOptions];
    }

    return baseOptions;
  }, [values.country_code, values.country_name]);

  const nationalityOptions = useMemo(() => {
    const normalizedNationality = values.nationality.trim();
    const baseOptions = COUNTRY_OPTIONS.map((country) => ({
      value: country.name,
      label: country.name,
    }));

    if (
      normalizedNationality &&
      !baseOptions.some((option) => option.value.toLowerCase() === normalizedNationality.toLowerCase())
    ) {
      return [{ value: normalizedNationality, label: normalizedNationality }, ...baseOptions];
    }

    return baseOptions;
  }, [values.nationality]);

  const phoneCodeOptions = useMemo(() => {
    const rows: Array<{ value: string; label: string }> = PHONE_DIAL_VALUES.map((dial) => ({
      value: dial,
      label: labelForPhoneDialCode(dial),
    }));
    const custom = values.phone_country_code.trim();
    if (custom && !PHONE_DIAL_VALUE_SET.has(custom)) {
      rows.push({ value: custom, label: labelForPhoneDialCode(custom) });
    }
    rows.sort((a, b) => comparePhoneDialLabels(a.label, b.label));
    return [{ value: "", label: "Code" }, ...rows];
  }, [values.phone_country_code]);

  const tierOptions = useMemo(() => {
    const base: Array<{ value: string; label: string }> = USER_TIER_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    }));
    if (!values.tier || base.some((option) => option.value === values.tier)) {
      return base;
    }
    return [...base, { value: values.tier, label: values.tier }];
  }, [values.tier]);

  const handleChange = (field: keyof UserFormValues, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const countrySelectValue = values.country_code.trim()
    ? values.country_code.trim().toUpperCase()
    : values.country_name.trim()
      ? `custom:${values.country_name.trim()}`
      : "";

  const handleCountryChange = (nextValue: string) => {
    if (!nextValue) {
      setValues((current) => ({
        ...current,
        country_code: "",
        country_name: "",
        phone_country_code: "",
      }));
      return;
    }

    if (nextValue.startsWith("custom:")) {
      const customCountryName = nextValue.slice("custom:".length);
      setValues((current) => ({
        ...current,
        country_code: "",
        country_name: customCountryName,
      }));
      return;
    }

    const country = COUNTRY_OPTIONS.find((option) => option.code === nextValue);
    const phoneCode = getDialCodeForCountryIso(nextValue);
    setValues((current) => ({
      ...current,
      country_code: nextValue,
      country_name: country?.name ?? "",
      phone_country_code: phoneCode || current.phone_country_code,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const input = toUserInput(values);
    const result =
      mode === "create"
        ? await createSimulatorUser(supabase, viewer, input)
        : await updateSimulatorUser(supabase, viewer, {
            id: String(initialValue?.id ?? ""),
            ...input,
          });

    if (result.error || !result.user) {
      setError(result.error ?? "Could not save this user.");
      setSaving(false);
      return;
    }

    setSuccessMessage(mode === "create" ? "User created." : "User updated.");
    setSaving(false);
    onSaved?.(result.user);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field htmlFor="sim-user-first-name" label="First Name">
          <Input
            id="sim-user-first-name"
            type="text"
            autoComplete="given-name"
            required
            value={values.first_name}
            onChange={(event) => handleChange("first_name", event.target.value)}
            placeholder="Casey"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-user-email" label="Email">
          <Input
            id="sim-user-email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
            placeholder="name@example.com"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-user-last-name" label="Last Name">
          <Input
            id="sim-user-last-name"
            type="text"
            autoComplete="family-name"
            value={values.last_name}
            onChange={(event) => handleChange("last_name", event.target.value)}
            placeholder="Doe"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-user-country-code" label="Country">
          <FilterSelect
            id="sim-user-country-code"
            ariaLabel="Country"
            disabled={saving}
            value={countrySelectValue}
            onChange={handleCountryChange}
            options={[{ value: "", label: "Select country" }, ...countrySelectOptions]}
            className="h-11 rounded-[0.95rem]"
            menuClassName="max-h-72"
          />
        </Field>
        <Field htmlFor="sim-user-tier" label="Tier">
          <FilterSelect
            id="sim-user-tier"
            ariaLabel="Tier"
            disabled={saving}
            value={values.tier}
            onChange={(nextValue) => handleChange("tier", nextValue)}
            options={tierOptions}
            className="h-11 rounded-[0.95rem]"
          />
        </Field>
        <Field htmlFor="sim-user-status" label="Status">
          <FilterSelect
            id="sim-user-status"
            ariaLabel="Status"
            disabled={saving}
            value={values.status}
            onChange={(nextValue) => handleChange("status", nextValue)}
            options={[...USER_STATUS_OPTIONS]}
            className="h-11 rounded-[0.95rem]"
          />
        </Field>
        <Field htmlFor="sim-user-risk" label="Risk Level">
          <FilterSelect
            id="sim-user-risk"
            ariaLabel="Risk level"
            disabled={saving}
            value={values.risk_level}
            onChange={(nextValue) => handleChange("risk_level", nextValue)}
            options={[...USER_RISK_OPTIONS]}
            className="h-11 rounded-[0.95rem]"
          />
        </Field>
        <Field htmlFor="sim-user-registration-date" label="Registration Date">
          <BrandedDatePicker
            id="sim-user-registration-date"
            value={values.registration_date}
            onChange={(nextValue) => handleChange("registration_date", nextValue)}
            placeholder="Select registration date"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-user-date-of-birth" label="Date of Birth">
          <BrandedDatePicker
            id="sim-user-date-of-birth"
            value={values.date_of_birth}
            onChange={(nextValue) => handleChange("date_of_birth", nextValue)}
            placeholder="Select date of birth"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-user-phone-tail" label="Phone">
          <div className="grid grid-cols-[minmax(12.5rem,40%)_minmax(0,1fr)] gap-2">
            <FilterSelect
              id="sim-user-phone-code"
              ariaLabel="Phone country code"
              disabled={saving}
              value={values.phone_country_code}
              onChange={(nextValue) => handleChange("phone_country_code", nextValue)}
              options={phoneCodeOptions}
              className="h-11 rounded-[0.95rem]"
            />
            <Input
              id="sim-user-phone-tail"
              type="text"
              inputMode="numeric"
              autoComplete="tel-national"
              value={buildMaskedPhoneValue(values.phone_last_two)}
              onChange={(event) => handleChange("phone_last_two", event.target.value.replace(/\D/g, "").slice(-2))}
              placeholder="******00"
              disabled={saving}
            />
          </div>
        </Field>
        <Field htmlFor="sim-user-nationality" label="Nationality">
          <FilterSelect
            id="sim-user-nationality"
            ariaLabel="Nationality"
            disabled={saving}
            value={values.nationality}
            onChange={(nextValue) => handleChange("nationality", nextValue)}
            options={[{ value: "", label: "Select nationality" }, ...nationalityOptions]}
            className="h-11 rounded-[0.95rem]"
            menuClassName="max-h-72"
          />
        </Field>
      </div>

      {fieldset === "full" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field htmlFor="sim-user-selfie-path" label="Selfie Path">
              <Input
                id="sim-user-selfie-path"
                type="text"
                value={values.selfie_path}
                onChange={(event) => handleChange("selfie_path", event.target.value)}
                placeholder="uploads/selfie.png"
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-occupation" label="Occupation">
              <Input
                id="sim-user-occupation"
                type="text"
                value={values.occupation}
                onChange={(event) => handleChange("occupation", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-employment-status" label="Employment Status">
              <Input
                id="sim-user-employment-status"
                type="text"
                value={values.employment_status}
                onChange={(event) => handleChange("employment_status", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-primary-sof" label="Primary Source of Funds">
              <Input
                id="sim-user-primary-sof"
                type="text"
                value={values.primary_source_of_funds}
                onChange={(event) => handleChange("primary_source_of_funds", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-proof-of-identity" label="Proof of Identity">
              <Input
                id="sim-user-proof-of-identity"
                type="text"
                value={values.proof_of_identity}
                onChange={(event) => handleChange("proof_of_identity", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-proof-of-address" label="Proof of Address">
              <Input
                id="sim-user-proof-of-address"
                type="text"
                value={values.proof_of_address}
                onChange={(event) => handleChange("proof_of_address", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-source-of-funds-docs" label="Source of Funds Docs">
              <Input
                id="sim-user-source-of-funds-docs"
                type="text"
                value={values.source_of_funds_docs}
                onChange={(event) => handleChange("source_of_funds_docs", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-annual-income-min" label="Annual Income Min USD">
              <Input
                id="sim-user-annual-income-min"
                type="number"
                step="0.01"
                value={values.annual_income_min_usd}
                onChange={(event) => handleChange("annual_income_min_usd", event.target.value)}
                disabled={saving}
              />
            </Field>
            <Field htmlFor="sim-user-annual-income-max" label="Annual Income Max USD">
              <Input
                id="sim-user-annual-income-max"
                type="number"
                step="0.01"
                value={values.annual_income_max_usd}
                onChange={(event) => handleChange("annual_income_max_usd", event.target.value)}
                disabled={saving}
              />
            </Field>
          </div>

          <Field htmlFor="sim-user-address" label="Address">
            <Textarea
              id="sim-user-address"
              value={values.address_text}
              onChange={(event) => handleChange("address_text", event.target.value)}
              disabled={saving}
              placeholder="Street, city, region"
            />
          </Field>
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        {error ? <p className="mr-auto text-sm font-medium text-rose-700">{error}</p> : null}
        {!error && successMessage ? <p className="mr-auto text-sm font-medium text-emerald-700">{successMessage}</p> : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create user" : "Save user")}
        </button>
      </div>
    </form>
  );
}
