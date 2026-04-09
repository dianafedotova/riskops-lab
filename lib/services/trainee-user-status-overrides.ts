import type { TraineeUserStatusOverrideRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const OVERRIDE_COLS = "id, app_user_id, user_id, status, created_at, updated_at" as const;

export async function getTraineeUserStatusOverride(
  supabase: SupabaseClient,
  args: { appUserId: string; userId: string }
): Promise<{ override: TraineeUserStatusOverrideRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("trainee_user_status_overrides")
    .select(OVERRIDE_COLS)
    .eq("app_user_id", args.appUserId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (error) {
    return { override: null, error: error.message };
  }

  return {
    override: data ? normalizeOverrideRow(data as TraineeUserStatusOverrideRow) : null,
    error: null,
  };
}

export async function upsertTraineeUserStatusOverride(
  supabase: SupabaseClient,
  args: { appUserId: string; userId: string; status: string }
): Promise<{ override: TraineeUserStatusOverrideRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("trainee_user_status_overrides")
    .upsert(
      {
        app_user_id: args.appUserId,
        user_id: args.userId,
        status: args.status,
      },
      {
        onConflict: "app_user_id,user_id",
      }
    )
    .select(OVERRIDE_COLS)
    .single();

  if (error) {
    return { override: null, error: error.message };
  }

  return {
    override: data ? normalizeOverrideRow(data as TraineeUserStatusOverrideRow) : null,
    error: null,
  };
}

function normalizeOverrideRow(row: TraineeUserStatusOverrideRow): TraineeUserStatusOverrideRow {
  return {
    ...row,
    id: String(row.id),
    app_user_id: String(row.app_user_id),
    user_id: String(row.user_id),
    status: String(row.status),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
