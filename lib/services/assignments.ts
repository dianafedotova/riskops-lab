import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRow } from "@/lib/types";
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
  "id" | "user_id" | "status" | "severity" | "alert_type" | "created_at"
>;

export async function listAssignedAlertsForTrainee(
  supabase: SupabaseClient,
  traineeAppUserId: string
): Promise<{ alerts: TraineeAssignedAlertRow[]; error: Error | null }> {
  const alertColumn = await resolveTraineeAssignmentAlertColumn(supabase);
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("trainee_alert_assignments")
    .select(`${alertColumn}, created_at`)
    .eq("app_user_id", traineeAppUserId)
    .order("created_at", { ascending: false });

  if (assignmentError) {
    return { alerts: [], error: new Error(assignmentError.message) };
  }

  const assignedIds = (assignmentRows ?? [])
    .map((row) => (row as Record<string, string | null>)[alertColumn])
    .filter(Boolean) as string[];

  if (assignedIds.length === 0) {
    return { alerts: [], error: null };
  }

  const alertsFilterColumn = alertColumn === "alert_internal_id" ? "internal_id" : "id";
  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select("id, user_id, status, severity, alert_type, created_at")
    .in(alertsFilterColumn, assignedIds);

  if (alertsError) {
    return { alerts: [], error: new Error(alertsError.message) };
  }

  return {
    alerts: (alerts as TraineeAssignedAlertRow[]) ?? [],
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
