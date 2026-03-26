"use client";

import { runSerializedAuth } from "@/lib/auth/auth-user-queue";
import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
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
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr) {
          setError(authErr.message);
          setAuthUser(null);
          setAppUser(null);
          return;
        }
        setAuthUser(user);
        if (!user) {
          setAppUser(null);
          return;
        }
        const { row, error: appErr } = await fetchAppUserRow(supabase, user);
        if (appErr) {
          setError(appErr.message);
          setAppUser(null);
        } else {
          setAppUser(row);
        }
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
