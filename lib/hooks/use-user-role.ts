"use client";

import { useCurrentUser } from "@/lib/hooks/use-current-user";

/** Convenience wrapper around useCurrentUser().role */
export function useUserRole() {
  const { role, loading, appUser } = useCurrentUser();
  return { role, loading, isAdmin: role === "admin", isTrainee: role === "user", appUser };
}
