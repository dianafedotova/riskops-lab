"use client";

import { Identify, flush, initAll, identify, setUserId, track } from "@amplitude/unified";
import type { AppUserRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY?.trim() ?? "";
const AMPLITUDE_DEV_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AMPLITUDE_DEV?.trim() === "true";
const FIRST_TOUCH_STORAGE_KEY = "rol:amplitude:first-touch";
const FIRST_CASE_OPENED_KEY = "rol:amplitude:first-case-opened";
const SESSION_STARTED_KEY = "rol:amplitude:session-started";

export const AMPLITUDE_MASK_CLASS = "amp-mask";
export const AMPLITUDE_BLOCK_CLASS = "amp-block";

type StoredAttribution = {
  landing_path: string | null;
  referrer: string | null;
  referring_domain: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

type EventProps = Record<string, unknown>;
type AmplitudeOrgContext = {
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
};
type AmplitudeIdentityOptions = {
  organizationName?: string | null;
  organizationSlug?: string | null;
  organizationId?: string | null;
};

let initPromise: Promise<void> | null = null;
let currentAmplitudeOrgContext: AmplitudeOrgContext | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function isLocalHostname(hostname: string | null | undefined) {
  const normalized = (hostname ?? "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isAmplitudeEnabled() {
  if (!isBrowser() || !AMPLITUDE_API_KEY) return false;
  if (AMPLITUDE_DEV_ENABLED) return true;
  if (process.env.NODE_ENV === "production") return true;
  return !isLocalHostname(window.location.hostname);
}

function parseUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw, window.location.origin);
  } catch {
    return null;
  }
}

function getStoredAttribution(): StoredAttribution | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

function buildCurrentAttribution(): StoredAttribution {
  const searchParams = new URLSearchParams(window.location.search);
  const referrerUrl = parseUrl(document.referrer);
  const referrerHost = referrerUrl?.hostname?.trim() || null;
  const currentPath = `${window.location.pathname}${window.location.search}` || "/";

  return {
    landing_path: currentPath,
    referrer: document.referrer?.trim() || null,
    referring_domain: referrerHost,
    source: searchParams.get("utm_source")?.trim() || referrerHost || "direct",
    medium: searchParams.get("utm_medium")?.trim() || (referrerHost ? "referral" : "direct"),
    campaign: searchParams.get("utm_campaign")?.trim() || null,
  };
}

export function captureAmplitudeAttribution() {
  if (!isAmplitudeEnabled()) return;
  if (window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY)) return;
  window.localStorage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(buildCurrentAttribution()));
}

export function initAmplitude() {
  if (!isAmplitudeEnabled()) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = initAll(AMPLITUDE_API_KEY, {
    serverZone: "EU",
    analytics: {
      autocapture: true,
    },
    sessionReplay: {
      sampleRate: 0.5,
      privacyConfig: {
        defaultMaskLevel: "medium",
        maskSelector: [`[data-${AMPLITUDE_MASK_CLASS}]`, `.${AMPLITUDE_MASK_CLASS}`],
        blockSelector: [`[data-${AMPLITUDE_BLOCK_CLASS}]`, `.${AMPLITUDE_BLOCK_CLASS}`],
      },
    },
  }).catch((error) => {
    console.warn("Amplitude init failed", error);
  });

  return initPromise;
}

function withTraineeRole(properties: EventProps = {}) {
  const organizationProperties = currentAmplitudeOrgContext
    ? {
        organization_id: currentAmplitudeOrgContext.organizationId,
        organization_name: currentAmplitudeOrgContext.organizationName,
        organization_slug: currentAmplitudeOrgContext.organizationSlug,
      }
    : {};

  return {
    role: "trainee",
    ...organizationProperties,
    ...properties,
  };
}

function normalizeOrgValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isExcludedAmplitudeOrg(context?: AmplitudeIdentityOptions | AmplitudeOrgContext | null) {
  const name = normalizeOrgValue(context?.organizationName);
  const slug = normalizeOrgValue(context?.organizationSlug);
  return name === "test org" || slug === "test-org";
}

