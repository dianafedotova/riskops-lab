import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRow } from "@/lib/types";
import { listStaffAssignedAlertsForTrainee } from "@/lib/services/alert-review-assignments";
import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import {
  deleteTraineeAlertAssignmentForUser,
  fetchAlertAssignees,
  insertTraineeAlertAssignment,
  resolveTraineeAssignmentAlertColumn,
  type TraineeAssigneeRow,
} from "@/lib/trainee-alert-assignments";

type AlertIds = {
  internalId?: string | null;
  publicId: string;
};

export type TraineeAssignedAlertRow = Pick<
  AlertRow,
  "id" | "internal_id" | "user_id" | "status" | "severity" | "alert_type" | "created_at"
> & {
  assignment_source: "self" | "staff" | "self_and_staff";
  priority: "low" | "normal" | "high" | "urgent" | null;
  due_at: string | null;
  assignment_created_at: string;
  staff_assignment_id?: string | null;
};

export async function listAssignedAlertsForTrainee(
  supabase: SupabaseClient,
  traineeAppUserId: string
): Promise<{ alerts: TraineeAssignedAlertRow[]; error: Error | null }> {
  const { alerts: staffAlerts, error: staffError } = await listStaffAssignedAlertsForTrainee(
    supabase,
    traineeAppUserId
  );
  if (staffError) {
    return { alerts: [], error: new Error(staffError) };
  }

  const alertColumn = await resolveTraineeAssignmentAlertColumn(supabase);
  const { data: legacyRows, error: assignmentError } = await supabase
    .from("trainee_alert_assignments")
    .select(`${alertColumn}, created_at`)
    .eq("app_user_id", traineeAppUserId)
    .order("created_at", { ascending: false });

  if (assignmentError) {
    return { alerts: staffAlerts, error: new Error(assignmentError.message) };
  }

  const assignedIds = (legacyRows ?? [])
    .map((row) => (row as Record<string, string | null>)[alertColumn])
    .filter(Boolean) as string[];

  if (assignedIds.length === 0) {
    return { alerts: staffAlerts, error: null };
  }

  const alertsFilterColumn = alertColumn === "alert_internal_id" ? "internal_id" : "id";
  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select("id, internal_id, user_id, status, severity, alert_type, created_at")
    .in(alertsFilterColumn, assignedIds);

  if (alertsError) {
    return { alerts: staffAlerts, error: new Error(alertsError.message) };
  }

  const staffByAlertId = new Map(staffAlerts.map((alert) => [alert.id, alert]));
  const legacyCreatedAtByAlertId = new Map(
    (((legacyRows as Array<Record<string, string | null>> | null) ?? [])
      .map((row) => {
        const assignedAlertId = row[alertColumn];
        const createdAt = row.created_at;
        if (!assignedAlertId || !createdAt) return null;
        return [assignedAlertId, createdAt] as const;
      })
      .filter(Boolean) as Array<readonly [string, string]>)
  );
  const merged = new Map<string, TraineeAssignedAlertRow>();

  for (const alert of staffAlerts) {
    merged.set(alert.id, alert);
  }

  for (const alert of (alerts as AlertRow[]) ?? []) {
    const existing = staffByAlertId.get(alert.id);
    const legacyCreatedAt = legacyCreatedAtByAlertId.get(alert.id) ?? alert.created_at;
    if (existing) {
      merged.set(alert.id, {
        ...existing,
        ...alert,
        assignment_source: "self_and_staff",
        assignment_created_at: existing.assignment_created_at || legacyCreatedAt,
      });
      continue;
    }

    merged.set(alert.id, {
      ...alert,
      assignment_source: "self",
      priority: null,
      due_at: null,
      assignment_created_at: legacyCreatedAt,
      staff_assignment_id: null,
    });
  }

  return {
    alerts: Array.from(merged.values()),
    error: null,
  };
}

export async function listAlertAssigneesForContext(
  supabase: SupabaseClient,
  ids: AlertIds
): Promise<{ assignees: TraineeAssigneeRow[]; error: Error | null }> {
  const { assignees } = await fetchAlertAssignees(supabase, ids);
  return { assignees, error: null };
}

export async function assignAlertToTraineeSelf(
  supabase: SupabaseClient,
  traineeAppUserId: string,
  ids: AlertIds
): Promise<{ error: Error | null }> {
  const { error } = await insertTraineeAlertAssignment(supabase, traineeAppUserId, ids);
  if (error) {
    return { error: new Error(error.message) };
  }

  await recordAppUserActivity(supabase, {
    appUserId: traineeAppUserId,
    eventType: "alert_assignment_assigned",
    meta: {
      alert_id: ids.publicId,
      alert_internal_id: ids.internalId ?? null,
    },
  });

  return { error: null };
}

export async function unassignAlertFromTraineeSelf(
  supabase: SupabaseClient,
  traineeAppUserId: string,
  ids: AlertIds
): Promise<{ error: Error | null }> {
  const { error } = await deleteTraineeAlertAssignmentForUser(supabase, traineeAppUserId, ids);
  if (error) {
    return { error: new Error(error.message) };
  }

  await recordAppUserActivity(supabase, {
    appUserId: traineeAppUserId,
    eventType: "alert_assignment_unassigned",
    meta: {
      alert_id: ids.publicId,
      alert_internal_id: ids.internalId ?? null,
    },
  });

  return { error: null };
}
