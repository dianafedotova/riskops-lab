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

const HYDRATION_RETRY_MS = 120;
const HYDRATION_MAX_TRIES = 45;

/** Internal hook; app code should use `useCurrentUser` from `current-user-provider`. */
export function useCurrentUserState(initialSession?: CurrentUserInitialSession) {
  const hadServerSession = useRef(initialSession !== undefined);
  const serverHadAuthUser = useRef(Boolean(initialSession?.authUser));
  const isMountedRef = useRef(false);
  const [authUser, setAuthUser] = useState<User | null>(() => initialSession?.authUser ?? null);
  const [appUser, setAppUser] = useState<AppUserRow | null>(() => initialSession?.appUser ?? null);
  const [loading, setLoading] = useState(() => initialSession === undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading: boolean): Promise<User | null> => {
    if (!isMountedRef.current) return null;
    setError(null);
    if (showLoading) setLoading(true);
    let resolvedUser: User | null = null;
    try {
      await runSerializedAuth(async () => {
        if (!isMountedRef.current) return;
        const supabase = createClient();
        const ctx = await getCurrentAppUser(supabase);
        if (!isMountedRef.current) return;
        resolvedUser = ctx.authUser;
        setAuthUser(ctx.authUser);
        setAppUser(ctx.appUser);
        if (ctx.error) setError(ctx.error.message);
      });
    } finally {
      if (showLoading && isMountedRef.current) setLoading(false);
    }
    return resolvedUser;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveHydration = async () => {
      let user = await refresh(!hadServerSession.current);
      if (cancelled) return;

      if (!serverHadAuthUser.current) {
        return;
      }

      let tries = 0;
      while (!cancelled && !user && tries < HYDRATION_MAX_TRIES) {
        await new Promise((r) => setTimeout(r, HYDRATION_RETRY_MS));
        user = await refresh(false);
        tries++;
      }
    };

    void resolveHydration();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      void refresh(false);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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
