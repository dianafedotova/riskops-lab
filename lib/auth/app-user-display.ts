import type { AppUserRow } from "@/lib/types";

type NameFields = Pick<AppUserRow, "full_name" | "first_name" | "last_name" | "email">;

/** Profile page title: first + last (either may be omitted), else full_name, else fallback. */
export function appUserProfileHeading(
  row: Pick<AppUserRow, "first_name" | "last_name" | "full_name"> | null,
  fallback = "Unknown User",
): string {
  if (!row) return fallback;
  const first = row.first_name?.trim() ?? "";
  const last = row.last_name?.trim() ?? "";
  if (first && last) return `${first} ${last}`;
  if (first || last) return first || last;
  const full = row.full_name?.trim();
  if (full) return full;
  return fallback;
}

export function appUserDisplayName(row: NameFields | null, authEmail?: string | null): string {
  if (row) {
    const fn = row.full_name?.trim();
    if (fn) return fn;
    const parts = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean);
    if (parts.length) return parts.join(" ");
    const em = row.email?.trim();
    if (em) return em;
  }
  const em = authEmail?.trim();
  if (em) return em;
  return "User";
}

export function appUserDisplayCountry(row: Pick<AppUserRow, "country_name" | "country_code"> | null): string | null {
  if (!row) return null;
  if (row.country_name?.trim()) return row.country_name.trim();
  if (row.country_code?.trim()) return row.country_code.trim();
  return null;
}

export function appUserInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0];
    const b = parts[parts.length - 1]![0];
    if (a && b) return (a + b).toUpperCase();
  }
  const one = parts[0] ?? "?";
  return one.slice(0, 2).toUpperCase();
}
