import type {
  BankTransferReasonCode,
  BankTransferStatusCode,
  CreateSimulatorTransactionInput,
  TransactionRejectReason,
  TransactionRow,
  UpdateSimulatorTransactionInput,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateAmountUsd,
  findBankTransferReasonByCode,
  findBankTransferStatusByCode,
  findRejectReasonByCode,
  formatMaskedCardReference,
  getCanonicalStatusForTransaction,
  getSupportedTransactionCurrenciesForSelection,
  getTransactionDescription,
  getUserDisplayName,
  isCanonicalTransactionType,
  normalizeTransactionChannelForType,
  normalizeTransactionCurrencyForType,
  normalizeTransactionDirectionForType,
  normalizeTransactionRail,
} from "@/lib/transactions";
import {
  ensureStaffViewer,
  ensureVisibleUsers,
  generateUuidLikeValue,
  normalizeDateTime,
  normalizeNumber,
  normalizeRequiredText,
  normalizeText,
  type StaffViewer,
} from "@/lib/services/simulator-shared";
import { shouldRetryWithLegacyShape } from "@/shared/lib/schema-compat";

const TRANSACTION_MUTATION_SELECT =
  "id, external_id, user_id, sort_order, transaction_date, direction, type, channel, rail, display_name, card_masked, funding_card_masked, counterparty_card_masked, counterparty_user_id, merchant_name, merchant_country, mcc, issuer_country, iban_masked, bank_country, payment_reference, asset, wallet_masked, counterparty_name, reject_reason, status_code, reason_code, status_display, reason_display, status, amount, amount_usd, currency, organization_id, created_at, updated_at" as const;

const TRANSACTION_DIRECTION_VALUES = ["inbound", "outbound"] as const;

type NormalizedTransactionInput = {
  user_id: string;
  transaction_date: string;
  direction: string;
  type: string;
  channel: string | null;
  rail: string | null;
  display_name: string | null;
  card_masked: string | null;
  funding_card_masked: string | null;
  counterparty_card_masked: string | null;
  counterparty_user_id: string | null;
  merchant_name: string | null;
  merchant_country: string | null;
  mcc: string | null;
  issuer_country: string | null;
  iban_masked: string | null;
  bank_country: string | null;
  payment_reference: string | null;
  asset: string | null;
  wallet_masked: string | null;
  counterparty_name: string | null;
  reject_reason: TransactionRejectReason | null;
  status_code: BankTransferStatusCode | null;
  reason_code: BankTransferReasonCode | null;
  status_display: string | null;
  reason_display: string | null;
  status: string;
  amount: number;
  amount_usd: number;
  currency: string;
};

function requireField(value: string | null, fieldLabel: string, errors: string[]): string | null {
  if (!value) {
    errors.push(`${fieldLabel} is required.`);
    return null;
  }
  return value;
}

function normalizeDirection(
  value: string | null | undefined,
  type: string | null,
  channel: string | null,
  errors: string[]
): string | null {
  if (type === "Card payment" && channel === "Refund" && normalizeText(value)?.toLowerCase() !== "outbound") {
    return "inbound";
  }

  const normalized = normalizeTransactionDirectionForType(type, value);
  if (!normalized) {
    errors.push("Direction is required.");
    return null;
  }
  if ((TRANSACTION_DIRECTION_VALUES as readonly string[]).includes(normalized)) return normalized;
  errors.push(`Direction must be one of: ${TRANSACTION_DIRECTION_VALUES.join(", ")}.`);
  return null;
}

function normalizeStatus(value: string | null | undefined, errors: string[]): string | null {
  const trimmed = normalizeText(value)?.toLowerCase() ?? null;
  if (!trimmed) {
    errors.push("Status is required.");
    return null;
  }
  return trimmed;
}

