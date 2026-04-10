import { getSiteOrigin } from "@/lib/site-url";

export const PUBLIC_BETA_NAME = "RiskOps Lab";
export const PUBLIC_BETA_DESCRIPTION =
  "Public beta training workspace for fraud and AML investigation practice with synthetic data only.";
export const SYNTHETIC_ONLY_MESSAGE =
  "Use synthetic or fictional data only. Never enter real customer records, credentials, or live case materials.";

const DEFAULT_SUPPORT_EMAIL = "support@riskopslab.com";

export function getPublicSiteOrigin(): string {
  return getSiteOrigin();
}

export function getSupportEmail(): string {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_SUPPORT_EMAIL;
}

export function getSupportMailtoHref(subject?: string): string {
  const email = getSupportEmail();
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function isTurnstileEnabled(): boolean {
  return getTurnstileSiteKey().length > 0;
}
