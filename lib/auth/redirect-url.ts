export function getAuthRedirectUrl(path: string): string | undefined {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://riskopslab.com";
  if (!base) return undefined;
  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
}