function normalizeBankTransferIsoFields(
  type: string | null,
  status: string | null,
  statusCode: string | null | undefined,
  reasonCode: string | null | undefined,
  errors: string[]
): {
  status_code: BankTransferStatusCode | null;
  reason_code: BankTransferReasonCode | null;
  status_display: string | null;
  reason_display: string | null;
  status: string | null;
} {
  if (type !== "Bank transfer") {
    return {
      status_code: null,
      reason_code: null,
      status_display: null,
      reason_display: null,
      status,
    };
  }

  const normalizedStatus = findBankTransferStatusByCode(statusCode);
  if (!normalizedStatus) {
    errors.push("Bank transfer status must be selected from the ISO status list.");
    return {
      status_code: null,
      reason_code: null,
      status_display: null,
      reason_display: null,
      status: null,
    };
  }

  if (normalizedStatus.code === "RJCT") {
    const normalizedReason = findBankTransferReasonByCode(reasonCode);
    if (!normalizedReason) {
      errors.push("Bank transfer reason is required when the transfer status is rejected.");
      return {
        status_code: normalizedStatus.code,
        reason_code: null,
        status_display: normalizedStatus.display,
        reason_display: null,
        status: normalizedStatus.status,
      };
    }

    return {
      status_code: normalizedStatus.code,
      reason_code: normalizedReason.code,
      status_display: normalizedStatus.display,
      reason_display: normalizedReason.display,
      status: normalizedStatus.status,
    };
  }

  if (reasonCode && normalizeText(reasonCode)) {
    errors.push("Bank transfer reason can only be set for rejected transfers.");
  }

  return {
    status_code: normalizedStatus.code,
    reason_code: null,
    status_display: normalizedStatus.display,
    reason_display: null,
    status: normalizedStatus.status,
  };
}

function normalizeCurrency(
  type: string | null | undefined,
  value: string | null | undefined,
  rail: string | null | undefined,
  errors: string[]
): string | null {
  const trimmed = normalizeText(value)?.toUpperCase() ?? null;
  if (!trimmed) {
    errors.push("Currency is required.");
    return null;
  }
  const allowedCurrencies = getSupportedTransactionCurrenciesForSelection(type, rail);
  if (!(allowedCurrencies as readonly string[]).includes(trimmed)) {
    errors.push(`Currency must be one of: ${allowedCurrencies.join(", ")}.`);
    return null;
  }
  return normalizeTransactionCurrencyForType(type, trimmed, rail);
}

function normalizeRejectReason(
  type: string | null,
  value: TransactionRejectReason | null | undefined,
  status: string | null,
  errors: string[]
): TransactionRejectReason | null {
  if (type !== "Card top-up") return null;
  const rejected = status === "rejected";
  if (!rejected) return null;
  if (!value) {
    errors.push("Reject reason is required when status is rejected.");
    return null;
  }

  const matched = findRejectReasonByCode(value.code);
  if (!matched) {
    errors.push("Reject reason must be selected from the approved list.");
    return null;
  }

  return matched;
}

function normalizeRejectReasonRow(value: unknown): TransactionRejectReason | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TransactionRejectReason>;
  const matched = findRejectReasonByCode(candidate.code);
  if (matched) return matched;

  const code = normalizeText(candidate.code);
  const label = normalizeText(candidate.label);
  const category = normalizeText(candidate.category) as TransactionRejectReason["category"] | null;
  if (!code || !label || !category) return null;
  if (!["card", "3ds", "aml", "generic"].includes(category)) return null;

  return { code, label, category };
}

function normalizeBankTransferStatusCodeRow(value: unknown): BankTransferStatusCode | null {
  return findBankTransferStatusByCode(typeof value === "string" ? value : null)?.code ?? null;
}

function normalizeBankTransferReasonCodeRow(value: unknown): BankTransferReasonCode | null {
  return findBankTransferReasonByCode(typeof value === "string" ? value : null)?.code ?? null;
}

function normalizeMaskedCard(value: string | null | undefined): string | null {
  return formatMaskedCardReference(normalizeText(value));
}

