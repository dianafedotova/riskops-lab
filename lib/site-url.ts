/**
 * Canonical site origin for server-side metadata and absolute URLs.
 * On Vercel, `VERCEL_URL` is set at runtime; prefer `NEXT_PUBLIC_SITE_URL` for a custom production domain.
 */
export function getSiteOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^\/+/, "")}`;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://riskopslab.com";
}
