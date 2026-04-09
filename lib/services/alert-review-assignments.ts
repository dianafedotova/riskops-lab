import { isSuperAdmin } from "@/lib/app-user-role";
import { listReviewSubmissionsDirect } from "@/lib/services/review-submissions";
import {
  fetchAlertAssignees,
  listTraineeAlertSelfAssignmentsForAlert,
} from "@/lib/trainee-alert-assignments";
import type { AlertRow, AppUserRow, ReviewSubmissionRow } from "@/lib/types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

const ALERT_REVIEW_ASSIGNMENT_COLS =
  "id, organization_id, alert_id, trainee_app_user_id, assigned_by_app_user_id, priority, due_at, created_at, updated_at, cancelled_at" as const;

const APP_USER_MIN_SELECT = "id, email, full_name, organization_id, role, is_active" as const;
const ORG_SELECT = "id, name" as const;
const ALERT_MIN_SELECT = "id, internal_id, user_id, status, severity, alert_type, created_at" as const;

export type AlertReviewAssignmentPriority = "low" | "normal" | "high" | "urgent";
export type AlertReviewAssignmentSource = "staff";
export type AlertReviewAssignmentProgress =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "closed";

type AlertReviewAssignmentTableRow = {
  id: string;
  organization_id: string;
  alert_id: string;
  trainee_app_user_id: string;
  assigned_by_app_user_id: string;
  priority: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

type AppUserMiniRow = Pick<
  AppUserRow,
  "id" | "email" | "full_name" | "organization_id" | "role" | "is_active"
>;

type OrganizationMiniRow = {
  id: string;
  name: string;
};

export type AssignableTraineeOption = {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
};

export type AlertReviewAssignmentListRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  alert_id: string;
  trainee_app_user_id: string;
  trainee_label: string;
  trainee_email: string | null;
  assigned_by_app_user_id: string;
  assigned_by_label: string;
  priority: AlertReviewAssignmentPriority;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  latest_thread_id: string | null;
  latest_submission: ReviewSubmissionRow | null;
  progress: AlertReviewAssignmentProgress;
  is_overdue: boolean;
};

/** Staff assignment row plus self-assign-only trainees (no `alert_review_assignments` row). */
export type AlertTraineeCaseRow = AlertReviewAssignmentListRow & {
  caseSource: "staff" | "self";
};

/** Mutually exclusive buckets for the admin trainee-case filter tiles (excluding `all`). */
export type TraineeCaseFilterSegment = "staff_active" | "self_active" | "in_review" | "done";

export type TraineeCaseFilter = "all" | TraineeCaseFilterSegment;

export type StaffAssignedAlertRow = Pick<
  AlertRow,
  "id" | "internal_id" | "user_id" | "status" | "severity" | "alert_type" | "created_at"
> & {
  assignment_id: string;
  assignment_source: AlertReviewAssignmentSource;
  priority: AlertReviewAssignmentPriority;
  due_at: string | null;
  assignment_created_at: string;
};

function isMissingRelationError(error: PostgrestError | null): boolean {
  return Boolean(error && (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)));
}

function normalizePriority(value: string | null | undefined): AlertReviewAssignmentPriority {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "high" || raw === "urgent") return raw;
  return "normal";
}

function displayLabel(
  row: Pick<AppUserMiniRow, "id" | "full_name" | "email"> | null | undefined,
  fallback: string
): string {
  const name = (row?.full_name ?? "").trim();
  const email = (row?.email ?? "").trim();
  if (name && email) return `${name} · ${email}`;
  return name || email || fallback;
}

function isCompletedProgress(progress: AlertReviewAssignmentProgress): boolean {
  return progress === "approved" || progress === "closed";
}

export function traineeCaseFilterSegment(row: AlertTraineeCaseRow): TraineeCaseFilterSegment {
  if (isCompletedProgress(row.progress)) return "done";
  if (row.latest_submission != null) return "in_review";
  if (row.caseSource === "staff") return "staff_active";
  return "self_active";
}

