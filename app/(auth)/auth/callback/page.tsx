"use client";

import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finalizing sign in...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setMessage(`Sign-in failed: ${error.message}`);
          return;
        }
      }

      // app_users is created by DB trigger; we do not create it client-side.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setMessage("Session is not ready. Please try sign in again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-8">
      <div className="w-full rounded border border-slate-300 bg-white p-6 text-center text-slate-900">
        <p className="text-sm">{message}</p>
      </div>
    </main>
  );
}
