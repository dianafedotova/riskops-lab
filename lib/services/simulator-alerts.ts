import {
  ensureStaffViewer,
  ensureVisibleUsers,
  normalizeDateTime,
  normalizeRequiredText,
  normalizeText,
  type StaffViewer,
} from "@/lib/services/simulator-shared";
import type {
  AlertRow,
  AlertsCsvRow,
  CreateSimulatorAlertInput,
  ImportedSimulatorAlertRow,
  UpdateSimulatorAlertInput,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCsvRecord,
  duplicateRowErrors,
  normalizeCsvHeaders,
  parseCsvTable,
} from "@/lib/services/simulator-csv";

const ALERT_MUTATION_SELECT =
  "id, internal_id, user_id, alert_type, severity, status, description, rule_code, rule_name, created_at, updated_at, alert_date, decision, organization_id" as const;

const ALERT_REQUIRED_HEADERS = ["user_id", "alert_type", "severity", "status"] as const;
const ALERT_ALLOWED_HEADERS = [
  ...ALERT_REQUIRED_HEADERS,
  "rule_code",
  "rule_name",
  "description",
  "created_at",
  "alert_date",
  "decision",
] as const;

const ALERT_SEVERITY_VALUES = ["low", "medium", "high"] as const;
const ALERT_STATUS_VALUES = ["open", "monitoring", "escalated", "closed"] as const;

type NormalizedAlertInput = {
  user_id: string;
  alert_type: string;
  severity: string;
  status: string;
  rule_code: string | null;
  rule_name: string | null;
  description: string | null;
  created_at: string | null;
  alert_date: string | null;
  decision: string | null;
};

function generateUuid(): string {
  const value = globalThis.crypto?.randomUUID?.();
  if (!value) {
    throw new Error("Secure UUID generation is unavailable in this runtime.");
  }
  return value;
}

function normalizeSeverity(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) {
    errors.push("Severity is required.");
    return null;
  }
  if ((ALERT_SEVERITY_VALUES as readonly string[]).includes(trimmed)) return trimmed;
  errors.push(`Severity must be one of: ${ALERT_SEVERITY_VALUES.join(", ")}.`);
  return null;
}

function normalizeStatus(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) {
    errors.push("Status is required.");
    return null;
  }
  if ((ALERT_STATUS_VALUES as readonly string[]).includes(trimmed)) return trimmed;
  errors.push(`Status must be one of: ${ALERT_STATUS_VALUES.join(", ")}.`);
  return null;
}

