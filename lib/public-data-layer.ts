"use client";

import { MARKETING_SURFACE_SESSION_KEY } from "@/lib/marketing-routes";

type PublicDataLayerValue = string | number | boolean | null;

export type PublicDataLayerEventProps = Record<string, PublicDataLayerValue | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function compactProps(props: PublicDataLayerEventProps): Record<string, PublicDataLayerValue> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined)
  ) as Record<string, PublicDataLayerValue>;
}

export function pushPublicDataLayerEvent(
  event: string,
  props: PublicDataLayerEventProps = {}
) {
  if (typeof window === "undefined") return;

  const dataLayer = (window.dataLayer = window.dataLayer ?? []);
  dataLayer.push({
    event,
    event_source: "public_app",
    ...compactProps(props),
  });
}

export function markMarketingSurfaceSessionFlag() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(MARKETING_SURFACE_SESSION_KEY, "1");
  } catch {
    // Ignore storage access failures.
  }
}

export function clearMarketingSurfaceSessionFlag() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(MARKETING_SURFACE_SESSION_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

export function hasMarketingSurfaceSessionFlag(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(MARKETING_SURFACE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
