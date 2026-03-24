"use client";

import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export function useCurrentUser() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setError(null);
    setLoading(true);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr) {
      setError(authErr.message);
      setAuthUser(null);
      setAppUser(null);
      setLoading(false);
      return;
    }
    setAuthUser(user);
    if (!user) {
      setAppUser(null);
      setLoading(false);
      return;
    }
    const { row, error: appErr } = await fetchAppUserRow(supabase, user);
    if (appErr) {
      setError(appErr.message);
      setAppUser(null);
    } else {
      setAppUser(row);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
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
