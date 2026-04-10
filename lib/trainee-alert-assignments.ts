import { isPostgrestUnknownColumnError } from "@/shared/lib/postgrest";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type TraineeAssigneeRow = {
  app_user_id: string;
  full_name: string | null;
  email: string | null;
};

type AlertIds = { internalId?: string | null; publicId: string };

let cachedAlertColumn: "alert_internal_id" | "alert_id" | null = null;

export async function resolveTraineeAssignmentAlertColumn(
  supabase: SupabaseClient
): Promise<"alert_internal_id" | "alert_id"> {
  if (cachedAlertColumn) return cachedAlertColumn;

  const { data: rows, error } = await supabase.from("trainee_alert_assignments").select("*").limit(1);
  if (!error && rows?.length) {
    const row = rows[0] as Record<string, unknown>;
    if ("alert_internal_id" in row) {
      cachedAlertColumn = "alert_internal_id";
      return cachedAlertColumn;
    }
    if ("alert_id" in row) {
      cachedAlertColumn = "alert_id";
      return cachedAlertColumn;
    }
  }

  const rInt = await supabase.from("trainee_alert_assignments").select("alert_internal_id").limit(1);
  if (!rInt.error) {
    cachedAlertColumn = "alert_internal_id";
    return cachedAlertColumn;
  }
  if (!isPostgrestUnknownColumnError(rInt.error as PostgrestError)) {
    cachedAlertColumn = "alert_internal_id";
    return cachedAlertColumn;
  }

  const rPub = await supabase.from("trainee_alert_assignments").select("alert_id").limit(1);
  if (!rPub.error) {
    cachedAlertColumn = "alert_id";
    return cachedAlertColumn;
  }
  if (isPostgrestUnknownColumnError(rPub.error as PostgrestError)) {
    cachedAlertColumn = "alert_internal_id";
    return cachedAlertColumn;
  }

  cachedAlertColumn = "alert_id";
  return cachedAlertColumn;
}

/** Uses resolved DB column: legacy DBs use `alert_id` (public alert id), schema.sql uses `alert_internal_id` (uuid). */
function pickAlertColumnForQuery(
  resolved: "alert_internal_id" | "alert_id",
  ids: AlertIds
): { col: "alert_internal_id" | "alert_id"; idVal: string } {
  if (resolved === "alert_id") {
    return { col: "alert_id", idVal: ids.publicId };
  }
  const internal = String(ids.internalId ?? "").trim();
  if (internal) return { col: "alert_internal_id", idVal: internal };
  return { col: "alert_internal_id", idVal: ids.publicId };
}

export function formatTraineeAssigneeLabel(a: TraineeAssigneeRow): string {
  const name = (a.full_name ?? "").trim();
  if (name) return name;
  const em = (a.email ?? "").trim();
  if (em) return em;
  return `${a.app_user_id.slice(0, 8)}…`;
}

export async function listTraineeAlertSelfAssignmentsForAlert(
  supabase: SupabaseClient,
  ids: AlertIds
): Promise<{ rows: Array<{ app_user_id: string; created_at: string }>; error: string | null }> {
  const resolved = await resolveTraineeAssignmentAlertColumn(supabase);
  const { col, idVal } = pickAlertColumnForQuery(resolved, ids);
  if (!idVal) {
    return { rows: [], error: null };
  }

  const { data, error } = await supabase
    .from("trainee_alert_assignments")
    .select("app_user_id, created_at")
    .eq(col, idVal)
    .order("created_at", { ascending: true });

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = ((data ?? []) as Array<{ app_user_id: string; created_at: string }>).map((r) => ({
    app_user_id: String(r.app_user_id),
    created_at: String(r.created_at),
  }));
  return { rows, error: null };
}

export async function fetchAlertAssignees(
  supabase: SupabaseClient,
  ids: AlertIds
): Promise<{ assignees: TraineeAssigneeRow[] }> {
  const resolved = await resolveTraineeAssignmentAlertColumn(supabase);
  const { col, idVal } = pickAlertColumnForQuery(resolved, ids);

  const nested = await supabase
    .from("trainee_alert_assignments")
    .select("app_user_id, app_users ( full_name, email )")
    .eq(col, idVal);

  if (!nested.error && nested.data?.length) {
    const rows = (nested.data ?? []) as Array<{
      app_user_id: string;
      app_users?:
        | { full_name?: string | null; email?: string | null }
        | Array<{ full_name?: string | null; email?: string | null }>
        | null;
    }>;
    const list: TraineeAssigneeRow[] = rows.map((r) => {
      const profile = Array.isArray(r.app_users) ? r.app_users[0] ?? null : r.app_users ?? null;
      return {
        app_user_id: r.app_user_id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
      };
    });
    return { assignees: list };
  }

  const flat = await supabase.from("trainee_alert_assignments").select("app_user_id").eq(col, idVal);
  if (flat.error) return { assignees: [] };
  return {
    assignees: (flat.data ?? []).map((r: { app_user_id: string }) => ({
      app_user_id: r.app_user_id,
      full_name: null,
      email: null,
    })),
  };
}

function isDuplicateAssignmentError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const o = e as { code?: string; message?: string };
  if (o.code === "23505") return true;
  const msg = String(o.message ?? "");
  if (/23505|duplicate|unique/i.test(msg)) return true;
  return false;
}

export async function insertTraineeAlertAssignment(
  supabase: SupabaseClient,
  appUserId: string,
  ids: AlertIds
) {
  const resolved = await resolveTraineeAssignmentAlertColumn(supabase);
  const { col: alertCol, idVal } = pickAlertColumnForQuery(resolved, ids);
  if (!idVal) return { error: new Error("missing alert id") };

  const row: Record<string, string> = { app_user_id: appUserId, [alertCol]: idVal };
  const { error } = await supabase.from("trainee_alert_assignments").insert(row);
  if (error && isDuplicateAssignmentError(error)) return { error: null };
  return { error };
}

export async function deleteTraineeAlertAssignmentForUser(
  supabase: SupabaseClient,
  appUserId: string,
  ids: AlertIds
) {
  const resolved = await resolveTraineeAssignmentAlertColumn(supabase);
  const { col: alertCol, idVal } = pickAlertColumnForQuery(resolved, ids);
  if (!idVal) return { error: new Error("missing alert id") };

  const { error } = await supabase
    .from("trainee_alert_assignments")
    .delete()
    .eq("app_user_id", appUserId)
    .eq(alertCol, idVal);
  return { error };
}
