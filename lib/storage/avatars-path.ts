/** Bucket used for app user profile avatars (must match upload code). */
export const AVATARS_BUCKET = "avatars";

/**
 * Returns the storage object path inside `avatars`, or null if the value should be used as a normal image URL (e.g. OAuth).
 * Supports:
 * - Raw path: `uuid/avatar.png`
 * - Supabase public URL: `.../storage/v1/object/public/avatars/<path>`
 */
export function avatarsObjectPathFromDbValue(value: string | null | undefined): string | null {
  const t = value?.trim();
  if (!t) return null;

  if (!/^https?:\/\//i.test(t)) {
    if (t.includes("/") && !t.includes("://")) return t;
    return null;
  }

  const marker = "/storage/v1/object/public/avatars/";
  const i = t.indexOf(marker);
  if (i === -1) return null;
  const rest = t.slice(i + marker.length).split("?")[0] ?? "";
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}
