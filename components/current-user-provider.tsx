"use client";

import {
  useCurrentUserState,
  type CurrentUserInitialSession,
} from "@/lib/hooks/use-current-user";
import { createContext, useContext, type ReactNode } from "react";

type CurrentUserContextValue = ReturnType<typeof useCurrentUserState>;

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  initialSession,
  children,
}: {
  initialSession?: CurrentUserInitialSession;
  children: ReactNode;
}) {
  const value = useCurrentUserState(initialSession);
  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}

export type { CurrentUserInitialSession };
