import { getSiteOrigin } from "@/lib/site-url";

export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getPublicSiteOrigin(): string {
  return getSiteOrigin();
}

export function getGtmId(): string {
  return trimEnv(process.env.NEXT_PUBLIC_GTM_ID);
}

export function getSilktideCssUrl(): string {
  return trimEnv(process.env.NEXT_PUBLIC_SILKTIDE_CSS_URL);
}

export function getSilktideJsUrl(): string {
  return trimEnv(process.env.NEXT_PUBLIC_SILKTIDE_JS_URL);
}

export function getSilktideConfig(): Record<string, unknown> | null {
  const raw = trimEnv(process.env.NEXT_PUBLIC_SILKTIDE_CONFIG_JSON);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getGoogleSiteVerification(): string {
  return trimEnv(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION);
}

export function getBingSiteVerification(): string {
  return trimEnv(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION);
}

export function getIndexNowKey(): string {
  return trimEnv(process.env.INDEXNOW_KEY);
}

export function getIndexNowKeyLocation(origin: string = getPublicSiteOrigin()): string {
  return `${origin.replace(/\/+$/, "")}${INDEXNOW_KEY_PATH}`;
}
