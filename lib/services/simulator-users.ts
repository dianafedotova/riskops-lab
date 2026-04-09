import { canSeeStaffActionControls } from "@/lib/permissions/checks";
import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import { isSimulatorUserTier, SIMULATOR_USER_TIER_VALUES } from "@/lib/simulator-user-options";
import type {
  AppUserRow,
  CreateSimulatorUserInput,
  ImportedSimulatorUserRow,
  UpdateSimulatorUserInput,
  UserRow,
  UsersCsvRow,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminEntitySearchOption } from "@/lib/services/admin-review-cases";
import { isSuperAdmin } from "@/lib/app-user-role";
import {
  buildCsvRecord,
  duplicateRowErrors,
  normalizeCsvHeaders,
  parseCsvTable,
} from "@/lib/services/simulator-csv";

const USER_MUTATION_SELECT =
  "id, email, full_name, first_name, last_name, country_code, country_name, tier, status, risk_level, registration_date, phone, nationality, date_of_birth, address_text, proof_of_identity, proof_of_address, source_of_funds_docs, current_balance_usd, total_turnover_usd, occupation, employment_status, annual_income_min_usd, annual_income_max_usd, primary_source_of_funds, selfie_path, created_at, updated_at, organization_id" as const;
const USER_SEARCH_SELECT = "id, email, full_name, organization_id" as const;

const USER_REQUIRED_HEADERS = ["email", "full_name"] as const;
const USER_ALLOWED_HEADERS = [
  ...USER_REQUIRED_HEADERS,
  "first_name",
  "last_name",
  "country_code",
  "country_name",
  "tier",
  "status",
  "risk_level",
  "registration_date",
  "phone",
  "nationality",
  "date_of_birth",
  "address_text",
  "proof_of_identity",
  "proof_of_address",
  "source_of_funds_docs",
  "occupation",
  "employment_status",
  "annual_income_min_usd",
  "annual_income_max_usd",
  "primary_source_of_funds",
  "selfie_path",
] as const;

const USER_STATUS_VALUES = ["active", "not_active", "restricted", "blocked", "closed"] as const;
const USER_RISK_VALUES = ["low", "medium", "high"] as const;

type StaffViewer = Pick<AppUserRow, "id" | "role" | "organization_id"> | null | undefined;

type NormalizedUserInput = Omit<CreateSimulatorUserInput, "email" | "full_name"> & {
  email: string;
  full_name: string;
  status: string | null;
  risk_level: string | null;
};

const COUNTRY_NAME_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.name]));

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function generateUuidLikeValue(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `sim-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createSimulatorUserIdentifiers() {
  const id = generateUuidLikeValue();
  return {
    id,
    external_user_id: id,
  };
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
}

function normalizeDateOnly(value: string | null | undefined, fieldLabel: string, errors: string[]): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    errors.push(`${fieldLabel} must use YYYY-MM-DD.`);
    return null;
  }
  return trimmed;
}

function normalizeNumber(value: number | string | null | undefined, fieldLabel: string, errors: string[]): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`${fieldLabel} must be a valid number.`);
      return null;
    }
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldLabel} must be a valid number.`);
    return null;
  }
  return parsed;
}

function normalizeUserStatus(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) return null;
  if ((USER_STATUS_VALUES as readonly string[]).includes(trimmed)) return trimmed;
  errors.push(`Status must be one of: ${USER_STATUS_VALUES.join(", ")}.`);
  return null;
}

