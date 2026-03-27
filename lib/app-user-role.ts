/** Canonical app roles stored in public.app_users.role. */
export type AppUserRole = "trainee" | "reviewer" | "ops_admin" | "super_admin";

/** Base staff roles. */
export const STAFF_ROLES = ["reviewer", "ops_admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type AppUserRoleFlags = {
  isSuperAdmin: boolean;
  isOpsAdmin: boolean;
  isReviewer: boolean;
  isTrainee: boolean;
  isBaseStaff: boolean;
  canAccessStaffFeatures: boolean;
};

export function isSuperAdmin(role: string | null | undefined): role is "super_admin" {
  return role === "super_admin";
}

export function isOpsAdmin(role: string | null | undefined): role is "ops_admin" {
  return role === "ops_admin";
}

export function isReviewer(role: string | null | undefined): role is "reviewer" {
  return role === "reviewer";
}

export function isTrainee(role: string | null | undefined): role is "trainee" {
  return role === "trainee";
}

/**
 * Staff-level access.
 * Super admin inherits all staff capabilities.
 */
export function canAccessStaffFeatures(role: string | null | undefined): boolean {
  return role === "reviewer" || role === "ops_admin" || role === "super_admin";
}

/**
 * Base staff roles only, excluding super admin.
 * Use only when you explicitly need to distinguish staff from super admin.
 */
export function isBaseStaffRole(role: string | null | undefined): role is StaffRole {
  return role != null && (STAFF_ROLES as readonly string[]).includes(role);
}

export function getAppUserRoleFlags(role: string | null | undefined): AppUserRoleFlags {
  return {
    isSuperAdmin: isSuperAdmin(role),
    isOpsAdmin: isOpsAdmin(role),
    isReviewer: isReviewer(role),
    isTrainee: isTrainee(role),
    isBaseStaff: isBaseStaffRole(role),
    canAccessStaffFeatures: canAccessStaffFeatures(role),
  };
}

/** Profile / read-only label (e.g. ops_admin -> Ops Admin). */
export function formatAppUserRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}
