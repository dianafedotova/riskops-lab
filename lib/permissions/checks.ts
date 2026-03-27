import { canAccessStaffFeatures, isTrainee, type AppUserRole } from "@/lib/app-user-role";

export function canAccessAdminRoute(role: AppUserRole | string | null | undefined): boolean {
  return canAccessStaffFeatures(role);
}

export function canSeeAdminNavLink(role: AppUserRole | string | null | undefined): boolean {
  return canAccessAdminRoute(role);
}

export function canSeeAdminPanel(role: AppUserRole | string | null | undefined): boolean {
  return canAccessAdminRoute(role);
}

export function canSeeStaffActionControls(role: AppUserRole | string | null | undefined): boolean {
  return canAccessStaffFeatures(role);
}

export function canSeeTraineeWorkspace(role: AppUserRole | string | null | undefined): boolean {
  return isTrainee(role);
}

export function canDeactivateOwnAccount(role: AppUserRole | string | null | undefined): boolean {
  return canSeeTraineeWorkspace(role);
}

export function canReplyAsQA(role: AppUserRole | string | null | undefined): boolean {
  return canAccessStaffFeatures(role);
}

export function canViewPrivateNotes(role: AppUserRole | string | null | undefined): boolean {
  return canAccessStaffFeatures(role);
}

export function canCreatePrivateNotes(role: AppUserRole | string | null | undefined): boolean {
  return canViewPrivateNotes(role);
}

export function canWriteTraineeDiscussion(role: AppUserRole | string | null | undefined): boolean {
  return isTrainee(role);
}
