import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAlertReviewThreadForContext, ensureProfileReviewThreadForContext } from "@/lib/services/review-threads";

export async function ensureAlertReviewThread(
  supabase: SupabaseClient,
  appUserId: string,
  alertInternalId: string
): Promise<{ threadId: string; error: Error | null }> {
  return ensureAlertReviewThreadForContext(supabase, appUserId, {
    publicId: null,
    internalId: alertInternalId,
  });
}

export async function ensureUserReviewThread(
  supabase: SupabaseClient,
  appUserId: string,
  simulatorUserId: string
): Promise<{ threadId: string; error: Error | null }> {
  return ensureProfileReviewThreadForContext(supabase, appUserId, simulatorUserId);
}
