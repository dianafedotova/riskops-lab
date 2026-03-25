import type { AppUserRow } from "@/lib/types";
import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

const APP_USER_SELECT =
  "id, auth_user_id, role, email, created_at, full_name, first_name, last_name, country_code, country_name, avatar_url, provider, status, is_active, last_login_at, updated_at" as const;

/** Exact case-insensitive match for PostgREST `ilike` without treating `_` / `%` as wildcards. */
export function emailForIliteralEq(email: string): string {
  return email.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Loads `app_users` for the signed-in Supabase user (auth id, then JWT email).
 * Use everywhere we need a stable profile row (RLS + mis-linked `auth_user_id`).
 */
export async function fetchAppUserRow(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">
): Promise<{ row: AppUserRow | null; error: PostgrestError | null }> {
  const first = await supabase
    .from("app_users")
    .select(APP_USER_SELECT)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (first.error) return { row: null, error: first.error };
  if (first.data) return { row: first.data as AppUserRow, error: null };
  if (user.email && typeof user.email === "string") {
    const second = await supabase
      .from("app_users")
      .select(APP_USER_SELECT)
      .ilike("email", emailForIliteralEq(user.email))
      .maybeSingle();
    if (second.error) return { row: null, error: second.error };
    return { row: (second.data as AppUserRow) ?? null, error: null };
  }
  return { row: null, error: null };
}
