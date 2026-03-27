import { AppNavClient } from "@/components/app-nav-client";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function AppNav() {
  const supabase = await createServerSupabaseClient();
  const { authUser, appUser } = await getCurrentAppUser(supabase);

  return <AppNavClient initialSession={{ authUser, appUser }} />;
}
