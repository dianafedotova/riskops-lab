import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import type { AlertPublicId, TraineeDecisionRow, TraineeDecisionValue } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const DECISION_COLS =
  "id, thread_id, alert_id, user_id, app_user_id, decision, proposed_alert_status, rationale, review_state, created_at" as const;

export async function listTraineeDecisions(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ decisions: TraineeDecisionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("trainee_decisions")
    .select(DECISION_COLS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return { decisions: [], error: error.message };
  }

  return { decisions: (data as TraineeDecisionRow[]) ?? [], error: null };
}

export async function createTraineeDecision(
  supabase: SupabaseClient,
  args: {
    threadId: string;
    appUserId: string;
    alertId: AlertPublicId | null;
    userId: string | null;
    decision: TraineeDecisionValue;
    proposedAlertStatus: string | null;
    rationale: string | null;
    reviewState?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("trainee_decisions").insert({
    thread_id: args.threadId,
    alert_id: args.alertId,
    user_id: args.userId,
    app_user_id: args.appUserId,
    decision: args.decision,
    proposed_alert_status: args.proposedAlertStatus,
    rationale: args.rationale,
    review_state: args.reviewState ?? "submitted",
  });

  if (error) {
    return { error: error.message };
  }

  await recordAppUserActivity(supabase, {
    appUserId: args.appUserId,
    eventType: "trainee_decision_submitted",
    meta: {
      thread_id: args.threadId,
      alert_id: args.alertId,
      user_id: args.userId,
      decision: args.decision,
      proposed_alert_status: args.proposedAlertStatus,
    },
  });

  return { error: null };
}

export async function deleteTraineeDecisionsForThreadActor(
  supabase: SupabaseClient,
  args: { threadId: string; appUserId: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("trainee_decisions")
    .delete()
    .eq("thread_id", args.threadId)
    .eq("app_user_id", args.appUserId);

  return { error: error?.message ?? null };
}