function progressFromLatestSubmission(
  submission: ReviewSubmissionRow | null,
  threadId: string | null
): AlertReviewAssignmentProgress {
  if (submission) return submission.review_state;
  if (threadId) return "in_progress";
  return "assigned";
}

function sortByName(left: AssignableTraineeOption, right: AssignableTraineeOption) {
  const leftLabel = displayLabel(left, left.id);
  const rightLabel = displayLabel(right, right.id);
  return leftLabel.localeCompare(rightLabel);
}

async function loadOrganizationMap(
  supabase: SupabaseClient,
  organizationIds: string[]
): Promise<Map<string, OrganizationMiniRow>> {
  if (organizationIds.length === 0) return new Map();
  const { data, error } = await supabase.from("organizations").select(ORG_SELECT).in("id", organizationIds);
  if (error) return new Map();

  return new Map(
    (((data as OrganizationMiniRow[] | null) ?? []).map((row) => [
      String(row.id),
      { id: String(row.id), name: String(row.name) },
    ]) as Array<[string, OrganizationMiniRow]>)
  );
}

async function loadAppUserMiniMap(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, AppUserMiniRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("app_users").select(APP_USER_MIN_SELECT).in("id", ids);
  if (error) return new Map();

  return new Map(
    (((data as AppUserMiniRow[] | null) ?? []).map((row) => [
      String(row.id),
      {
        ...row,
        id: String(row.id),
        organization_id: row.organization_id ? String(row.organization_id) : null,
        email: row.email?.trim() || null,
        full_name: row.full_name?.trim() || null,
      },
    ]) as Array<[string, AppUserMiniRow]>)
  );
}

export async function listAssignableTrainees(
  supabase: SupabaseClient,
  viewer: Pick<AppUserRow, "role" | "organization_id"> | null
): Promise<{ trainees: AssignableTraineeOption[]; error: string | null }> {
  if (!viewer?.role || (viewer.role !== "reviewer" && viewer.role !== "ops_admin" && viewer.role !== "super_admin")) {
    return { trainees: [], error: "Staff access is required." };
  }

  let query = supabase
    .from("app_users")
    .select(APP_USER_MIN_SELECT)
    .eq("role", "trainee")
    .neq("is_active", false)
    .order("full_name", { ascending: true });

  if (!isSuperAdmin(viewer.role)) {
    if (!viewer.organization_id) {
      return { trainees: [], error: "Current staff organization is missing." };
    }
    query = query.eq("organization_id", viewer.organization_id);
  }

  const { data, error } = await query;
  if (error) {
    return { trainees: [], error: error.message };
  }

  const rows = ((data as AppUserMiniRow[] | null) ?? []).map((row) => ({
    ...row,
    id: String(row.id),
    organization_id: row.organization_id ? String(row.organization_id) : null,
    email: row.email?.trim() || null,
    full_name: row.full_name?.trim() || null,
  }));
  const organizationIds = [...new Set(rows.map((row) => row.organization_id).filter(Boolean))] as string[];
  const organizations = await loadOrganizationMap(supabase, organizationIds);

  return {
    trainees: rows
      .map((row) => ({
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        organization_id: row.organization_id,
        organization_name: row.organization_id ? organizations.get(row.organization_id)?.name ?? null : null,
      }))
      .sort(sortByName),
    error: null,
  };
}

