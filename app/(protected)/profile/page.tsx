import { appUserProfileHeading } from "@/lib/auth/app-user-display";
import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
import { ProfileDeactivateAccount } from "@/components/profile-deactivate-account";
import { ProfileDetailsForm } from "@/components/profile-details-form";
import { ProfileIdentityHeader } from "@/components/profile-identity-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { row: appUser, error } = await fetchAppUserRow(supabase, user);
  if (!error && !appUser) {
    redirect("/signup?need_app_user=1");
  }
  const profileHeading = appUserProfileHeading(appUser);

  return (
    <div className="main-content-shell p-3 sm:p-5 md:p-6">
      <div className="space-y-4">
        <nav className="text-sm text-slate-600">
          <Link href="/dashboard" className="font-medium text-[#2d5f70] hover:underline">
            Dashboard
          </Link>
          <span className="mx-2 text-slate-400" aria-hidden>
            /
          </span>
          <span className="text-slate-800">My profile</span>
        </nav>

        <section className="page-panel surface-lift overflow-hidden p-4 sm:p-6">
          <ProfileIdentityHeader
            appUser={appUser}
            displayName={profileHeading}
            subtitle="Account details and profile settings."
          />

          {/* sm:pl-40 = avatar column (w-32) + gap-8, aligns heading block on desktop */}
          <div className="sm:pl-40">
            {error ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Could not load profile data: {error.message}
              </p>
            ) : null}

            <ProfileDetailsForm appUser={appUser} authEmail={user.email ?? ""} />
            <ProfileDeactivateAccount appUser={appUser} />
          </div>
        </section>
      </div>
    </div>
  );
}
