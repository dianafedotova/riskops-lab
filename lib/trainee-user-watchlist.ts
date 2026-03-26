import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/** Matches `public.trainee_user_watchlist` in `supabase/schema.sql`. Some projects created the FK column as `user_id` instead. */
export type TraineeWatchlistSimulatorColumn = "simulator_user_id" | "user_id";

let cachedSimulatorColumn: TraineeWatchlistSimulatorColumn | null = null;

/** True when PostgREST rejects a `.select()` list (wrong column names for this project’s DB). */
export function isPostgrestUnknownColumnError(error: PostgrestError): boolean {
  const m = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (m.includes("schema cache") && m.includes("could not find")) ||
    (m.includes("column") && (m.includes("could not find") || m.includes("does not exist")))
  );
}

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

export function formatPostgrestError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const e = error as PostgrestError;
    const base = [e.message, e.details, e.hint].filter(Boolean).join(" — ");
    if (base) return base;
  }
  if (error instanceof Error) {
    const c = error.cause;
    const causeMsg = c instanceof Error ? c.message : typeof c === "string" ? c : "";
    return [error.message, causeMsg].filter(Boolean).join(" — ") || "Request failed";
  }
  return String(error);
}
