"use client";

import {
  createTraineeDecision,
  deleteTraineeDecisionsForThreadActor,
  listTraineeDecisions,
} from "@/lib/services/trainee-decisions";
import { createClient } from "@/lib/supabase";
import type { TraineeDecisionRow } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export function useTraineeDecisions(threadId: string | null) {
  const [decisions, setDecisions] = useState<TraineeDecisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!threadId) {
        setDecisions([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      setLoading(true);
      setError(null);
      const result = await listTraineeDecisions(supabase, threadId);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setDecisions([]);
      } else {
        setDecisions(result.decisions);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [threadId, reloadTick]);

  const refresh = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const submitDecision = useCallback(
    async (args: {
      appUserId: string;
      alertId: string | null;
      userId: string | null;
      decision: TraineeDecisionRow["decision"];
      proposedAlertStatus: string | null;
      rationale: string | null;
      reviewState?: string | null;
    }) => {
      if (!threadId) throw new Error("No cases for review");
      const supabase = createClient();
      const result = await createTraineeDecision(supabase, {
        threadId,
        appUserId: args.appUserId,
        alertId: args.alertId,
        userId: args.userId,
        decision: args.decision,
        proposedAlertStatus: args.proposedAlertStatus,
        rationale: args.rationale,
        reviewState: args.reviewState,
      });
      if (result.error) throw new Error(result.error);
      refresh();
    },
    [threadId, refresh]
  );

  const resetDecision = useCallback(
    async (appUserId: string) => {
      if (!threadId) throw new Error("No cases for review");
      const supabase = createClient();
      const result = await deleteTraineeDecisionsForThreadActor(supabase, {
        threadId,
        appUserId,
      });
      if (result.error) throw new Error(result.error);
      refresh();
    },
    [threadId, refresh]
  );

  return { decisions, loading, error, refresh, submitDecision, resetDecision };
}
