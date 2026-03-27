"use client";

import { runSerializedAuth } from "@/lib/auth/auth-user-queue";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

export type CurrentUserInitialSession = {
  authUser: User | null;
  appUser: AppUserRow | null;
};

export function useCurrentUser(initialSession?: CurrentUserInitialSession) {
  const hadServerSession = useRef(initialSession !== undefined);
  const [authUser, setAuthUser] = useState<User | null>(() => initialSession?.authUser ?? null);
  const [appUser, setAppUser] = useState<AppUserRow | null>(() => initialSession?.appUser ?? null);
  const [loading, setLoading] = useState(() => initialSession === undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading: boolean) => {
    setError(null);
    if (showLoading) setLoading(true);
    try {
      await runSerializedAuth(async () => {
        const supabase = createClient();
        const ctx = await getCurrentAppUser(supabase);
        setAuthUser(ctx.authUser);
        setAppUser(ctx.appUser);
        if (ctx.error) setError(ctx.error.message);
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(!hadServerSession.current);
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION is redundant with the refresh() above; handling it again races other hooks' getUser().
      if (event === "INITIAL_SESSION") return;
      void refresh(false);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return {
    authUser,
    appUser,
    loading,
    error,
    refresh,
    role: appUser?.role ?? null,
  };
}