export async function listAlertReviewAssignments(
  supabase: SupabaseClient,
  args: {
    alertId: string;
  }
): Promise<{ assignments: AlertReviewAssignmentListRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("alert_review_assignments")
    .select(ALERT_REVIEW_ASSIGNMENT_COLS)
    .eq("alert_id", args.alertId)
    .is("cancelled_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return { assignments: [], error: error.message };
  }

  const rows = ((data as AlertReviewAssignmentTableRow[] | null) ?? []).map((row) => ({
    ...row,
    id: String(row.id),
    organization_id: String(row.organization_id),
    alert_id: String(row.alert_id),
    trainee_app_user_id: String(row.trainee_app_user_id),
    assigned_by_app_user_id: String(row.assigned_by_app_user_id),
  }));

  if (rows.length === 0) {
    return { assignments: [], error: null };
  }

  const traineeIds = [...new Set(rows.map((row) => row.trainee_app_user_id))];
  const actorIds = [...new Set(rows.map((row) => row.assigned_by_app_user_id))];
  const orgIds = [...new Set(rows.map((row) => row.organization_id))];
  const [usersMap, organizations, threadsRes] = await Promise.all([
    loadAppUserMiniMap(supabase, [...new Set([...traineeIds, ...actorIds])]),
    loadOrganizationMap(supabase, orgIds),
    supabase
      .from("review_threads")
      .select("id, app_user_id, alert_id, created_at")
      .eq("context_type", "alert")
      .eq("alert_id", args.alertId)
      .in("app_user_id", traineeIds)
      .order("created_at", { ascending: false }),
  ]);

  if (threadsRes.error) {
    return { assignments: [], error: threadsRes.error.message };
  }

  const latestThreadByTrainee = new Map<string, string>();
  for (const row of (threadsRes.data ?? []) as Array<{ id: string; app_user_id: string }>) {
    if (!latestThreadByTrainee.has(String(row.app_user_id))) {
      latestThreadByTrainee.set(String(row.app_user_id), String(row.id));
    }
  }

  const threadIds = [...new Set([...latestThreadByTrainee.values()])];
  const { rows: submissions, error: submissionError } = await listReviewSubmissionsDirect(supabase, threadIds);
  if (submissionError) {
    return { assignments: [], error: submissionError };
  }

  const latestSubmissionByThread = new Map<string, ReviewSubmissionRow>();
  for (const submission of submissions) {
    if (!latestSubmissionByThread.has(submission.thread_id)) {
      latestSubmissionByThread.set(submission.thread_id, submission);
    }
  }

  const now = Date.now();
  return {
    assignments: rows.map((row) => {
      const trainee = usersMap.get(row.trainee_app_user_id);
      const assigner = usersMap.get(row.assigned_by_app_user_id);
      const latestThreadId = latestThreadByTrainee.get(row.trainee_app_user_id) ?? null;
      const latestSubmission = latestThreadId ? latestSubmissionByThread.get(latestThreadId) ?? null : null;
      const progress = progressFromLatestSubmission(latestSubmission, latestThreadId);
      const dueAtMs = row.due_at ? new Date(row.due_at).getTime() : null;

      return {
        id: row.id,
        organization_id: row.organization_id,
        organization_name: organizations.get(row.organization_id)?.name ?? null,
        alert_id: row.alert_id,
        trainee_app_user_id: row.trainee_app_user_id,
        trainee_label: displayLabel(trainee, row.trainee_app_user_id.slice(0, 8)),
        trainee_email: trainee?.email ?? null,
        assigned_by_app_user_id: row.assigned_by_app_user_id,
        assigned_by_label: displayLabel(assigner, row.assigned_by_app_user_id.slice(0, 8)),
        priority: normalizePriority(row.priority),
        due_at: row.due_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        latest_thread_id: latestThreadId,
        latest_submission: latestSubmission,
        progress,
        is_overdue:
          dueAtMs != null && Number.isFinite(dueAtMs) && dueAtMs < now && !isCompletedProgress(progress),
      };
    }),
    error: null,
  };
}

