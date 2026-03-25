import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
import { AppNavClient } from "@/components/app-nav-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function AppNav() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let appUser = null;
  if (user) {
    const { row } = await fetchAppUserRow(supabase, user);
    appUser = row;
  }

  return <AppNavClient initialSession={{ authUser: user, appUser }} />;
}
