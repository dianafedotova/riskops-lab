import { isPostgrestUnknownColumnError } from "@/shared/lib/postgrest";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches `public.trainee_user_watchlist` in `supabase/schema.sql`. Some projects created the FK column as `user_id` instead. */
export type TraineeWatchlistSimulatorColumn = "simulator_user_id" | "user_id";

let cachedSimulatorColumn: TraineeWatchlistSimulatorColumn | null = null;

/**
 * Detects which column stores the simulator `public.users.id` on the first successful probe.
 * Cached for the lifetime of the tab (schema does not change at runtime).
 */
export async function resolveTraineeWatchlistSimulatorColumn(
  supabase: SupabaseClient
): Promise<TraineeWatchlistSimulatorColumn> {
  if (cachedSimulatorColumn) return cachedSimulatorColumn;

  const probe = (col: TraineeWatchlistSimulatorColumn) =>
    supabase.from("trainee_user_watchlist").select(col).limit(1);

  const rSim = await probe("simulator_user_id");
  if (!rSim.error) {
    cachedSimulatorColumn = "simulator_user_id";
    return cachedSimulatorColumn;
  }
  if (!isPostgrestUnknownColumnError(rSim.error)) {
    cachedSimulatorColumn = "simulator_user_id";
    return cachedSimulatorColumn;
  }

  const rUser = await probe("user_id");
  if (!rUser.error) {
    cachedSimulatorColumn = "user_id";
    return cachedSimulatorColumn;
  }

  cachedSimulatorColumn = "simulator_user_id";
  return cachedSimulatorColumn;
}

export function buildTraineeWatchlistInsertRow(
  appUserId: string,
  simulatorUserId: string,
  col: TraineeWatchlistSimulatorColumn
): Record<string, string> {
  if (col === "simulator_user_id") {
    return { app_user_id: appUserId, simulator_user_id: simulatorUserId };
  }
  return { app_user_id: appUserId, user_id: simulatorUserId };
}