function normalizeRiskLevel(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) return null;
  if ((USER_RISK_VALUES as readonly string[]).includes(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  errors.push(`Risk level must be one of: ${USER_RISK_VALUES.join(", ")}.`);
  return null;
}

function normalizeTier(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  if (isSimulatorUserTier(trimmed)) return trimmed;
  errors.push(`Tier must be one of: ${SIMULATOR_USER_TIER_VALUES.join(", ")}.`);
  return null;
}

function deriveCountryName(countryCode: string | null, explicitCountryName: string | null): string | null {
  if (explicitCountryName) return explicitCountryName;
  if (!countryCode) return null;
  return COUNTRY_NAME_BY_CODE.get(countryCode.toUpperCase()) ?? null;
}

function splitFullNameParts(value: string | null): { firstName: string | null; lastName: string | null } {
  if (!value) return { firstName: null, lastName: null };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

function ensureStaffViewer(viewer: StaffViewer): string | null {
  if (!canSeeStaffActionControls(viewer?.role)) return "Staff access is required.";
  if (!viewer?.organization_id) return "Current staff organization is missing.";
  return null;
}

function normalizeUserInput(
  input: CreateSimulatorUserInput | UpdateSimulatorUserInput
): { value: NormalizedUserInput | null; errors: string[] } {
  const errors: string[] = [];
  const email = normalizeEmail(input.email);
  const explicitFullName = normalizeText(input.full_name);
  const explicitFirstName = normalizeText(input.first_name);
  const explicitLastName = normalizeText(input.last_name);
  const synthesizedFullName =
    [explicitFirstName, explicitLastName].filter((part): part is string => Boolean(part)).join(" ").trim() || null;
  const fullName = explicitFullName ?? synthesizedFullName;
  const derivedNameParts = splitFullNameParts(fullName);
  const firstName = explicitFirstName ?? derivedNameParts.firstName;
  const lastName = explicitLastName ?? derivedNameParts.lastName;

  if (!email) {
    errors.push("Email is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email must be valid.");
  }

  if (!fullName) {
    errors.push("Full name is required.");
  }

  const countryCode = normalizeText(input.country_code)?.toUpperCase() ?? null;
  const countryName = deriveCountryName(countryCode, normalizeText(input.country_name));
  const status = normalizeUserStatus(input.status, errors);
  const riskLevel = normalizeRiskLevel(input.risk_level, errors);

  const value: NormalizedUserInput | null =
    errors.length > 0
      ? null
      : {
          email: email!,
          full_name: fullName!,
          first_name: firstName,
          last_name: lastName,
          country_code: countryCode,
          country_name: countryName,
          tier: normalizeTier(input.tier, errors),
          status,
          risk_level: riskLevel,
          registration_date: normalizeDateOnly(input.registration_date, "Registration date", errors),
          phone: normalizeText(input.phone),
          nationality: normalizeText(input.nationality),
          date_of_birth: normalizeDateOnly(input.date_of_birth, "Date of birth", errors),
          address_text: normalizeText(input.address_text),
          proof_of_identity: normalizeText(input.proof_of_identity),
          proof_of_address: normalizeText(input.proof_of_address),
          source_of_funds_docs: normalizeText(input.source_of_funds_docs),
          occupation: normalizeText(input.occupation),
          employment_status: normalizeText(input.employment_status),
          annual_income_min_usd: normalizeNumber(input.annual_income_min_usd, "Annual income minimum", errors),
          annual_income_max_usd: normalizeNumber(input.annual_income_max_usd, "Annual income maximum", errors),
          primary_source_of_funds: normalizeText(input.primary_source_of_funds),
          selfie_path: normalizeText(input.selfie_path),
        };

  if (errors.length > 0) {
    return { value: null, errors };
  }

  if (
    value &&
    value.annual_income_min_usd != null &&
    value.annual_income_max_usd != null &&
    value.annual_income_min_usd > value.annual_income_max_usd
  ) {
    return {
      value: null,
      errors: ["Annual income minimum cannot be greater than annual income maximum."],
    };
  }

  return { value, errors };
}

function normalizeUserRow(row: UserRow): UserRow {
  return {
    ...row,
    id: String(row.id),
    email: String(row.email ?? ""),
    organization_id: row.organization_id ? String(row.organization_id) : null,
    external_user_id: row.external_user_id ? String(row.external_user_id) : null,
    full_name: row.full_name?.trim() || null,
    first_name: row.first_name?.trim() || null,
    last_name: row.last_name?.trim() || null,
    country_code: row.country_code?.trim() || null,
    country_name: row.country_name?.trim() || null,
    tier: row.tier?.trim() || null,
    status: row.status?.trim() || null,
    risk_level: row.risk_level?.trim() || null,
    registration_date: row.registration_date ?? null,
    phone: row.phone?.trim() || null,
    nationality: row.nationality?.trim() || null,
    date_of_birth: row.date_of_birth ?? null,
    address_text: row.address_text?.trim() || null,
    proof_of_identity: row.proof_of_identity?.trim() || null,
    proof_of_address: row.proof_of_address?.trim() || null,
    source_of_funds_docs: row.source_of_funds_docs?.trim() || null,
    current_balance_usd: row.current_balance_usd ?? null,
    total_turnover_usd: row.total_turnover_usd ?? null,
    occupation: row.occupation?.trim() || null,
    employment_status: row.employment_status?.trim() || null,
    annual_income_min_usd: row.annual_income_min_usd ?? null,
    annual_income_max_usd: row.annual_income_max_usd ?? null,
    primary_source_of_funds: row.primary_source_of_funds?.trim() || null,
    selfie_path: row.selfie_path?.trim() || null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function createSimulatorUser(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateSimulatorUserInput
): Promise<{ user: UserRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { user: null, error: viewerError };

  const { value, errors } = normalizeUserInput(input);
  if (!value) {
    return { user: null, error: errors.join(" ") };
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      ...createSimulatorUserIdentifiers(),
      ...value,
      organization_id: viewer!.organization_id,
    })
    .select(USER_MUTATION_SELECT)
    .single();

  if (error) return { user: null, error: error.message };
  return { user: normalizeUserRow(data as UserRow), error: null };
}

export async function updateSimulatorUser(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateSimulatorUserInput
): Promise<{ user: UserRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { user: null, error: viewerError };

  const { value, errors } = normalizeUserInput(input);
  if (!value) {
    return { user: null, error: errors.join(" ") };
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      ...value,
      organization_id: viewer!.organization_id,
    })
    .eq("id", input.id)
    .select(USER_MUTATION_SELECT)
    .single();

  if (error) return { user: null, error: error.message };
  return { user: normalizeUserRow(data as UserRow), error: null };
}

export async function searchSimulatorUsers(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  query: string,
  limit = 20
): Promise<{ options: AdminEntitySearchOption[]; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { options: [], error: viewerError };

  const needle = query.trim().replace(/,/g, " ");
  if (!needle) return { options: [], error: null };

  const escaped = needle.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const pattern = `%${escaped}%`;
  let request = supabase
    .from("users")
    .select(USER_SEARCH_SELECT)
    .or(`id.ilike.${pattern},email.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(Math.max(1, Math.min(25, limit)));

  if (!isSuperAdmin(viewer?.role) && viewer?.organization_id) {
    request = request.eq("organization_id", viewer.organization_id);
  }

  const { data, error } = await request;
  if (error) return { options: [], error: error.message };

  const options = (((data as UserRow[] | null) ?? []).map((row) => {
    const name = (row.full_name ?? "").trim();
    const email = (row.email ?? "").trim();
    const label = name && email ? `${name} · ${email}` : name || email || String(row.id);
    return { id: String(row.id), label };
  })) as AdminEntitySearchOption[];

  return { options, error: null };
}

export function parseUsersCsv(text: string): { rows: UsersCsvRow[]; errors: string[] } {
  const parsed = parseCsvTable(text);
  if (parsed.error) return { rows: [], errors: [parsed.error] };
  if (parsed.rows.length === 0) return { rows: [], errors: ["CSV file is empty."] };

  const [headerRow, ...bodyRows] = parsed.rows;
  const headers = normalizeCsvHeaders(headerRow ?? []);
  const errors: string[] = [];

  if (headers.includes("id")) {
    errors.push("users.csv must not include an id column.");
  }

  for (const required of USER_REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push(`users.csv is missing required header: ${required}.`);
    }
  }

  const unknownHeaders = headers.filter(
    (header) => header && !(USER_ALLOWED_HEADERS as readonly string[]).includes(header)
  );
  if (unknownHeaders.length > 0) {
    errors.push(`users.csv has unsupported headers: ${unknownHeaders.join(", ")}.`);
  }

  const rows: UsersCsvRow[] = [];
  bodyRows.forEach((row, index) => {
    if (row.length > headers.length) {
      errors.push(`Row ${index + 2} has more values than headers.`);
      return;
    }
    rows.push(buildCsvRecord<UsersCsvRow>(headers, row));
  });

  return { rows, errors };
}

export function validateUsersCsv(rows: UsersCsvRow[]): {
  rows: CreateSimulatorUserInput[];
  errors: string[];
} {
  const normalizedRows: CreateSimulatorUserInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const { value, errors: rowErrors } = normalizeUserInput({
      email: row.email,
      full_name: row.full_name,
      first_name: row.first_name,
      last_name: row.last_name,
      country_code: row.country_code,
      country_name: row.country_name,
      tier: row.tier,
      status: row.status,
      risk_level: row.risk_level,
      registration_date: row.registration_date,
      phone: row.phone,
      nationality: row.nationality,
      date_of_birth: row.date_of_birth,
      address_text: row.address_text,
      proof_of_identity: row.proof_of_identity,
      proof_of_address: row.proof_of_address,
      source_of_funds_docs: row.source_of_funds_docs,
      occupation: row.occupation,
      employment_status: row.employment_status,
      annual_income_min_usd: row.annual_income_min_usd,
      annual_income_max_usd: row.annual_income_max_usd,
      primary_source_of_funds: row.primary_source_of_funds,
      selfie_path: row.selfie_path,
    });

    if (!value) {
      rowErrors.forEach((message) => {
        errors.push(`Row ${index + 2}: ${message}`);
      });
      return;
    }

    normalizedRows.push(value);
  });

  errors.push(
    ...duplicateRowErrors(normalizedRows, (row) =>
      JSON.stringify({
        email: row.email,
        full_name: row.full_name,
        registration_date: row.registration_date,
        phone: row.phone,
      })
    )
  );

  return { rows: errors.length === 0 ? normalizedRows : [], errors };
}

export async function importSimulatorUsersCsv(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  rows: CreateSimulatorUserInput[]
): Promise<{ created: ImportedSimulatorUserRow[]; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { created: [], error: viewerError };
  if (rows.length === 0) return { created: [], error: "No valid users to import." };

  const insertRows = rows.map((row) => {
    const { value } = normalizeUserInput(row);
    return {
      ...createSimulatorUserIdentifiers(),
      ...value!,
      organization_id: viewer!.organization_id,
    };
  });

  const { data, error } = await supabase
    .from("users")
    .insert(insertRows)
    .select("id, email, full_name");

  if (error) return { created: [], error: error.message };

  const created = (((data as ImportedSimulatorUserRow[] | null) ?? []).map((row) => ({
    id: String(row.id),
    email: row.email?.trim() || null,
    full_name: row.full_name?.trim() || null,
  })));

  return { created, error: null };
}
