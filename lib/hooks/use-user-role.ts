"use client";

import {
  getAppUserRoleFlags,
  type AppUserRole,
} from "@/lib/app-user-role";
import { useCurrentUser } from "@/lib/hooks/use-current-user";

/** Convenience wrapper around useCurrentUser().role */
export function useUserRole() {
  const { role, loading, appUser } = useCurrentUser();
  const normalizedRole = role as AppUserRole | null | undefined;
  const flags = getAppUserRoleFlags(normalizedRole);

  return {
    role: normalizedRole,
    loading,
    appUser,
    ...flags,
  };
}
