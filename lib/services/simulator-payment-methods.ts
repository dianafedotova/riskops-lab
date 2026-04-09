import type {
  CreateSimulatorPaymentMethodInput,
  PaymentMethodRow,
  UpdateSimulatorPaymentMethodInput,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureStaffViewer,
  ensureVisibleUsers,
  normalizeRequiredText,
  normalizeText,
  shouldRetryWithLegacyShape,
  type StaffViewer,
} from "@/lib/services/simulator-shared";

const PAYMENT_METHOD_MUTATION_SELECT =
  "id, user_id, type, masked_number, card_network, status, bank_type, account_number, wallet_type, wallet_address, created_at" as const;

const PAYMENT_METHOD_TYPES = ["card", "bank", "crypto"] as const;
const PAYMENT_METHOD_STATUS_VALUES = ["active", "frozen", "blocked", "closed"] as const;

type NormalizedPaymentMethodInput = {
  user_id: string;
  type: string;
  masked_number: string | null;
  card_network: string | null;
  status: string | null;
  bank_type: string | null;
  account_number: string | null;
  wallet_type: string | null;
  wallet_address: string | null;
};

function normalizePaymentMethodType(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) {
    errors.push("Payment method type is required.");
    return null;
  }
  if ((PAYMENT_METHOD_TYPES as readonly string[]).includes(trimmed)) return trimmed;
  errors.push(`Payment method type must be one of: ${PAYMENT_METHOD_TYPES.join(", ")}.`);
  return null;
}

function normalizePaymentMethodStatus(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) return null;
  if ((PAYMENT_METHOD_STATUS_VALUES as readonly string[]).includes(trimmed)) return trimmed;
  errors.push(`Status must be one of: ${PAYMENT_METHOD_STATUS_VALUES.join(", ")}.`);
  return null;
}

function normalizePaymentMethodInput(
  input: CreateSimulatorPaymentMethodInput | UpdateSimulatorPaymentMethodInput
): { value: NormalizedPaymentMethodInput | null; errors: string[] } {
  const errors: string[] = [];
  const userId = normalizeRequiredText(input.user_id, "User", errors);
  const type = normalizePaymentMethodType(input.type, errors);
  const status = normalizePaymentMethodStatus(input.status, errors);
  const maskedNumber = normalizeText(input.masked_number);
  const cardNetwork = normalizeText(input.card_network);
  const bankType = normalizeText(input.bank_type);
  const accountNumber = normalizeText(input.account_number);
  const walletType = normalizeText(input.wallet_type);
  const walletAddress = normalizeText(input.wallet_address);

  if (type === "card" && !maskedNumber) {
    errors.push("Masked number is required for card methods.");
  }
  if (type === "bank" && !accountNumber) {
    errors.push("Account number is required for bank methods.");
  }
  if (type === "crypto" && !walletAddress) {
    errors.push("Wallet address is required for crypto methods.");
  }

  if (errors.length > 0) return { value: null, errors };

  return {
    value: {
      user_id: userId!,
      type: type!,
      masked_number: type === "card" ? maskedNumber : null,
      card_network: type === "card" ? cardNetwork : null,
      status,
      bank_type: type === "bank" ? bankType : null,
      account_number: type === "bank" ? accountNumber : null,
      wallet_type: type === "crypto" ? walletType : null,
      wallet_address: type === "crypto" ? walletAddress : null,
    },
    errors,
  };
}

function normalizePaymentMethodRow(row: Partial<PaymentMethodRow>): PaymentMethodRow {
  return {
    id: String(row.id ?? ""),
    user_id: row.user_id ? String(row.user_id) : null,
    type: row.type?.trim() || null,
    masked_number: row.masked_number?.trim() || null,
    card_network: row.card_network?.trim() || null,
    status: row.status?.trim() || null,
    bank_type: row.bank_type?.trim() || null,
    account_number: row.account_number?.trim() || null,
    wallet_type: row.wallet_type?.trim() || null,
    wallet_address: row.wallet_address?.trim() || null,
    created_at: row.created_at ?? null,
  };
}

export async function createSimulatorPaymentMethod(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateSimulatorPaymentMethodInput
): Promise<{ paymentMethod: PaymentMethodRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { paymentMethod: null, error: viewerError };

  const { value, errors } = normalizePaymentMethodInput(input);
  if (!value) return { paymentMethod: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id]);
  if (visibleUsers.error) return { paymentMethod: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { paymentMethod: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data, error } = await supabase
    .from("user_payment_methods")
    .insert(value)
    .select(PAYMENT_METHOD_MUTATION_SELECT)
    .single();

  if (error && !shouldRetryWithLegacyShape(error.message)) {
    return { paymentMethod: null, error: error.message };
  }
  if (!error) {
    return { paymentMethod: normalizePaymentMethodRow(data as PaymentMethodRow), error: null };
  }

  const legacyResult = await supabase
    .from("user_payment_methods")
    .insert(value)
    .select("*")
    .single();

  if (legacyResult.error) return { paymentMethod: null, error: legacyResult.error.message };
  return { paymentMethod: normalizePaymentMethodRow(legacyResult.data as PaymentMethodRow), error: null };
}

export async function updateSimulatorPaymentMethod(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateSimulatorPaymentMethodInput
): Promise<{ paymentMethod: PaymentMethodRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { paymentMethod: null, error: viewerError };

  const { value, errors } = normalizePaymentMethodInput(input);
  if (!value) return { paymentMethod: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id]);
  if (visibleUsers.error) return { paymentMethod: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { paymentMethod: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data, error } = await supabase
    .from("user_payment_methods")
    .update(value)
    .eq("id", input.id)
    .select(PAYMENT_METHOD_MUTATION_SELECT)
    .single();

  if (error && !shouldRetryWithLegacyShape(error.message)) {
    return { paymentMethod: null, error: error.message };
  }
  if (!error) {
    return { paymentMethod: normalizePaymentMethodRow(data as PaymentMethodRow), error: null };
  }

  const legacyResult = await supabase
    .from("user_payment_methods")
    .update(value)
    .eq("id", input.id)
    .select("*")
    .single();

  if (legacyResult.error) return { paymentMethod: null, error: legacyResult.error.message };
  return { paymentMethod: normalizePaymentMethodRow(legacyResult.data as PaymentMethodRow), error: null };
}

export async function deleteSimulatorPaymentMethod(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  paymentMethodId: string
): Promise<{ error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { error: viewerError };

  const { error } = await supabase
    .from("user_payment_methods")
    .delete()
    .eq("id", paymentMethodId);

  if (error) return { error: error.message };
  return { error: null };
}