export async function listAlertTraineeCases(
  supabase: SupabaseClient,
  args: { alertId: string; alertInternalId?: string | null }
): Promise<{ cases: AlertTraineeCaseRow[]; error: string | null }> {
  const { assignments: staffAssignments, error: staffErr } = await listAlertReviewAssignments(supabase, {
    alertId: args.alertId,
  });
  if (staffErr) {
    return { cases: [], error: staffErr };
  }

  const staffCases: AlertTraineeCaseRow[] = staffAssignments.map((row) => ({
    ...row,
    caseSource: "staff" as const,
  }));

  const staffTraineeIds = new Set(staffAssignments.map((a) => a.trainee_app_user_id));

  const { assignees } = await fetchAlertAssignees(supabase, {
    publicId: args.alertId,
    internalId: args.alertInternalId ?? null,
  });

  const selfTraineeIds = assignees.map((a) => a.app_user_id).filter((id) => !staffTraineeIds.has(id));
  if (selfTraineeIds.length === 0) {
    return { cases: staffCases, error: null };
  }

  const { rows: selfTimestamps } = await listTraineeAlertSelfAssignmentsForAlert(supabase, {
    publicId: args.alertId,
    internalId: args.alertInternalId ?? null,
  });
  const createdAtByTrainee = new Map(selfTimestamps.map((r) => [r.app_user_id, r.created_at]));

  const threadsRes = await supabase
    .from("review_threads")
    .select("id, app_user_id, alert_id, created_at")
    .eq("context_type", "alert")
    .eq("alert_id", args.alertId)
    .in("app_user_id", selfTraineeIds)
    .order("created_at", { ascending: false });

  if (threadsRes.error) {
    return { cases: staffCases, error: threadsRes.error.message };
  }

  const latestThreadByTrainee = new Map<string, string>();
  const threadOpenedAtByTrainee = new Map<string, string>();
  for (const row of (threadsRes.data ?? []) as Array<{ id: string; app_user_id: string; created_at: string }>) {
    const uid = String(row.app_user_id);
    if (!latestThreadByTrainee.has(uid)) {
      latestThreadByTrainee.set(uid, String(row.id));
      threadOpenedAtByTrainee.set(uid, String(row.created_at));
    }
  }

  const threadIds = [...new Set([...latestThreadByTrainee.values()])];
  const { rows: submissions, error: submissionError } = await listReviewSubmissionsDirect(supabase, threadIds);
  if (submissionError) {
    return { cases: staffCases, error: submissionError };
  }

  const latestSubmissionByThread = new Map<string, ReviewSubmissionRow>();
  for (const submission of submissions) {
    if (!latestSubmissionByThread.has(submission.thread_id)) {
      latestSubmissionByThread.set(submission.thread_id, submission);
    }
  }

  const usersMap = await loadAppUserMiniMap(supabase, selfTraineeIds);
  const orgIds = [
    ...new Set(
      selfTraineeIds
        .map((id) => usersMap.get(id)?.organization_id)
        .filter((v): v is string => Boolean(v))
    ),
  ];
  const organizations = await loadOrganizationMap(supabase, orgIds);
  const now = Date.now();

  const selfCases: AlertTraineeCaseRow[] = selfTraineeIds.map((traineeId) => {
    const trainee = usersMap.get(traineeId);
    const latestThreadId = latestThreadByTrainee.get(traineeId) ?? null;
    const latestSubmission = latestThreadId ? latestSubmissionByThread.get(latestThreadId) ?? null : null;
    const progress = progressFromLatestSubmission(latestSubmission, latestThreadId);
    const orgId = trainee?.organization_id ? String(trainee.organization_id) : "";
    const createdAt =
      createdAtByTrainee.get(traineeId) ?? threadOpenedAtByTrainee.get(traineeId) ?? new Date(now).toISOString();

    return {
      id: `self:${traineeId}`,
      organization_id: orgId,
      organization_name: orgId ? organizations.get(orgId)?.name ?? null : null,
      alert_id: args.alertId,
      trainee_app_user_id: traineeId,
      trainee_label: displayLabel(trainee, traineeId.slice(0, 8)),
      trainee_email: trainee?.email ?? null,
      assigned_by_app_user_id: traineeId,
      assigned_by_label: "Self-assign",
      priority: "normal",
      due_at: null,
      created_at: createdAt,
      updated_at: createdAt,
      latest_thread_id: latestThreadId,
      latest_submission: latestSubmission,
      progress,
      is_overdue: false,
      caseSource: "self" as const,
    };
  });

  selfCases.sort((left, right) => left.created_at.localeCompare(right.created_at));

  return { cases: [...staffCases, ...selfCases], error: null };
}

