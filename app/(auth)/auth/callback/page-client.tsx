"use client";

import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  code: string | null;
};

export function AuthCallbackClient({ code }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("Finalizing sign in...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setMessage(`Sign-in failed: ${error.message}`);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setMessage("Session is not ready. Please try sign in again.");
        return;
      }
      const { row: profile } = await fetchAppUserRow(supabase, user);
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (!cancelled) {
          router.replace("/sign-in?reason=inactive");
          router.refresh();
        }
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-8">
      <div className="w-full rounded border border-slate-300 bg-white p-6 text-center text-slate-900">
        <p className="text-sm">{message}</p>
      </div>
    </main>
  );
}