function normalizeDateOnly(value: string | null | undefined, fieldLabel: string, errors: string[]): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldLabel} must be a valid date.`);
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeAlertInput(
  input: CreateSimulatorAlertInput | UpdateSimulatorAlertInput
): { value: NormalizedAlertInput | null; errors: string[] } {
  const errors: string[] = [];
  const value = {
    user_id: normalizeRequiredText(input.user_id, "User", errors),
    alert_type: normalizeRequiredText(input.alert_type, "Alert type", errors),
    severity: normalizeSeverity(input.severity, errors),
    status: normalizeStatus(input.status, errors),
    rule_code: normalizeRequiredText(input.rule_code, "Rule code", errors),
    rule_name: normalizeText(input.rule_name),
    description: normalizeText(input.description),
    created_at: normalizeDateTime(input.created_at, "Created at", errors),
    alert_date: normalizeDateOnly(input.alert_date, "Alert date", errors),
    decision: normalizeText(input.decision),
  };

  if (errors.length > 0) return { value: null, errors };

  return {
    value: {
      user_id: value.user_id!,
      alert_type: value.alert_type!,
      severity: value.severity!,
      status: value.status!,
      rule_code: value.rule_code,
      rule_name: value.rule_name,
      description: value.description,
      created_at: value.created_at,
      alert_date: value.alert_date,
      decision: value.decision,
    },
    errors,
  };
}

function normalizeAlertRow(row: AlertRow): AlertRow {
  return {
    ...row,
    id: String(row.id),
    internal_id: row.internal_id ? String(row.internal_id) : null,
    user_id: row.user_id ? String(row.user_id) : null,
    alert_type: row.alert_type?.trim() || null,
    type: row.type?.trim() || null,
    severity: row.severity?.trim() || null,
    status: row.status?.trim() || null,
    description: row.description?.trim() || null,
    rule_code: row.rule_code?.trim() || null,
    rule_name: row.rule_name?.trim() || null,
    alert_date: row.alert_date ?? null,
    decision: row.decision?.trim() || null,
    updated_at: row.updated_at ?? null,
    organization_id: row.organization_id ? String(row.organization_id) : null,
    created_at: String(row.created_at),
  };
}

export async function createSimulatorAlert(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateSimulatorAlertInput
): Promise<{ alert: AlertRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { alert: null, error: viewerError };

  const { value, errors } = normalizeAlertInput(input);
  if (!value) return { alert: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id]);
  if (visibleUsers.error) return { alert: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { alert: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      internal_id: generateUuid(),
      ...value,
      created_at: value.created_at ?? new Date().toISOString(),
      organization_id: viewer!.organization_id,
    })
    .select(ALERT_MUTATION_SELECT)
    .single();

  if (error) return { alert: null, error: error.message };
  return { alert: normalizeAlertRow(data as AlertRow), error: null };
}

export async function updateSimulatorAlert(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateSimulatorAlertInput
): Promise<{ alert: AlertRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { alert: null, error: viewerError };

  const { value, errors } = normalizeAlertInput(input);
  if (!value) return { alert: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id]);
  if (visibleUsers.error) return { alert: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { alert: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data, error } = await supabase
    .from("alerts")
    .update({
      user_id: value.user_id,
      alert_type: value.alert_type,
      severity: value.severity,
      status: value.status,
      rule_code: value.rule_code,
      rule_name: value.rule_name,
      description: value.description,
      alert_date: value.alert_date,
      decision: value.decision,
      organization_id: viewer!.organization_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(ALERT_MUTATION_SELECT)
    .single();

  if (error) return { alert: null, error: error.message };
  return { alert: normalizeAlertRow(data as AlertRow), error: null };
}

export function parseAlertsCsv(text: string): { rows: AlertsCsvRow[]; errors: string[] } {
  const parsed = parseCsvTable(text);
  if (parsed.error) return { rows: [], errors: [parsed.error] };
  if (parsed.rows.length === 0) return { rows: [], errors: ["CSV file is empty."] };

  const [headerRow, ...bodyRows] = parsed.rows;
  const headers = normalizeCsvHeaders(headerRow ?? []);
  const errors: string[] = [];

  if (headers.includes("id")) {
    errors.push("alerts.csv must not include an id column.");
  }

  for (const required of ALERT_REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push(`alerts.csv is missing required header: ${required}.`);
    }
  }

  const unknownHeaders = headers.filter(
    (header) => header && !(ALERT_ALLOWED_HEADERS as readonly string[]).includes(header)
  );
  if (unknownHeaders.length > 0) {
    errors.push(`alerts.csv has unsupported headers: ${unknownHeaders.join(", ")}.`);
  }

  const rows: AlertsCsvRow[] = [];
  bodyRows.forEach((row, index) => {
    if (row.length > headers.length) {
      errors.push(`Row ${index + 2} has more values than headers.`);
      return;
    }
    rows.push(buildCsvRecord<AlertsCsvRow>(headers, row));
  });

  return { rows, errors };
}

export async function validateAlertsCsv(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  rows: AlertsCsvRow[]
): Promise<{ rows: CreateSimulatorAlertInput[]; errors: string[] }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { rows: [], errors: [viewerError] };

  const normalizedRows: CreateSimulatorAlertInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const { value, errors: rowErrors } = normalizeAlertInput({
      user_id: row.user_id,
      alert_type: row.alert_type,
      severity: row.severity,
      status: row.status,
      rule_code: row.rule_code,
      rule_name: row.rule_name,
      description: row.description,
      created_at: row.created_at,
      alert_date: row.alert_date,
      decision: row.decision,
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
        user_id: row.user_id,
        alert_type: row.alert_type,
        severity: row.severity,
        status: row.status,
        rule_code: row.rule_code,
        created_at: row.created_at,
      })
    )
  );

  const userIds = [...new Set(normalizedRows.map((row) => row.user_id))];
  const visibleUsers = await ensureVisibleUsers(supabase, userIds);
  if (visibleUsers.error) {
    errors.push(visibleUsers.error);
  } else {
    userIds.forEach((userId) => {
      if (!visibleUsers.ids.has(userId)) {
        errors.push(`User ${userId} was not found or is outside your visible organization scope.`);
      }
    });
  }

  return { rows: errors.length === 0 ? normalizedRows : [], errors };
}

export async function importSimulatorAlertsCsv(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  rows: CreateSimulatorAlertInput[]
): Promise<{ created: ImportedSimulatorAlertRow[]; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { created: [], error: viewerError };
  if (rows.length === 0) return { created: [], error: "No valid alerts to import." };

  const visibleUsers = await ensureVisibleUsers(
    supabase,
    [...new Set(rows.map((row) => row.user_id))]
  );
  if (visibleUsers.error) return { created: [], error: visibleUsers.error };

  const missingUserId = rows.find((row) => !visibleUsers.ids.has(row.user_id))?.user_id;
  if (missingUserId) {
    return { created: [], error: `User ${missingUserId} was not found or is outside your visible organization scope.` };
  }

  const insertRows = rows.map((row) => {
    const { value } = normalizeAlertInput(row);
    return {
      internal_id: generateUuid(),
      ...value!,
      organization_id: viewer!.organization_id,
    };
  });

  const { data, error } = await supabase
    .from("alerts")
    .insert(insertRows)
    .select("id, user_id, alert_type, severity, status");

  if (error) return { created: [], error: error.message };

  const created = (((data as ImportedSimulatorAlertRow[] | null) ?? []).map((row) => ({
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    alert_type: row.alert_type?.trim() || null,
    severity: row.severity?.trim() || null,
    status: row.status?.trim() || null,
  })));

  return { created, error: null };
}
