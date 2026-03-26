"use client";

import { createClient } from "@/lib/supabase";
import type { TraineeDecisionRow } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const DECISION_COLS =
  "id, thread_id, alert_id, user_id, app_user_id, decision, proposed_alert_status, rationale, review_state, created_at" as const;

export function useTraineeDecisions(threadId: string | null) {
  const [decisions, setDecisions] = useState<TraineeDecisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!threadId) {
      setDecisions([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("trainee_decisions")
      .select(DECISION_COLS)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (qErr) {
      setError(qErr.message);
      setDecisions([]);
    } else {
      setDecisions((data as TraineeDecisionRow[]) ?? []);
    }
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitDecision = useCallback(
    async (args: {
      appUserId: string;
      alertId: string | null;
      userId: string | null;
      decision: string;
      proposedAlertStatus: string | null;
      rationale: string | null;
      reviewState?: string | null;
    }) => {
      if (!threadId) throw new Error("No review thread");
      const supabase = createClient();
      const payload = {
        thread_id: threadId,
        alert_id: args.alertId,
        user_id: args.userId,
        app_user_id: args.appUserId,
        decision: args.decision,
        proposed_alert_status: args.proposedAlertStatus,
        rationale: args.rationale,
        review_state: args.reviewState ?? "submitted",
      };
      console.log("trainee_decisions payload", JSON.stringify(payload, null, 2));

      const result = await supabase.from("trainee_decisions").insert(payload);

      console.log("trainee_decisions result data", result.data ?? null);
      console.log("trainee_decisions result error", result.error ?? null);

      if (result.error) {
        console.error("trainee_decisions error message", result.error.message);
        console.error("trainee_decisions error details", result.error.details);
        console.error("trainee_decisions error hint", result.error.hint);
        console.error("trainee_decisions error code", result.error.code);
        console.error("trainee_decisions full error", JSON.stringify(result.error, null, 2));
      }
      if (result.error) throw result.error;
      await refresh();
    },
    [threadId, refresh]
  );

  const resetDecision = useCallback(
    async (appUserId: string) => {
      if (!threadId) throw new Error("No review thread");
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("trainee_decisions")
        .delete()
        .eq("thread_id", threadId)
        .eq("app_user_id", appUserId);
      if (delErr) throw delErr;
      await refresh();
    },
    [threadId, refresh]
  );

  return { decisions, loading, error, refresh, submitDecision, resetDecision };
}