function canTrackTrainee(role: string | null | undefined, context?: AmplitudeIdentityOptions | null) {
  if (role !== "trainee") return false;
  const effectiveContext = context ?? currentAmplitudeOrgContext;
  return !isExcludedAmplitudeOrg(effectiveContext);
}

export function getAmplitudeEventSpec() {
  return {
    "Core Identity": {
      signup_completed: {
        properties: ["method", "role", "source", "medium", "campaign", "referrer", "referring_domain", "landing_path"],
      },
      login_completed: {
        properties: ["method", "role", "source", "medium", "campaign", "referrer", "referring_domain", "landing_path"],
      },
      logout_completed: {
        properties: ["method", "role", "source", "medium", "campaign", "referrer", "referring_domain", "landing_path"],
      },
    },
    Activation: {
      dashboard_viewed: { properties: ["role", "is_first_time", "source"] },
      first_case_opened: { properties: ["role", "is_first_time", "source"] },
      guide_viewed: { properties: ["role", "is_first_time", "source"] },
      my_cases_viewed: { properties: ["role", "is_first_time", "source"] },
    },
    "Case Entry": {
      alert_opened: { properties: ["role", "context_type", "alert_id", "simulator_user_id", "alert_type", "severity", "status"] },
      profile_opened: { properties: ["role", "context_type", "alert_id", "simulator_user_id", "alert_type", "severity", "status"] },
      case_opened: { properties: ["role", "context_type", "alert_id", "simulator_user_id", "alert_type", "severity", "status"] },
    },
    "Workspace Actions": {
      alert_assigned_to_self: { properties: ["role", "alert_id", "simulator_user_id", "context_type"] },
      alert_unassigned_from_self: { properties: ["role", "alert_id", "simulator_user_id", "context_type"] },
      watchlist_item_added: { properties: ["role", "alert_id", "simulator_user_id", "context_type"] },
      watchlist_item_removed: { properties: ["role", "alert_id", "simulator_user_id", "context_type"] },
    },
    "Investigation Flow": {
      review_thread_created: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "has_existing_thread"] },
      comment_created: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "has_existing_thread"] },
      draft_updated: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "has_existing_thread"] },
      draft_deleted: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "has_existing_thread"] },
    },
    "Submission Flow": {
      review_submission_created: { properties: ["role", "context_type", "thread_id", "submission_version", "has_decision", "has_root_comment"] },
      review_submission_resubmitted: { properties: ["role", "context_type", "thread_id", "submission_version", "has_decision", "has_root_comment"] },
    },
    "Decision Flow": {
      decision_submitted: { properties: ["role", "alert_id", "thread_id", "decision", "proposed_alert_status", "alert_type", "severity"] },
      decision_updated: { properties: ["role", "alert_id", "thread_id", "decision", "proposed_alert_status", "alert_type", "severity"] },
    },
    "Engagement / Retention": {
      session_started: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "completion_type"] },
      returned_next_day: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "completion_type"] },
      second_case_opened: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "completion_type"] },
      case_completed: { properties: ["role", "context_type", "thread_id", "alert_id", "simulator_user_id", "completion_type"] },
    },
    "Quality / Friction": {
      form_validation_failed: { properties: ["role", "context_type", "surface", "error_type"] },
      save_failed: { properties: ["role", "context_type", "surface", "error_type"] },
      submission_failed: { properties: ["role", "context_type", "surface", "error_type"] },
      decision_submit_failed: { properties: ["role", "context_type", "surface", "error_type"] },
    },
    "First Release": [
      "signup_completed",
      "login_completed",
      "dashboard_viewed",
      "first_case_opened",
      "alert_opened",
      "profile_opened",
      "alert_assigned_to_self",
      "watchlist_item_added",
      "review_thread_created",
      "comment_created",
      "review_submission_created",
      "decision_submitted",
    ],
  };
}