function normalizeTransactionInput(
  input: CreateSimulatorTransactionInput | UpdateSimulatorTransactionInput
): { value: NormalizedTransactionInput | null; errors: string[] } {
  const errors: string[] = [];
  const userId = normalizeRequiredText(input.user_id, "User", errors);
  const transactionDate = normalizeDateTime(input.transaction_date, "Transaction date", errors);
  const type = normalizeRequiredText(input.type, "Type", errors);
  const rawChannel = normalizeText(input.channel);
  const direction = normalizeDirection(input.direction, type, rawChannel, errors);
  const status = normalizeStatus(input.status, errors);
  const amount = normalizeNumber(input.amount, "Amount", errors);
  const normalizedChannel = normalizeTransactionChannelForType(type, direction, rawChannel);
  const normalizedRail = normalizeTransactionRail(type, normalizedChannel, normalizeText(input.rail));
  const currency = normalizeCurrency(type, input.currency, normalizedRail ?? normalizedChannel, errors);

  if (amount == null) {
    errors.push("Amount is required.");
  }
  if (amount != null && amount < 0) {
    errors.push("Amount must be zero or greater.");
  }

  const computedAmountUsd = amount == null || !currency ? null : calculateAmountUsd(amount, currency);
  if (amount != null && currency != null && computedAmountUsd == null) {
    errors.push(`Amount USD could not be calculated for currency ${currency ?? "—"}.`);
  }

  const channel = normalizedChannel;
  const rail = normalizedRail;
  const bankTransferIso = normalizeBankTransferIsoFields(
    type,
    status,
    normalizeText(input.status_code),
    normalizeText(input.reason_code),
    errors
  );
  if (
    type !== "Bank transfer" &&
    (normalizeText(input.status_code) ||
      normalizeText(input.reason_code) ||
      normalizeText(input.status_display) ||
      normalizeText(input.reason_display))
  ) {
    errors.push("ISO bank transfer status fields can only be used for bank transfers.");
  }
  const effectiveStatus = bankTransferIso.status ?? status;
  const rejectReason = normalizeRejectReason(type, input.reject_reason ?? null, effectiveStatus, errors);

  const normalized: NormalizedTransactionInput = {
    user_id: userId ?? "",
    transaction_date: transactionDate ?? "",
    direction: direction ?? "",
    type: type ?? "",
    channel,
    rail,
    display_name: normalizeText(input.display_name),
    card_masked: normalizeMaskedCard(input.card_masked),
    funding_card_masked: normalizeMaskedCard(input.funding_card_masked),
    counterparty_card_masked: normalizeMaskedCard(input.counterparty_card_masked),
    counterparty_user_id: normalizeText(input.counterparty_user_id),
    merchant_name: normalizeText(input.merchant_name),
    merchant_country: normalizeText(input.merchant_country),
    mcc: normalizeText(input.mcc),
    issuer_country: normalizeText(input.issuer_country),
    iban_masked: normalizeText(input.iban_masked),
    bank_country: normalizeText(input.bank_country),
    payment_reference: normalizeText(input.payment_reference),
    asset: normalizeText(input.asset)?.toUpperCase() ?? null,
    wallet_masked: normalizeText(input.wallet_masked),
    counterparty_name: normalizeText(input.counterparty_name),
    reject_reason: rejectReason,
    status_code: bankTransferIso.status_code,
    reason_code: bankTransferIso.reason_code,
    status_display: bankTransferIso.status_display ?? normalizeText(input.status_display),
    reason_display: bankTransferIso.reason_display ?? normalizeText(input.reason_display),
    status: effectiveStatus ?? "",
    amount: amount ?? 0,
    amount_usd: computedAmountUsd ?? 0,
    currency: currency ?? "",
  };

  if (isCanonicalTransactionType(type)) {
    switch (type) {
      case "Card payment":
        normalized.card_masked = requireField(normalized.card_masked, "Card", errors);
        normalized.mcc = requireField(normalized.mcc, "MCC", errors);
        normalized.merchant_name = requireField(normalized.merchant_name, "Merchant", errors);
        normalized.funding_card_masked = null;
        normalized.counterparty_card_masked = null;
        normalized.counterparty_user_id = null;
        normalized.issuer_country = null;
        normalized.iban_masked = null;
        normalized.bank_country = null;
        normalized.asset = null;
        normalized.wallet_masked = null;
        normalized.counterparty_name = null;
        normalized.reject_reason = null;
        normalized.status_code = null;
        normalized.reason_code = null;
        normalized.status_display = null;
        normalized.reason_display = null;
        normalized.rail = null;
        break;
      case "Card top-up":
        normalized.funding_card_masked = requireField(normalized.funding_card_masked, "Funding card", errors);
        normalized.card_masked = null;
        normalized.counterparty_card_masked = null;
        normalized.counterparty_user_id = null;
        normalized.merchant_name = null;
        normalized.merchant_country = null;
        normalized.mcc = null;
        normalized.iban_masked = null;
        normalized.bank_country = null;
        normalized.payment_reference = null;
        normalized.asset = null;
        normalized.wallet_masked = null;
        normalized.counterparty_name = null;
        normalized.status_code = null;
        normalized.reason_code = null;
        normalized.status_display = null;
        normalized.reason_display = null;
        normalized.rail = null;
        break;
      case "Card transfer":
        normalized.card_masked = requireField(normalized.card_masked, "Card", errors);
        normalized.counterparty_card_masked = requireField(
          normalized.counterparty_card_masked,
          "Counterparty card",
          errors
        );
        normalized.funding_card_masked = null;
        normalized.counterparty_user_id = null;
        normalized.merchant_name = null;
        normalized.merchant_country = null;
        normalized.mcc = null;
        normalized.iban_masked = null;
        normalized.bank_country = null;
        normalized.payment_reference = null;
        normalized.asset = null;
        normalized.wallet_masked = null;
        normalized.reject_reason = null;
        normalized.status_code = null;
        normalized.reason_code = null;
        normalized.status_display = null;
        normalized.reason_display = null;
        normalized.rail = null;
        break;
      case "Bank transfer":
        normalized.counterparty_name = requireField(normalized.counterparty_name, "Counterparty", errors);
        normalized.card_masked = null;
        normalized.funding_card_masked = null;
        normalized.counterparty_card_masked = null;
        normalized.counterparty_user_id = null;
        normalized.merchant_name = null;
        normalized.merchant_country = null;
        normalized.mcc = null;
        normalized.issuer_country = null;
        normalized.asset = null;
        normalized.wallet_masked = null;
        normalized.reject_reason = null;
        normalized.rail = normalized.channel;
        break;
      case "P2P transfer":
        normalized.counterparty_user_id = requireField(
          normalized.counterparty_user_id,
          "Counterparty user",
          errors
        );
        if (normalized.counterparty_user_id && normalized.user_id && normalized.counterparty_user_id === normalized.user_id) {
          errors.push("Counterparty user must be different from the current user.");
        }
        normalized.card_masked = null;
        normalized.funding_card_masked = null;
        normalized.counterparty_card_masked = null;
        normalized.merchant_name = null;
        normalized.merchant_country = null;
        normalized.mcc = null;
        normalized.issuer_country = null;
        normalized.iban_masked = null;
        normalized.bank_country = null;
        normalized.payment_reference = null;
        normalized.asset = null;
        normalized.wallet_masked = null;
        normalized.reject_reason = null;
        normalized.status_code = null;
        normalized.reason_code = null;
        normalized.status_display = null;
        normalized.reason_display = null;
        normalized.rail = null;
        break;
      case "Crypto transfer":
        normalized.asset = requireField(normalized.currency, "Currency", errors);
        normalized.wallet_masked = requireField(normalized.wallet_masked, "Wallet", errors);
        normalized.card_masked = null;
        normalized.funding_card_masked = null;
        normalized.counterparty_card_masked = null;
        normalized.counterparty_user_id = null;
        normalized.merchant_name = null;
        normalized.merchant_country = null;
        normalized.mcc = null;
        normalized.issuer_country = null;
        normalized.iban_masked = null;
        normalized.bank_country = null;
        normalized.payment_reference = null;
        normalized.reject_reason = null;
        normalized.status_code = null;
        normalized.reason_code = null;
        normalized.status_display = null;
        normalized.reason_display = null;
        normalized.rail = null;
        break;
      case "ATM":
        normalized.direction = "outbound";
        normalized.channel = "ATM";
        normalized.card_masked = requireField(normalized.card_masked, "Card", errors);
        normalized.mcc = "6011";
        normalized.funding_card_masked = null;
        normalized.counterparty_card_masked = null;
        normalized.counterparty_user_id = null;
        normalized.merchant_name = null;
        normalized.merchant_country = null;
        normalized.issuer_country = null;
        normalized.iban_masked = null;
        normalized.bank_country = null;
        normalized.asset = null;
        normalized.wallet_masked = null;
        normalized.counterparty_name = null;
        normalized.reject_reason = null;
        normalized.status_code = null;
        normalized.reason_code = null;
        normalized.status_display = null;
        normalized.reason_display = null;
        normalized.rail = null;
        break;
    }
  }

  normalized.display_name = getTransactionDescription(normalized);

  if (errors.length > 0) {
    return { value: null, errors };
  }

  return { value: normalized, errors };
}

