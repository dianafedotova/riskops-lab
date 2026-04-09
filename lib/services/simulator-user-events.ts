import type {
  CreateSimulatorUserEventInput,
  UpdateSimulatorUserEventInput,
  UserEventRow,
} from "@/lib/types";
import { maskIp } from "@/lib/format";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureStaffViewer,
  ensureVisibleUsers,
  normalizeDateTime,
  normalizeRequiredText,
  normalizeText,
  type StaffViewer,
} from "@/lib/services/simulator-shared";

const USER_EVENT_MUTATION_SELECT =
  "id, user_id, event_time, event_type, device_id, ip_address, country_code, device_name, created_at" as const;

export const USER_EVENT_TYPE_VALUES = [
  "sign_up",
  "sign_in",
  "open_app",
  "logout",
  "password_reset",
  "added_sof",
  "added_poa",
  "added_poi",
  "changed_phone",
  "changed_email",
  "changed_address",
  "changed_password",
  "changed_device",
] as const;

type NormalizedUserEventInput = {
  user_id: string;
  event_time: string;
  event_type: string;
  device_id: string | null;
  ip_address: string | null;
  country_code: string | null;
  device_name: string | null;
};

function normalizeUserEventType(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) {
    errors.push("Event type is required.");
    return null;
  }
  if ((USER_EVENT_TYPE_VALUES as readonly string[]).includes(trimmed)) return trimmed;
  errors.push(`Event type must be one of: ${USER_EVENT_TYPE_VALUES.join(", ")}.`);
  return null;
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

function normalizeIpAddress(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  const ipV4Pattern = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const maskedIpv4Part = "(?:\\*{3}|25[0-5]|2[0-4]\\d|1?\\d?\\d)";
  const maskedIpv4Pattern = new RegExp(`^${maskedIpv4Part}(\\.${maskedIpv4Part}){3}$`);
  const ipV6Pattern = /^[0-9a-f:]+$/i;
  const looksLikeIpv6 = trimmed.includes(":") && ipV6Pattern.test(trimmed);
  if (ipV4Pattern.test(trimmed)) return maskIp(trimmed);
  if (maskedIpv4Pattern.test(trimmed) || looksLikeIpv6) return trimmed;
  errors.push("IP address must be a masked IPv4 value like 144.***.***.87 or a valid IPv6 value.");
  return null;
}

function normalizeUserEventInput(
  input: CreateSimulatorUserEventInput | UpdateSimulatorUserEventInput
): { value: NormalizedUserEventInput | null; errors: string[] } {
  const errors: string[] = [];
  const userId = normalizeRequiredText(input.user_id, "User", errors);
  const eventTime = normalizeDateTime(input.event_time, "Event time", errors);
  const eventType = normalizeUserEventType(input.event_type, errors);
  const ipAddress = normalizeIpAddress(input.ip_address, errors);

  if (errors.length > 0) return { value: null, errors };

  return {
    value: {
      user_id: userId!,
      event_time: eventTime!,
      event_type: eventType!,
      device_id: normalizeText(input.device_id),
      ip_address: ipAddress,
      country_code: normalizeCountryCode(input.country_code),
      device_name: normalizeText(input.device_name),
    },
    errors,
  };
}

function normalizeUserEventRow(row: Partial<UserEventRow>): UserEventRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    event_time: String(row.event_time ?? ""),
    event_type: row.event_type?.trim() || "",
    device_id: row.device_id?.trim() || null,
    ip_address: row.ip_address?.trim() || null,
    country_code: row.country_code?.trim() || null,
    device_name: row.device_name?.trim() || null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function createSimulatorUserEvent(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateSimulatorUserEventInput
): Promise<{ userEvent: UserEventRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { userEvent: null, error: viewerError };

  const { value, errors } = normalizeUserEventInput(input);
  if (!value) return { userEvent: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id]);
  if (visibleUsers.error) return { userEvent: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { userEvent: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data, error } = await supabase
    .from("user_events")
    .insert(value)
    .select(USER_EVENT_MUTATION_SELECT)
    .single();

  if (error) return { userEvent: null, error: error.message };
  return { userEvent: normalizeUserEventRow(data as UserEventRow), error: null };
}

export async function updateSimulatorUserEvent(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateSimulatorUserEventInput
): Promise<{ userEvent: UserEventRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { userEvent: null, error: viewerError };

  const { value, errors } = normalizeUserEventInput(input);
  if (!value) return { userEvent: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id]);
  if (visibleUsers.error) return { userEvent: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { userEvent: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data, error } = await supabase
    .from("user_events")
    .update(value)
    .eq("id", input.id)
    .select(USER_EVENT_MUTATION_SELECT)
    .single();

  if (error) return { userEvent: null, error: error.message };
  return { userEvent: normalizeUserEventRow(data as UserEventRow), error: null };
}

export async function deleteSimulatorUserEvent(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  eventId: string
): Promise<{ error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { error: viewerError };

  const { error } = await supabase.from("user_events").delete().eq("id", eventId);
  if (error) return { error: error.message };
  return { error: null };
}
