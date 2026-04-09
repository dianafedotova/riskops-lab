"use client";

import { canAccessStaffFeatures, isTrainee } from "@/lib/app-user-role";
import { useCurrentUser } from "@/components/current-user-provider";
import { canSeeAdminPanel } from "@/lib/permissions/checks";

export function useReviewWorkspaceActor() {
  const currentUser = useCurrentUser();
  const role = currentUser.appUser?.role ?? null;

  return {
    ...currentUser,
    role,
    isTraineeActor: isTrainee(role),
    hasStaffAccess: canAccessStaffFeatures(role),
    canViewAdminPanel: canSeeAdminPanel(role),
  };
}
