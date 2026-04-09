import { isSuperAdmin, type AppUserRole } from "@/lib/app-user-role";
import type { ReviewThreadContextType } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminCaseCatalogPhaseFilter =
  | "all"
  | "not_draft"
  | "draft"
  | "submitted"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "closed"
  | "done";

export type AdminCaseDateBasis = "activity" | "thread_created";

export type AdminCaseCatalogRow = {
  threadId: string;
  organizationId: string;
  organizationName: string;
  traineeAppUserId: string;
  contextType: ReviewThreadContextType;
  alertId: string | null;
  simulatorUserId: string | null;
  createdAt: string;
  updatedAt: string;
  traineeEmail: string | null;
  traineeFullName: string | null;
  simUserEmail: string | null;
  simUserFullName: string | null;
  casePhase: string;
  activityAt: string;
};

export type ListAdminReviewCasesArgs = {
  search: string | null;
  organizationId: string | null;
  traineeAppUserId: string | null;
  simulatorUserId: string | null;
  alertId: string | null;
  contextType: "all" | ReviewThreadContextType;
  phase: AdminCaseCatalogPhaseFilter;
  dateBasis: AdminCaseDateBasis;
  dateFrom: Date | null;
  dateToExclusive: Date | null;
  page: number;
  pageSize: number;
};

export type ListAdminReviewCasesResult = {
  rows: AdminCaseCatalogRow[];
  totalCount: number;
  error: string | null;
};

type RpcRow = {
  thread_id: string;
  organization_id: string;
  organization_name: string;
  app_user_id: string;
  context_type: string;
  alert_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  trainee_email: string | null;
  trainee_full_name: string | null;
  sim_user_email: string | null;
  sim_user_full_name: string | null;
  case_phase: string;
  activity_at: string;
  total_count: number | string;
};

function normalizeContextType(value: string): ReviewThreadContextType {
  const v = value.trim().toLowerCase();
  if (v === "profile" || v === "alert") return v;
  return "alert";
}

function mapRpcRow(row: RpcRow): AdminCaseCatalogRow {
  return {
    threadId: String(row.thread_id),
    organizationId: String(row.organization_id),
    organizationName: String(row.organization_name ?? ""),
    traineeAppUserId: String(row.app_user_id),
    contextType: normalizeContextType(String(row.context_type ?? "alert")),
    alertId: row.alert_id != null ? String(row.alert_id) : null,
    simulatorUserId: row.user_id != null ? String(row.user_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    traineeEmail: row.trainee_email ?? null,
    traineeFullName: row.trainee_full_name ?? null,
    simUserEmail: row.sim_user_email ?? null,
    simUserFullName: row.sim_user_full_name ?? null,
    casePhase: String(row.case_phase ?? "draft"),
    activityAt: String(row.activity_at),
  };
}

export function clampAdminCasePageSize(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(Number(value))) return 10;
  const n = Math.floor(Number(value));
  // Treat 0 / negatives as “unset” (e.g. `Number(null)` when `ps` query param is missing).
  if (n < 1) return 10;
  return Math.min(50, n);
}

export function clampAdminCasePage(value: number | undefined): number {
  const n = Number.isFinite(value) ? Math.floor(Number(value)) : 1;
  return Math.max(1, n || 1);
}

