"use client";

import { FilterSelect } from "@/components/filter-select";
import { QueryErrorBanner } from "@/components/query-error";
import { postJson } from "@/lib/client/post-json";
import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  cancelAlertReviewAssignment,
  listAlertTraineeCases,
  listAssignableTrainees,
  traineeCaseFilterSegment,
  updateAlertReviewAssignmentDueAt,
  updateAlertReviewAssignmentPriority,
  type AlertReviewAssignmentListRow,
  type AlertReviewAssignmentPriority,
  type AlertTraineeCaseRow,
  type AssignableTraineeOption,
  type TraineeCaseFilter,
} from "@/lib/services/alert-review-assignments";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PRIORITY_OPTIONS: Array<{ value: AlertReviewAssignmentPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function priorityBadgeClass(priority: AlertReviewAssignmentPriority): string {
  if (priority === "urgent") return "ui-badge-rose";
  if (priority === "high") return "ui-badge-amber";
  if (priority === "low") return "ui-badge-neutral";
  return "ui-badge-blue";
}

function progressBadgeClass(progress: AlertReviewAssignmentListRow["progress"], isOverdue: boolean): string {
  if (isOverdue) return "ui-badge-rose";
  if (progress === "closed" || progress === "approved") return "ui-badge-emerald";
  if (progress === "changes_requested") return "ui-badge-rose";
  if (progress === "in_review") return "ui-badge-teal";
  if (progress === "submitted") return "ui-badge-blue";
  if (progress === "in_progress") return "ui-badge-amber";
  return "ui-badge-neutral";
}

function progressLabel(progress: AlertReviewAssignmentListRow["progress"], isOverdue: boolean): string {
  if (isOverdue) return "Overdue";
  if (progress === "in_progress") return "In progress";
  if (progress === "in_review") return "In review";
  if (progress === "changes_requested") return "Changes requested";
  return progress.charAt(0).toUpperCase() + progress.slice(1).replaceAll("_", " ");
}

function formatTraineeLabel(trainee: AssignableTraineeOption): string {
  const name = (trainee.full_name ?? "").trim();
  const email = (trainee.email ?? "").trim();
  if (name && email) return `${name} · ${email}`;
  return name || email || trainee.id;
}

function isoToDateInput(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T23:59:59`).toISOString();
}

const CASE_FILTER_TILES: Array<{ id: TraineeCaseFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "staff_active", label: "Staff-assigned" },
  { id: "self_active", label: "Self-assigned" },
  { id: "in_review", label: "In review" },
  { id: "done", label: "Done" },
];

export function AlertReviewAssignmentsPanel({
  alertId,
  alertInternalId,
}: {
  alertId: string;
  alertInternalId?: string | null;
}) {
  const { appUser, hasStaffAccess, role } = useReviewWorkspaceActor();
  const canManageAssignments = hasStaffAccess && Boolean(appUser?.id);
  const [cases, setCases] = useState<AlertTraineeCaseRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<TraineeCaseFilter>("all");
  const [trainees, setTrainees] = useState<AssignableTraineeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<string[]>([]);
  const [priorityDraft, setPriorityDraft] = useState<AlertReviewAssignmentPriority>("normal");
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [search, setSearch] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");
  const [assignBusy, setAssignBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  type AlertReviewAssignmentsRouteResponse = {
    error: string | null;
  };

  useEffect(() => {
    if (!canManageAssignments || !appUser?.id) {
      setCases([]);
      setTrainees([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const [{ cases: nextCases, error: casesError }, { trainees: nextTrainees, error: traineesError }] =
        await Promise.all([
          listAlertTraineeCases(supabase, { alertId, alertInternalId }),
          listAssignableTrainees(supabase, appUser),
        ]);

      if (cancelled) return;

      setCases(nextCases);
      setTrainees(nextTrainees);
      setError(casesError ?? traineesError);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [alertId, alertInternalId, appUser, canManageAssignments, reloadTick]);

  const organizationOptions = useMemo(() => {
    const items = trainees
      .map((trainee) => trainee.organization_id && trainee.organization_name ? ({
        value: trainee.organization_id,
        label: trainee.organization_name,
      }) : null)
      .filter(Boolean) as Array<{ value: string; label: string }>;
    const byValue = new Map<string, { value: string; label: string }>();
    for (const item of items) {
      byValue.set(item.value, item);
    }
    return Array.from(byValue.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [trainees]);

  const assignedTraineeIds = useMemo(
    () => new Set(cases.map((c) => c.trainee_app_user_id)),
    [cases]
  );

  const filteredTrainees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trainees.filter((trainee) => {
      if (assignedTraineeIds.has(trainee.id)) return false;
      if (organizationFilter !== "all" && trainee.organization_id !== organizationFilter) return false;
      if (!q) return true;
      return formatTraineeLabel(trainee).toLowerCase().includes(q);
    });
  }, [assignedTraineeIds, organizationFilter, search, trainees]);

  const segmentCounts = useMemo(() => {
    const counts = {
      all: cases.length,
      staff_active: 0,
      self_active: 0,
      in_review: 0,
      done: 0,
    };
    for (const row of cases) {
      counts[traineeCaseFilterSegment(row)] += 1;
    }
    return counts;
  }, [cases]);

  const visibleCases = useMemo(() => {
    if (activeFilter === "all") return cases;
    return cases.filter((c) => traineeCaseFilterSegment(c) === activeFilter);
  }, [activeFilter, cases]);

  const toggleTrainee = (traineeId: string) => {
    setSelectedTraineeIds((current) =>
      current.includes(traineeId) ? current.filter((id) => id !== traineeId) : [...current, traineeId]
    );
  };

  const refresh = () => setReloadTick((current) => current + 1);

  const assignSelected = async () => {
    if (selectedTraineeIds.length === 0) {
      setActionError("Select at least one trainee.");
      return;
    }

    setAssignBusy(true);
    setActionError(null);
    setActionOk(null);
    try {
      const result = await postJson<AlertReviewAssignmentsRouteResponse>("/api/alert-review-assignments", {
        alertId,
        traineeAppUserIds: selectedTraineeIds,
        priority: priorityDraft,
        dueAt: dateInputToIso(dueDateDraft),
      });
      if (result.error) throw new Error(result.error);
      setActionOk(selectedTraineeIds.length === 1 ? "Trainee assigned." : "Trainees assigned.");
      setSelectedTraineeIds([]);
      setDueDateDraft("");
      setAssignOpen(false);
      refresh();
    } catch (assignError) {
      setActionError(assignError instanceof Error ? assignError.message : "Could not assign trainees.");
    } finally {
      setAssignBusy(false);
    }
  };

  const savePriority = async (assignmentId: string, priority: AlertReviewAssignmentPriority) => {
    setRowBusyId(assignmentId);
    setActionError(null);
    setActionOk(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await updateAlertReviewAssignmentPriority(supabase, {
        assignmentId,
        priority,
      });
      if (updateError) throw new Error(updateError);
      setActionOk("Priority updated.");
      refresh();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Could not update priority.");
    } finally {
      setRowBusyId(null);
    }
  };

  const saveDueDate = async (assignmentId: string, dueDate: string) => {
    setRowBusyId(assignmentId);
    setActionError(null);
    setActionOk(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await updateAlertReviewAssignmentDueAt(supabase, {
        assignmentId,
        dueAt: dateInputToIso(dueDate),
      });
      if (updateError) throw new Error(updateError);
      setActionOk(dueDate ? "Due date updated." : "Due date cleared.");
      refresh();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Could not update due date.");
    } finally {
      setRowBusyId(null);
    }
  };

  const unassign = async (assignmentId: string) => {
    setRowBusyId(assignmentId);
    setActionError(null);
    setActionOk(null);
    try {
      const supabase = createClient();
      const { error: cancelError } = await cancelAlertReviewAssignment(supabase, { assignmentId });
      if (cancelError) throw new Error(cancelError);
      setActionOk("Assignment removed.");
      refresh();
    } catch (cancelError) {
      setActionError(cancelError instanceof Error ? cancelError.message : "Could not unassign trainee.");
    } finally {
      setRowBusyId(null);
    }
  };

  if (!canManageAssignments || !appUser?.id) {
    return null;
  }

  return (
    <section className="evidence-shell space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="heading-section" style={{ color: "var(--app-shell-bg)" }}>
            Trainee Assignments
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Assign this alert as a training task without changing the trainee self-assign flow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAssignOpen((current) => !current)}
          className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm"
        >
          {assignOpen ? "Hide assign form" : "Assign trainees"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CASE_FILTER_TILES.map((tile) => {
          const count = segmentCounts[tile.id];
          const selected = activeFilter === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveFilter(tile.id)}
              className={`content-panel text-left transition-colors p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 ${
                selected ? "border-[var(--brand-400)]/50 bg-[var(--brand-50)]/90 shadow-sm" : "hover:border-slate-300/90"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{count}</p>
            </button>
          );
        })}
      </div>

      {error ? <QueryErrorBanner message={error} onRetry={refresh} /> : null}
      {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
      {actionOk ? <p className="text-sm text-emerald-700">{actionOk}</p> : null}

      {assignOpen ? (
        <div className="rounded-[1.05rem] border border-slate-200/90 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_11rem_11rem]">
            <label className="block text-sm">
              <span className="mb-1 block pl-3 font-medium text-slate-600">Search trainees</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or email…"
                className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm"
              />
            </label>
            {role === "super_admin" ? (
              <div className="flex flex-col gap-1">
                <span className="pl-3 text-sm font-medium text-slate-600">Organization</span>
                <FilterSelect
                  ariaLabel="Organization filter"
                  value={organizationFilter}
                  onChange={setOrganizationFilter}
                  options={[{ value: "all", label: "All organizations" }, ...organizationOptions]}
                  className="h-10"
                />
              </div>
            ) : (
              <div className="hidden lg:block" />
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-1 block pl-3 font-medium text-slate-600">Priority</span>
                <select
                  value={priorityDraft}
                  onChange={(event) => setPriorityDraft(event.target.value as AlertReviewAssignmentPriority)}
                  className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block pl-3 font-medium text-slate-600">Due date</span>
                <input
                  type="date"
                  value={dueDateDraft}
                  onChange={(event) => setDueDateDraft(event.target.value)}
                  className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-y-auto rounded-[0.95rem] border border-slate-200/85 bg-slate-50/75">
            {loading ? (
              <div className="px-4 py-3 text-sm text-slate-500">Loading trainees…</div>
            ) : filteredTrainees.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-500">No trainees available for this view.</div>
            ) : (
              <ul className="divide-y divide-slate-200/80">
                {filteredTrainees.map((trainee) => {
                  const checked = selectedTraineeIds.includes(trainee.id);
                  return (
                    <li key={trainee.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <label className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTrainee(trainee.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--brand-700)] focus:ring-[var(--brand-400)]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {formatTraineeLabel(trainee)}
                          </span>
                          {trainee.organization_name ? (
                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {trainee.organization_name}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {selectedTraineeIds.length === 0
                ? "Select one or more trainees."
                : `${selectedTraineeIds.length} trainee${selectedTraineeIds.length === 1 ? "" : "s"} selected`}
            </p>
            <button
              type="button"
              disabled={assignBusy || selectedTraineeIds.length === 0}
              onClick={() => void assignSelected()}
              className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-60"
            >
              {assignBusy ? "Assigning…" : "Assign selected"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm text-slate-500">
            Loading assignments…
          </div>
        ) : cases.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-500">
            No trainee cases on this alert yet. Staff assignments and self-assignments will appear here.
          </div>
        ) : visibleCases.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-500">
            No cases in this category. Choose another filter above.
          </div>
        ) : (
          visibleCases.map((assignment) => {
            const isStaffCase = assignment.caseSource === "staff";
            return (
              <article key={assignment.id} className="content-panel space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{assignment.trainee_label}</p>
                      {assignment.organization_name ? (
                        <span className="ui-badge ui-badge-neutral">{assignment.organization_name}</span>
                      ) : null}
                      <span
                        className={`ui-badge ${isStaffCase ? "ui-badge-blue" : "ui-badge-neutral"}`}
                        title={isStaffCase ? "Assigned via staff workflow" : "Trainee took the alert from the queue"}
                      >
                        {isStaffCase ? "Staff assign" : "Self-assign"}
                      </span>
                      {isStaffCase ? (
                        <span className={`ui-badge ${priorityBadgeClass(assignment.priority)}`}>{assignment.priority}</span>
                      ) : null}
                      <span className={`ui-badge ${progressBadgeClass(assignment.progress, assignment.is_overdue)}`}>
                        {progressLabel(assignment.progress, assignment.is_overdue)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {isStaffCase ? (
                        <>
                          Assigned by {assignment.assigned_by_label} on {formatDateTime(assignment.created_at)}
                        </>
                      ) : (
                        <>Self-assigned on {formatDateTime(assignment.created_at)}</>
                      )}
                    </p>
                  </div>
                  {assignment.latest_thread_id ? (
                    <Link
                      href={`/alerts/${alertId}?reviewThread=${encodeURIComponent(assignment.latest_thread_id)}`}
                      className="ui-btn ui-btn-secondary min-h-0 rounded-[0.9rem] px-3 py-1.5 text-xs"
                    >
                      Open trainee case
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">No review case yet</span>
                  )}
                </div>

                {isStaffCase ? (
                  <div className="grid gap-3 lg:grid-cols-[9rem_11rem_auto_1fr] lg:items-end">
                    <label className="block text-sm">
                      <span className="mb-1 block pl-3 font-medium text-slate-600">Priority</span>
                      <select
                        value={assignment.priority}
                        disabled={rowBusyId === assignment.id}
                        onChange={(event) =>
                          void savePriority(assignment.id, event.target.value as AlertReviewAssignmentPriority)
                        }
                        className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block pl-3 font-medium text-slate-600">Due date</span>
                      <input
                        type="date"
                        disabled={rowBusyId === assignment.id}
                        defaultValue={isoToDateInput(assignment.due_at)}
                        onChange={(event) => void saveDueDate(assignment.id, event.target.value)}
                        className="dark-input h-10 w-full rounded-[0.65rem] px-4 text-sm"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={rowBusyId === assignment.id}
                      onClick={() => void unassign(assignment.id)}
                      className="ui-btn ui-btn-secondary h-10 min-h-0 rounded-[0.65rem] px-4 text-sm font-medium text-rose-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-60"
                    >
                      {rowBusyId === assignment.id ? "Saving…" : "Unassign"}
                    </button>

                    <div className="text-sm text-slate-500">
                      {assignment.due_at ? (
                        <p>Due {formatDate(assignment.due_at)}</p>
                      ) : (
                        <p>No due date set.</p>
                      )}
                      {assignment.latest_submission ? (
                        <p className="mt-1">
                          Latest submission: v{assignment.latest_submission.submission_version} on{" "}
                          {formatDateTime(assignment.latest_submission.submitted_at)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    <p>Priority and due date apply to staff-issued assignments only.</p>
                    {assignment.latest_submission ? (
                      <p className="mt-1">
                        Latest submission: v{assignment.latest_submission.submission_version} on{" "}
                        {formatDateTime(assignment.latest_submission.submitted_at)}
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-400">No submission yet.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
