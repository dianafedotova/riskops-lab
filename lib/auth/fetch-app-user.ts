import type { AppUserProfileRow, AppUserRow } from "@/lib/types";
import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

const APP_USER_SELECT =
  "id, auth_user_id, role, email, created_at, full_name, first_name, last_name, country_code, country_name, avatar_url, provider, status, is_active, last_login_at, updated_at" as const;

const PROFILE_SELECT = "app_user_id, first_name, last_name, country_code, updated_at" as const;

function emailForIlikeEq(email: string): string {
  return email.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function mergeProfile(base: AppUserRow, profile: AppUserProfileRow | null): AppUserRow {
  if (!profile) return base;
  const fn = profile.first_name ?? base.first_name;
  const ln = profile.last_name ?? base.last_name;
  const cc = profile.country_code ?? base.country_code;
  const built =
    [fn?.trim(), ln?.trim()].filter(Boolean).join(" ").trim() || base.full_name;
  return {
    ...base,
    first_name: fn,
    last_name: ln,
    country_code: cc,
    full_name: built?.length ? built : base.full_name,
  };
}

/** Load `app_user_profiles` when a row exists; does not insert. */
async function loadAppUserProfile(
  supabase: SupabaseClient,
  row: AppUserRow
): Promise<{ row: AppUserRow; error: PostgrestError | null }> {
  const prof = await supabase
    .from("app_user_profiles")
    .select(PROFILE_SELECT)
    .eq("app_user_id", row.id)
    .maybeSingle();
  if (prof.error) return { row, error: prof.error };
  if (prof.data) {
    return { row: mergeProfile(row, prof.data as AppUserProfileRow), error: null };
  }
  return { row: mergeProfile(row, null), error: null };
}

/**
 * Loads `app_users` for the signed-in Supabase user.
 * Match: `auth.users.id` === `app_users.auth_user_id` (never `app_users.id`).
 * Pass `user` from `await supabase.auth.getUser()`.
 *
 * Returns `{ row: null, error: null }` only when there is no matching `app_users` row.
 */
export async function fetchAppUserRow(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">
): Promise<{ row: AppUserRow | null; error: PostgrestError | null }> {
  console.log("Auth user id:", user.id);

  const { data: appUser, error } = await supabase
    .from("app_users")
    .select(APP_USER_SELECT)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  console.log("App user:", appUser);

  if (error) return { row: null, error };
  if (!appUser && user.email) {
    const byEmail = await supabase
      .from("app_users")
      .select(APP_USER_SELECT)
      .ilike("email", emailForIlikeEq(user.email))
      .maybeSingle();
    if (byEmail.error) return { row: null, error: byEmail.error };
    if (byEmail.data) {
      // Legacy rows can have empty or stale auth_user_id. Rebind to current auth user.
      const rebound = await supabase
        .from("app_users")
        .update({ auth_user_id: user.id })
        .eq("id", (byEmail.data as AppUserRow).id)
        .select(APP_USER_SELECT)
        .single();
      if (rebound.error) return { row: null, error: rebound.error };
      console.log("App user:", rebound.data);
      const { row: merged, error: profileErr } = await loadAppUserProfile(
        supabase,
        rebound.data as AppUserRow,
      );
      if (profileErr) return { row: null, error: profileErr };
      return { row: merged, error: null };
    }
  }
  if (!appUser) return { row: null, error: null };

  const row = appUser as AppUserRow;
  const { row: merged, error: profileErr } = await loadAppUserProfile(supabase, row);
  if (profileErr) return { row: null, error: profileErr };
  return { row: merged, error: null };
}
