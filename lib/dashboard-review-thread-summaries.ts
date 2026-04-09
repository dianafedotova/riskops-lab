import type { SupabaseClient } from "@supabase/supabase-js";
import { loadTraineeCasesAndKpi } from "@/lib/trainee-cases";

export type DashboardThreadSummary = {
  threadId: string;
  targetHref: string;
  targetLabel: string;
  lastSnippet: string;
  updatedAt: string;
};

/**
 * @deprecated Prefer `loadTraineeCasesAndKpi` for cases + KPI. Kept for callers that only need a short summary list.
 */
export async function loadReviewThreadSummariesForDashboard(
  supabase: SupabaseClient,
  appUserId: string
): Promise<{ summaries: DashboardThreadSummary[]; error: string | null }> {
  const { cases, error } = await loadTraineeCasesAndKpi(supabase, appUserId, { threadLimit: 25 });
  if (error) {
    return { summaries: [], error };
  }
  const summaries: DashboardThreadSummary[] = cases.map((c) => ({
    threadId: c.threadId,
    targetHref: c.targetHref,
    targetLabel: c.targetLabel,
    lastSnippet: c.lastSnippet,
    updatedAt: c.updatedAt,
  }));
  return { summaries, error: null };
}