/** Escape `%` and `_` for PostgREST `ilike` patterns. */
export function escapeIlikePattern(fragment: string): string {
  return fragment.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function listAdminReviewCases(
  supabase: SupabaseClient,
  args: ListAdminReviewCasesArgs
): Promise<ListAdminReviewCasesResult> {
  const page = clampAdminCasePage(args.page);
  const pageSize = clampAdminCasePageSize(args.pageSize);

  const { data, error } = await supabase.rpc("admin_list_review_cases", {
    p_search: args.search?.trim() || null,
    p_organization_id: args.organizationId,
    p_trainee_app_user_id: args.traineeAppUserId,
    p_simulator_user_id: args.simulatorUserId,
    p_alert_id: args.alertId?.trim() || null,
    p_context_type: args.contextType,
    p_phase: args.phase,
    p_date_basis: args.dateBasis,
    p_date_from: args.dateFrom ? args.dateFrom.toISOString() : null,
    p_date_to: args.dateToExclusive ? args.dateToExclusive.toISOString() : null,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    return { rows: [], totalCount: 0, error: error.message };
  }

  const raw = (data as RpcRow[] | null) ?? [];
  if (raw.length === 0) {
    return { rows: [], totalCount: 0, error: null };
  }

  const total = Number(raw[0]!.total_count);
  const rows = raw.map(mapRpcRow);
  return { rows, totalCount: Number.isFinite(total) ? total : 0, error: null };
}

export type AdminEntitySearchOption = { id: string; label: string };

export async function searchAdminCaseTrainees(
  supabase: SupabaseClient,
  args: {
    viewerRole: AppUserRole | null | undefined;
    organizationId: string | null;
    query: string;
    limit?: number;
  }
): Promise<{ options: AdminEntitySearchOption[]; error: string | null }> {
  const q = args.query.trim().replace(/,/g, " ");
  if (!q) return { options: [], error: null };

  const lim = Math.min(25, Math.max(1, args.limit ?? 20));
  const pattern = `%${escapeIlikePattern(q)}%`;

  let rq = supabase
    .from("app_users")
    .select("id, email, full_name")
    .eq("role", "trainee")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(lim);

  if (!isSuperAdmin(args.viewerRole)) {
    if (!args.organizationId) return { options: [], error: null };
    rq = rq.eq("organization_id", args.organizationId);
  } else if (args.organizationId) {
    rq = rq.eq("organization_id", args.organizationId);
  }

  const { data, error } = await rq;
  if (error) return { options: [], error: error.message };

  const options = ((data as { id: string; email: string | null; full_name: string | null }[]) ?? []).map((row) => {
    const name = (row.full_name ?? "").trim();
    const email = (row.email ?? "").trim();
    const label = name && email ? `${name} · ${email}` : name || email || row.id.slice(0, 8);
    return { id: row.id, label };
  });

  return { options, error: null };
}

export async function searchAdminCaseSimulatorUsers(
  supabase: SupabaseClient,
  args: { query: string; limit?: number }
): Promise<{ options: AdminEntitySearchOption[]; error: string | null }> {
  const q = args.query.trim().replace(/,/g, " ");
  if (!q) return { options: [], error: null };

  const lim = Math.min(25, Math.max(1, args.limit ?? 20));
  const pattern = `%${escapeIlikePattern(q)}%`;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(lim);

  if (error) return { options: [], error: error.message };

  const options = ((data as { id: string; email: string | null; full_name: string | null }[]) ?? []).map((row) => {
    const name = (row.full_name ?? "").trim();
    const email = (row.email ?? "").trim();
    const label = name && email ? `${name} · ${email}` : name || email || row.id.slice(0, 8);
    return { id: row.id, label };
  });

  return { options, error: null };
}

export async function searchAdminCaseAlerts(
  supabase: SupabaseClient,
  args: { query: string; limit?: number }
): Promise<{ options: AdminEntitySearchOption[]; error: string | null }> {
  const q = args.query.trim().replace(/,/g, " ");
  if (!q) return { options: [], error: null };

  const lim = Math.min(25, Math.max(1, args.limit ?? 20));
  const pattern = `%${escapeIlikePattern(q)}%`;

  const { data, error } = await supabase.from("alerts").select("id").ilike("id", pattern).limit(lim);

  if (error) return { options: [], error: error.message };

  const options = ((data as { id: string }[]) ?? []).map((row) => ({
    id: String(row.id),
    label: String(row.id),
  }));

  return { options, error: null };
}
