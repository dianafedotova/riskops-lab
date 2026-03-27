import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import {
  buildTraineeWatchlistInsertRow,
  resolveTraineeWatchlistSimulatorColumn,
} from "@/lib/trainee-user-watchlist";

export type TraineeWatchedUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export async function listWatchlistUsersForTrainee(
  supabase: SupabaseClient,
  traineeAppUserId: string
): Promise<{ users: TraineeWatchedUserRow[]; error: Error | null }> {
  const simulatorColumn = await resolveTraineeWatchlistSimulatorColumn(supabase);
  const { data: watchRows, error: watchError } = await supabase
    .from("trainee_user_watchlist")
    .select(`${simulatorColumn}, created_at`)
    .eq("app_user_id", traineeAppUserId)
    .order("created_at", { ascending: false });

  if (watchError) {
    return { users: [], error: new Error(watchError.message) };
  }

  const simulatorUserIds = (watchRows ?? [])
    .map((row) => (row as Record<string, string | null>)[simulatorColumn])
    .filter(Boolean) as string[];

  if (simulatorUserIds.length === 0) {
    return { users: [], error: null };
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", simulatorUserIds);

  if (usersError) {
    return { users: [], error: new Error(usersError.message) };
  }

  return {
    users: (users as TraineeWatchedUserRow[]) ?? [],
    error: null,
  };
}

export async function isSimulatorUserWatchedByTrainee(
  supabase: SupabaseClient,
  traineeAppUserId: string,
  simulatorUserId: string
): Promise<{ watched: boolean; error: Error | null }> {
  const simulatorColumn = await resolveTraineeWatchlistSimulatorColumn(supabase);
  let query = supabase.from("trainee_user_watchlist").select("id").eq("app_user_id", traineeAppUserId);
  query = query.eq(simulatorColumn, simulatorUserId);
  const { data, error } = await query.maybeSingle();

  if (error) {
    return { watched: false, error: new Error(error.message) };
  }

  return { watched: Boolean(data), error: null };
}

function isDuplicateInsertError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "23505";
}

export async function addSimulatorUserToWatchlist(
  supabase: SupabaseClient,
  traineeAppUserId: string,
  simulatorUserId: string
): Promise<{ error: Error | null }> {
  const simulatorColumn = await resolveTraineeWatchlistSimulatorColumn(supabase);
  const insertRow = buildTraineeWatchlistInsertRow(traineeAppUserId, simulatorUserId, simulatorColumn);
  const { error } = await supabase.from("trainee_user_watchlist").insert(insertRow);

  if (error && !isDuplicateInsertError(error)) {
    return { error: new Error(error.message) };
  }

  await recordAppUserActivity(supabase, {
    appUserId: traineeAppUserId,
    eventType: "watchlist_item_added",
    meta: {
      simulator_user_id: simulatorUserId,
    },
  });

  return { error: null };
}

export async function removeSimulatorUserFromWatchlist(
  supabase: SupabaseClient,
  traineeAppUserId: string,
  simulatorUserId: string
): Promise<{ error: Error | null }> {
  const simulatorColumn = await resolveTraineeWatchlistSimulatorColumn(supabase);
  let query = supabase.from("trainee_user_watchlist").delete().eq("app_user_id", traineeAppUserId);
  query = query.eq(simulatorColumn, simulatorUserId);
  const { error } = await query;
  if (error) {
    return { error: new Error(error.message) };
  }

  await recordAppUserActivity(supabase, {
    appUserId: traineeAppUserId,
    eventType: "watchlist_item_removed",
    meta: {
      simulator_user_id: simulatorUserId,
    },
  });

  return { error: null };
}