function normalizeTransactionRow(row: Partial<TransactionRow>): TransactionRow {
  return {
    id: String(row.id ?? ""),
    external_id: row.external_id ? String(row.external_id) : null,
    user_id: row.user_id ? String(row.user_id) : null,
    sort_order: typeof row.sort_order === "number" ? row.sort_order : row.sort_order == null ? null : Number(row.sort_order),
    transaction_date: row.transaction_date ?? null,
    direction: row.direction?.trim() || null,
    type: row.type?.trim() || null,
    channel: row.channel?.trim() || null,
    rail: row.rail?.trim() || null,
    display_name: row.display_name?.trim() || null,
    card_masked: normalizeMaskedCard(row.card_masked),
    funding_card_masked: normalizeMaskedCard(row.funding_card_masked),
    counterparty_card_masked: normalizeMaskedCard(row.counterparty_card_masked),
    counterparty_user_id: row.counterparty_user_id?.trim() || null,
    merchant_name: row.merchant_name?.trim() || null,
    merchant_country: row.merchant_country?.trim() || null,
    mcc: row.mcc?.trim() || null,
    issuer_country: row.issuer_country?.trim() || null,
    iban_masked: row.iban_masked?.trim() || null,
    bank_country: row.bank_country?.trim() || null,
    payment_reference: row.payment_reference?.trim() || null,
    asset: row.asset?.trim() || null,
    wallet_masked: row.wallet_masked?.trim() || null,
    counterparty_name: row.counterparty_name?.trim() || null,
    reject_reason: normalizeRejectReasonRow(row.reject_reason),
    status_code: normalizeBankTransferStatusCodeRow(row.status_code),
    reason_code: normalizeBankTransferReasonCodeRow(row.reason_code),
    status_display: row.status_display?.trim() || findBankTransferStatusByCode(row.status_code)?.display || null,
    reason_display: row.reason_display?.trim() || findBankTransferReasonByCode(row.reason_code)?.display || null,
    status: getCanonicalStatusForTransaction(row.type, row.status, row.status_code),
    amount: row.amount ?? null,
    amount_usd: row.amount_usd ?? null,
    currency: row.currency?.trim() || null,
    organization_id: row.organization_id ? String(row.organization_id) : null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

async function getNextTopTransactionSortOrder(
  supabase: SupabaseClient,
  userId: string
): Promise<{ value: number; error: string | null }> {
  type TransactionSortOrderLookup = {
    select?: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (count: number) => Promise<{
            data: Array<{ sort_order: number | string | null }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const transactionsTable = supabase.from("transactions") as unknown as TransactionSortOrderLookup;
  if (typeof transactionsTable.select !== "function") {
    return { value: 0, error: null };
  }

  const { data, error } = await transactionsTable
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .limit(1);

  if (error) return { value: 0, error: error.message };
  const currentTop = data?.[0]?.sort_order;
  const numericTop = typeof currentTop === "number" ? currentTop : currentTop == null ? null : Number(currentTop);
  return { value: numericTop == null || Number.isNaN(numericTop) ? 0 : numericTop - 1, error: null };
}

async function resolveCounterpartySnapshotName(
  supabase: SupabaseClient,
  counterpartyUserId: string
): Promise<{ value: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("id", counterpartyUserId)
    .maybeSingle();

  if (error) return { value: null, error: error.message };
  if (!data) {
    return { value: null, error: "Selected counterparty user does not exist or is outside your visible organization scope." };
  }

  return { value: getUserDisplayName(data) ?? counterpartyUserId, error: null };
}

async function finalizeResolvedInput(
  supabase: SupabaseClient,
  value: NormalizedTransactionInput
): Promise<{ value: NormalizedTransactionInput | null; error: string | null }> {
  if (value.type !== "P2P transfer" || !value.counterparty_user_id) {
    return { value, error: null };
  }

  const counterparty = await resolveCounterpartySnapshotName(supabase, value.counterparty_user_id);
  if (counterparty.error) return { value: null, error: counterparty.error };

  const nextValue: NormalizedTransactionInput = {
    ...value,
    counterparty_name: counterparty.value,
  };
  nextValue.display_name = getTransactionDescription(nextValue);

  return { value: nextValue, error: null };
}

async function insertRichTransaction(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  value: NormalizedTransactionInput,
  sortOrder: number
) {
  const transactionId = generateUuidLikeValue();
  const now = new Date().toISOString();

  return supabase
    .from("transactions")
    .insert({
      id: transactionId,
      external_id: transactionId,
      user_id: value.user_id,
      sort_order: sortOrder,
      transaction_date: value.transaction_date,
      direction: value.direction,
      type: value.type,
      channel: value.channel,
      rail: value.rail,
      display_name: value.display_name,
      card_masked: value.card_masked,
      funding_card_masked: value.funding_card_masked,
      counterparty_card_masked: value.counterparty_card_masked,
      counterparty_user_id: value.counterparty_user_id,
      merchant_name: value.merchant_name,
      merchant_country: value.merchant_country,
      mcc: value.mcc,
      issuer_country: value.issuer_country,
      iban_masked: value.iban_masked,
      bank_country: value.bank_country,
      payment_reference: value.payment_reference,
      asset: value.asset,
      wallet_masked: value.wallet_masked,
      counterparty_name: value.counterparty_name,
      reject_reason: value.reject_reason,
      status_code: value.status_code,
      reason_code: value.reason_code,
      status_display: value.status_display,
      reason_display: value.reason_display,
      status: value.status,
      amount: value.amount,
      amount_usd: value.amount_usd,
      currency: value.currency,
      organization_id: viewer!.organization_id,
      created_at: now,
      updated_at: now,
    })
    .select(TRANSACTION_MUTATION_SELECT)
    .single();
}

async function insertLegacyTransaction(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  value: NormalizedTransactionInput,
  sortOrder: number
) {
  const transactionId = generateUuidLikeValue();
  return supabase
    .from("transactions")
    .insert({
      id: transactionId,
      external_id: transactionId,
      user_id: value.user_id,
      sort_order: sortOrder,
      transaction_date: value.transaction_date,
      direction: value.direction,
      type: value.type,
      channel: value.channel,
      rail: value.rail,
      counterparty_name: value.counterparty_name,
      status: value.status,
      amount: value.amount,
      amount_usd: value.amount_usd,
      currency: value.currency,
      organization_id: viewer!.organization_id,
    })
    .select("*")
    .single();
}

async function updateRichTransaction(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateSimulatorTransactionInput,
  value: NormalizedTransactionInput
) {
  return supabase
    .from("transactions")
    .update({
      user_id: value.user_id,
      transaction_date: value.transaction_date,
      direction: value.direction,
      type: value.type,
      channel: value.channel,
      rail: value.rail,
      display_name: value.display_name,
      card_masked: value.card_masked,
      funding_card_masked: value.funding_card_masked,
      counterparty_card_masked: value.counterparty_card_masked,
      counterparty_user_id: value.counterparty_user_id,
      merchant_name: value.merchant_name,
      merchant_country: value.merchant_country,
      mcc: value.mcc,
      issuer_country: value.issuer_country,
      iban_masked: value.iban_masked,
      bank_country: value.bank_country,
      payment_reference: value.payment_reference,
      asset: value.asset,
      wallet_masked: value.wallet_masked,
      counterparty_name: value.counterparty_name,
      reject_reason: value.reject_reason,
      status_code: value.status_code,
      reason_code: value.reason_code,
      status_display: value.status_display,
      reason_display: value.reason_display,
      status: value.status,
      amount: value.amount,
      amount_usd: value.amount_usd,
      currency: value.currency,
      organization_id: viewer!.organization_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(TRANSACTION_MUTATION_SELECT)
    .single();
}

async function updateLegacyTransaction(
  supabase: SupabaseClient,
  input: UpdateSimulatorTransactionInput,
  value: NormalizedTransactionInput
) {
  return supabase
    .from("transactions")
    .update({
      user_id: value.user_id,
      transaction_date: value.transaction_date,
      direction: value.direction,
      type: value.type,
      channel: value.channel,
      counterparty_name: value.counterparty_name,
      status: value.status,
      amount: value.amount,
      amount_usd: value.amount_usd,
      currency: value.currency,
    })
    .eq("id", input.id)
    .select("*")
    .single();
}

export async function createSimulatorTransaction(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateSimulatorTransactionInput
): Promise<{ transaction: TransactionRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { transaction: null, error: viewerError };

  const { value, errors } = normalizeTransactionInput(input);
  if (!value) return { transaction: null, error: errors.join(" ") };

  const visibleUserIds = [value.user_id, value.counterparty_user_id].filter((item): item is string => Boolean(item));
  const visibleUsers = await ensureVisibleUsers(supabase, visibleUserIds);
  if (visibleUsers.error) return { transaction: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { transaction: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }
  if (value.type === "P2P transfer" && value.counterparty_user_id && !visibleUsers.ids.has(value.counterparty_user_id)) {
    return { transaction: null, error: "Selected counterparty user does not exist or is outside your visible organization scope." };
  }

  const resolved = await finalizeResolvedInput(supabase, value);
  if (resolved.error || !resolved.value) return { transaction: null, error: resolved.error ?? "Could not resolve transaction fields." };

  const nextSortOrder = await getNextTopTransactionSortOrder(supabase, value.user_id);
  if (nextSortOrder.error) return { transaction: null, error: nextSortOrder.error };

  const richResult = await insertRichTransaction(supabase, viewer, resolved.value, nextSortOrder.value);
  if (richResult.error && !shouldRetryWithLegacyShape(richResult.error.message)) {
    return { transaction: null, error: richResult.error.message };
  }
  if (!richResult.error) {
    return { transaction: normalizeTransactionRow(richResult.data as TransactionRow), error: null };
  }

  const legacyResult = await insertLegacyTransaction(supabase, viewer, resolved.value, nextSortOrder.value);
  if (legacyResult.error) return { transaction: null, error: legacyResult.error.message };
  return { transaction: normalizeTransactionRow(legacyResult.data as TransactionRow), error: null };
}

export async function updateSimulatorTransaction(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateSimulatorTransactionInput
): Promise<{ transaction: TransactionRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { transaction: null, error: viewerError };

  const { value, errors } = normalizeTransactionInput(input);
  if (!value) return { transaction: null, error: errors.join(" ") };

  const visibleUserIds = [value.user_id, value.counterparty_user_id].filter((item): item is string => Boolean(item));
  const visibleUsers = await ensureVisibleUsers(supabase, visibleUserIds);
  if (visibleUsers.error) return { transaction: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id)) {
    return { transaction: null, error: "Selected user does not exist or is outside your visible organization scope." };
  }
  if (value.type === "P2P transfer" && value.counterparty_user_id && !visibleUsers.ids.has(value.counterparty_user_id)) {
    return { transaction: null, error: "Selected counterparty user does not exist or is outside your visible organization scope." };
  }

  const resolved = await finalizeResolvedInput(supabase, value);
  if (resolved.error || !resolved.value) return { transaction: null, error: resolved.error ?? "Could not resolve transaction fields." };

  const richResult = await updateRichTransaction(supabase, viewer, input, resolved.value);
  if (richResult.error && !shouldRetryWithLegacyShape(richResult.error.message)) {
    return { transaction: null, error: richResult.error.message };
  }
  if (!richResult.error) {
    return { transaction: normalizeTransactionRow(richResult.data as TransactionRow), error: null };
  }

  const legacyResult = await updateLegacyTransaction(supabase, input, resolved.value);
  if (legacyResult.error) return { transaction: null, error: legacyResult.error.message };
  return { transaction: normalizeTransactionRow(legacyResult.data as TransactionRow), error: null };
}

export async function deleteSimulatorTransaction(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  transactionId: string
): Promise<{ error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { error: viewerError };

  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function reorderSimulatorTransactions(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  userId: string,
  transactionIdsInOrder: string[]
): Promise<{ transactions: TransactionRow[]; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { transactions: [], error: viewerError };

  const uniqueIds = Array.from(new Set(transactionIdsInOrder.filter((value) => value.trim().length > 0)));
  if (uniqueIds.length === 0) return { transactions: [], error: null };
  if (uniqueIds.length !== transactionIdsInOrder.length) {
    return { transactions: [], error: "Transaction order payload contains duplicate ids." };
  }

  const visibleUsers = await ensureVisibleUsers(supabase, [userId]);
  if (visibleUsers.error) return { transactions: [], error: visibleUsers.error };
  if (!visibleUsers.ids.has(userId)) {
    return { transactions: [], error: "Selected user does not exist or is outside your visible organization scope." };
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (existingRowsError) return { transactions: [], error: existingRowsError.message };
  if ((existingRows ?? []).length !== uniqueIds.length) {
    return { transactions: [], error: "One or more transactions could not be reordered for this user." };
  }

  const updatedAt = new Date().toISOString();
  const updates = await Promise.all(
    uniqueIds.map((transactionId, index) =>
      supabase
        .from("transactions")
        .update({
          sort_order: index + 1,
          updated_at: updatedAt,
        })
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select(TRANSACTION_MUTATION_SELECT)
        .single()
    )
  );

  const failedUpdate = updates.find((result) => result.error);
  if (failedUpdate?.error) {
    return { transactions: [], error: failedUpdate.error.message };
  }

  return {
    transactions: updates
      .map((result) => normalizeTransactionRow(result.data as TransactionRow))
      .sort((left, right) => (left.sort_order ?? Number.MAX_SAFE_INTEGER) - (right.sort_order ?? Number.MAX_SAFE_INTEGER)),
    error: null,
  };
}
