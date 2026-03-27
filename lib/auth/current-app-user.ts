import type { AppUserRole } from "@/lib/app-user-role";
import type { AppUserRow } from "@/lib/types";
import type { AuthError, PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";

export type CurrentAppUserContext = {
  authUser: User | null;
  appUser: AppUserRow | null;
  role: AppUserRole | null;
  error: AuthError | PostgrestError | null;
};

/**
 * Canonical current-actor resolution path:
 * session -> auth.uid() -> public.app_users.auth_user_id
 */
export async function getCurrentAppUser(
  supabase: SupabaseClient
): Promise<CurrentAppUserContext> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    return {
      authUser: null,
      appUser: null,
      role: null,
      error: authErr,
    };
  }

  if (!user) {
    return {
      authUser: null,
      appUser: null,
      role: null,
      error: null,
    };
  }

  const { row, error } = await fetchAppUserRow(supabase, user);

  return {
    authUser: user,
    appUser: row,
    role: row?.role ?? null,
    error,
  };
}

export async function requireCurrentAppUser(
  supabase: SupabaseClient
): Promise<CurrentAppUserContext> {
  return getCurrentAppUser(supabase);
}
