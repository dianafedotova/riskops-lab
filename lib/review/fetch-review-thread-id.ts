import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAlertReviewThreadIdForContext, fetchProfileReviewThreadIdForContext } from "@/lib/services/review-threads";

/**
 * Resolve review_threads.id for an alert (internal_id).
 * When appUserId is set (trainee), returns that user's thread only.
 * When omitted (e.g. admin), returns the most recently created thread for the alert.
 */
export async function fetchReviewThreadIdForAlert(
  supabase: SupabaseClient,
  alertInternalId: string,
  appUserId?: string | null
): Promise<{ threadId: string | null; error: Error | null }> {
  return fetchAlertReviewThreadIdForContext(
    supabase,
    { publicId: null, internalId: alertInternalId },
    appUserId
  );
}

/**
 * Resolve review_threads.id for a simulator user profile workspace.
 * When appUserId is set (trainee), scopes to that trainee + profile.
 * When omitted (admin), latest thread for that simulator user across trainees.
 */
export async function fetchReviewThreadIdForProfile(
  supabase: SupabaseClient,
  simulatorUserId: string,
  appUserId?: string | null
): Promise<{ threadId: string | null; error: Error | null }> {
  return fetchProfileReviewThreadIdForContext(supabase, simulatorUserId, appUserId);
}