export async function listStaffAssignedAlertsForTrainee(
  supabase: SupabaseClient,
  traineeAppUserId: string
): Promise<{ alerts: StaffAssignedAlertRow[]; error: string | null }> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("alert_review_assignments")
    .select("id, alert_id, priority, due_at, created_at")
    .eq("trainee_app_user_id", traineeAppUserId)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false });

  if (assignmentError) {
    if (isMissingRelationError(assignmentError)) {
      return { alerts: [], error: null };
    }
    return { alerts: [], error: assignmentError.message };
  }

  const rows =
    ((assignmentRows as Array<{
      id: string;
      alert_id: string;
      priority: string | null;
      due_at: string | null;
      created_at: string;
    }> | null) ?? []);

  const alertIds = [...new Set(rows.map((row) => String(row.alert_id)).filter(Boolean))];
  if (alertIds.length === 0) {
    return { alerts: [], error: null };
  }

  const { data: alertRows, error: alertsError } = await supabase
    .from("alerts")
    .select(ALERT_MIN_SELECT)
    .in("id", alertIds);

  if (alertsError) {
    return { alerts: [], error: alertsError.message };
  }

  const alertMap = new Map<string, AlertRow>();
  for (const row of (alertRows as AlertRow[] | null) ?? []) {
    alertMap.set(String(row.id), row);
  }

  return {
    alerts: rows
      .map((row) => {
        const alert = alertMap.get(String(row.alert_id));
        if (!alert) return null;
        return {
          ...alert,
          assignment_id: String(row.id),
          assignment_source: "staff" as const,
          priority: normalizePriority(row.priority),
          due_at: row.due_at ?? null,
          assignment_created_at: String(row.created_at),
        };
      })
      .filter(Boolean) as StaffAssignedAlertRow[],
    error: null,
  };
}

export async function upsertAlertReviewAssignments(
  supabase: SupabaseClient,
  viewer: Pick<AppUserRow, "id" | "role" | "organization_id"> | null,
  args: {
    alertId: string;
    traineeAppUserIds: string[];
    priority: AlertReviewAssignmentPriority;
    dueAt: string | null;
  }
): Promise<{ error: string | null }> {
  if (!viewer?.id || !viewer.role || (viewer.role !== "reviewer" && viewer.role !== "ops_admin" && viewer.role !== "super_admin")) {
    return { error: "Staff access is required." };
  }

  const { trainees, error } = await listAssignableTrainees(supabase, viewer);
  if (error) return { error };

  const allowed = new Map(trainees.map((trainee) => [trainee.id, trainee]));
  const selected = args.traineeAppUserIds
    .map((id) => allowed.get(id))
    .filter(Boolean) as AssignableTraineeOption[];

  if (selected.length === 0) {
    return { error: "Select at least one trainee." };
  }

  const now = new Date().toISOString();
  const rows = selected.map((trainee) => ({
    organization_id: trainee.organization_id,
    alert_id: args.alertId,
    trainee_app_user_id: trainee.id,
    assigned_by_app_user_id: viewer.id,
    priority: args.priority,
    due_at: args.dueAt,
    updated_at: now,
    cancelled_at: null,
  }));

  const { error: upsertError } = await supabase
    .from("alert_review_assignments")
    .upsert(rows, { onConflict: "alert_id,trainee_app_user_id" });

  return { error: upsertError?.message ?? null };
}

export async function updateAlertReviewAssignmentPriority(
  supabase: SupabaseClient,
  args: {
    assignmentId: string;
    priority: AlertReviewAssignmentPriority;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("alert_review_assignments")
    .update({
      priority: args.priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.assignmentId)
    .is("cancelled_at", null);

  return { error: error?.message ?? null };
}

export async function updateAlertReviewAssignmentDueAt(
  supabase: SupabaseClient,
  args: {
    assignmentId: string;
    dueAt: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("alert_review_assignments")
    .update({
      due_at: args.dueAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.assignmentId)
    .is("cancelled_at", null);

  return { error: error?.message ?? null };
}

export async function cancelAlertReviewAssignment(
  supabase: SupabaseClient,
  args: {
    assignmentId: string;
  }
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("alert_review_assignments")
    .update({
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", args.assignmentId)
    .is("cancelled_at", null);

  return { error: error?.message ?? null };
}
