/**
 * OAuth / email redirect base URL (runs in the browser). Uses public env only.
 * On Vercel, `next.config` injects `NEXT_PUBLIC_VERCEL_URL` from `VERCEL_URL` at build time
 * so preview deployments get correct callbacks without setting `NEXT_PUBLIC_SITE_URL` per branch.
 */
export function getAuthRedirectUrl(path: string): string | undefined {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://riskopslab.com");
  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
}
