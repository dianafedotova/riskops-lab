import { canSeeStaffActionControls } from "@/lib/permissions/checks";
import type { AppUserRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffViewer = Pick<
  AppUserRow,
  "id" | "role" | "organization_id" | "full_name" | "email"
> | null | undefined;

export function normalizeText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeRequiredText(
  value: string | null | undefined,
  fieldLabel: string,
  errors: string[]
): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    errors.push(`${fieldLabel} is required.`);
    return null;
  }
  return trimmed;
}

export function normalizeNumber(
  value: number | string | null | undefined,
  fieldLabel: string,
  errors: string[]
): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`${fieldLabel} must be a valid number.`);
      return null;
    }
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldLabel} must be a valid number.`);
    return null;
  }
  return parsed;
}

export function normalizeDateTime(
  value: string | null | undefined,
  fieldLabel: string,
  errors: string[]
): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldLabel} must be a valid date/time.`);
    return null;
  }
  return parsed.toISOString();
}

export function ensureStaffViewer(viewer: StaffViewer): string | null {
  if (!canSeeStaffActionControls(viewer?.role)) return "Staff access is required.";
  if (!viewer?.organization_id) return "Current staff organization is missing.";
  return null;
}

export async function ensureVisibleUsers(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ ids: Set<string>; error: string | null }> {
  if (userIds.length === 0) return { ids: new Set(), error: null };

  const { data, error } = await supabase.from("users").select("id").in("id", userIds);
  if (error) return { ids: new Set(), error: error.message };

  return {
    ids: new Set((((data as Array<{ id: string }> | null) ?? []).map((row) => String(row.id)))),
    error: null,
  };
}

export function generateUuidLikeValue(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `sim-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function viewerActorLabel(viewer: StaffViewer): string {
  const fullName = normalizeText(viewer?.full_name);
  if (fullName) return fullName;
  const email = normalizeText(viewer?.email);
  if (email) return email;
  return String(viewer?.id ?? "staff");
}

export function shouldRetryWithLegacyShape(errorMessage: string | null | undefined): boolean {
  const message = (errorMessage ?? "").toLowerCase();
  if (!message) return false;
  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the") ||
    message.includes("record ") && message.includes("has no field")
  );
}