export function getAmplitudeNavigationSource() {
  if (!isBrowser()) return "direct";
  const referrer = parseUrl(document.referrer);
  if (!referrer || referrer.origin !== window.location.origin) return "direct";
  if (referrer.pathname.startsWith("/dashboard")) return "dashboard";
  if (referrer.pathname.startsWith("/my-cases")) return "my_cases";
  return "direct";
}

export function getAmplitudeContextType(properties: {
  context_type?: unknown;
  alert_id?: unknown;
  simulator_user_id?: unknown;
}) {
  if (properties.context_type === "alert" || properties.alert_id) return "alert";
  if (properties.context_type === "profile" || properties.simulator_user_id) return "profile";
  return undefined;
}

export function trackTraineeEvent(role: string | null | undefined, eventName: string, properties: EventProps = {}) {
  if (!isAmplitudeEnabled()) return;
  if (!canTrackTrainee(role)) return;
  void initAmplitude();
  captureAmplitudeAttribution();
  track(eventName, withTraineeRole(properties));
}

export function trackTraineeIdentityEvent(
  eventName: "signup_completed" | "login_completed" | "logout_completed",
  method: string,
  options?: AmplitudeIdentityOptions
) {
  if (!isAmplitudeEnabled()) return;
  if (!canTrackTrainee("trainee", options)) return;
  void initAmplitude();
  captureAmplitudeAttribution();
  track(eventName, withTraineeRole({ method, ...(getStoredAttribution() ?? buildCurrentAttribution()) }));
}

export async function loadAmplitudeOrganizationMeta(
  supabase: SupabaseClient,
  organizationId: string | null | undefined
): Promise<AmplitudeOrgContext | null> {
  if (!organizationId) return null;
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    organizationId: String(data.id ?? organizationId),
    organizationName: typeof data.name === "string" ? data.name : null,
    organizationSlug: typeof data.slug === "string" ? data.slug : null,
  };
}

export function syncAmplitudeUser(appUser: AppUserRow | null, organizationMeta?: AmplitudeOrgContext | null) {
  if (!isAmplitudeEnabled()) return;
  if (!appUser) {
    currentAmplitudeOrgContext = null;
    setUserId(undefined);
    return;
  }
  currentAmplitudeOrgContext = {
    organizationId: organizationMeta?.organizationId ?? appUser.organization_id ?? null,
    organizationName: organizationMeta?.organizationName ?? null,
    organizationSlug: organizationMeta?.organizationSlug ?? null,
  };
  void initAmplitude();
  setUserId(appUser.id);
  identify(
    new Identify()
      .set("role", appUser.role ?? "unknown")
      .set("organization_id", appUser.organization_id ?? "")
      .set("organization_name", currentAmplitudeOrgContext.organizationName ?? "")
      .set("organization_slug", currentAmplitudeOrgContext.organizationSlug ?? "")
      .set("provider", appUser.provider ?? "")
      .set("status", appUser.status ?? "")
      .set("is_active", appUser.is_active ?? true)
  );
}

export function trackTraineeSessionStarted(role: string | null | undefined) {
  if (!isAmplitudeEnabled()) return;
  if (!canTrackTrainee(role) || !isBrowser()) return;
  if (window.sessionStorage.getItem(SESSION_STARTED_KEY)) return;
  window.sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  trackTraineeEvent(role, "session_started");
}

export function markFirstCaseOpened(role: string | null | undefined, properties: EventProps = {}) {
  if (!isAmplitudeEnabled()) return;
  if (!canTrackTrainee(role) || !isBrowser()) return;
  if (window.localStorage.getItem(FIRST_CASE_OPENED_KEY)) return;
  window.localStorage.setItem(FIRST_CASE_OPENED_KEY, "1");
  trackTraineeEvent(role, "first_case_opened", {
    is_first_time: true,
    source: getAmplitudeNavigationSource(),
    ...properties,
  });
}

export async function flushAmplitude() {
  if (!isAmplitudeEnabled()) return;
  try {
    await flush().promise;
  } catch {
    // Ignore flush failures on logout/navigation.
  }
}
