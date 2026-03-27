import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRow } from "@/lib/types";

export type AlertContextIds = {
  publicId: string | null;
  internalId: string | null;
};

type AlertIdentityInput = {
  publicId?: string | null;
  internalId?: string | null;
};

/**
 * Canonical alert identity model:
 * - publicId = public.alerts.id (UI / display)
 * - internalId = public.alerts.internal_id (technical joins / workflow refs)
 */
export function getAlertContextIds(
  alert: Pick<AlertRow, "id" | "internal_id"> | null | undefined
): AlertContextIds {
  return {
    publicId: alert?.id ? String(alert.id) : null,
    internalId: alert?.internal_id ? String(alert.internal_id) : null,
  };
}

export async function resolveAlertContextIds(
  supabase: SupabaseClient,
  input: AlertIdentityInput
): Promise<{ ids: AlertContextIds; error: Error | null }> {
  const publicId = input.publicId ? String(input.publicId) : null;
  const internalId = input.internalId ? String(input.internalId) : null;

  if (publicId && internalId) {
    return { ids: { publicId, internalId }, error: null };
  }

  if (!publicId && !internalId) {
    return { ids: { publicId: null, internalId: null }, error: new Error("Alert identity is missing") };
  }

  let query = supabase.from("alerts").select("id, internal_id").limit(1);
  query = publicId ? query.eq("id", publicId) : query.eq("internal_id", internalId!);

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { ids: { publicId: null, internalId: null }, error: new Error(error.message) };
  }
  if (!data?.id) {
    return { ids: { publicId: null, internalId: null }, error: new Error("Alert not found") };
  }

  return {
    ids: {
      publicId: String(data.id),
      internalId: data.internal_id ? String(data.internal_id) : null,
    },
    error: null,
  };
}

export async function mapAlertInternalToPublicIds(
  supabase: SupabaseClient,
  internalIds: string[]
): Promise<{ mapping: Map<string, string>; error: Error | null }> {
  const uniqueInternalIds = [...new Set(internalIds.filter(Boolean).map(String))];
  const mapping = new Map<string, string>();

  if (uniqueInternalIds.length === 0) {
    return { mapping, error: null };
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("id, internal_id")
    .in("internal_id", uniqueInternalIds);

  if (error) {
    return { mapping, error: new Error(error.message) };
  }

  for (const row of (data ?? []) as { id: string; internal_id: string | null }[]) {
    if (row.internal_id) {
      mapping.set(String(row.internal_id), String(row.id));
    }
  }

  return { mapping, error: null };
}
