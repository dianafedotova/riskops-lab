import type {
  BankTransferReasonCode,
  BankTransferStatusCode,
  PaymentMethodRow,
  TransactionRejectReason,
  TransactionRow,
} from "@/lib/types";

export type TransactionOption = {
  value: string;
  label: string;
};

export const CANONICAL_TRANSACTION_TYPES = [
  "Card payment",
  "Card top-up",
  "Card transfer",
  "Bank transfer",
  "P2P transfer",
  "Crypto transfer",
  "ATM",
] as const;

export type CanonicalTransactionType = (typeof CANONICAL_TRANSACTION_TYPES)[number];

export const CANONICAL_TRANSACTION_STATUSES = ["completed", "pending", "rejected", "failed"] as const;
export type CanonicalTransactionStatus = (typeof CANONICAL_TRANSACTION_STATUSES)[number];

export const SUPPORTED_FIAT_TRANSACTION_CURRENCIES = ["USD", "EUR", "GBP"] as const;
export const SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES = ["USDC", "BTC", "ETH"] as const;
export const SUPPORTED_TRANSACTION_CURRENCIES = [
  ...SUPPORTED_FIAT_TRANSACTION_CURRENCIES,
  ...SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES,
] as const;
export type SupportedTransactionCurrency = (typeof SUPPORTED_TRANSACTION_CURRENCIES)[number];

export const TRANSACTION_FX_RATES: Record<(typeof SUPPORTED_FIAT_TRANSACTION_CURRENCIES)[number], number> = {
  USD: 1,
  EUR: 1.16,
  GBP: 1.35,
};

export const TRANSACTION_CRYPTO_USD_RATES: Record<(typeof SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES)[number], number> = {
  USDC: 1,
  BTC: 1 / 0.000014,
  ETH: 1 / 0.00046,
};

export const BANK_TRANSFER_CHANNEL_VALUES = ["SEPA", "SWIFT", "FPS"] as const;
export const CARD_PAYMENT_OUTBOUND_CHANNEL_VALUES = ["POS", "ePOS"] as const;

export const TRANSACTION_TYPE_OPTIONS: readonly TransactionOption[] = CANONICAL_TRANSACTION_TYPES.map((value) => ({
  value,
  label: value,
}));

export const TRANSACTION_STATUS_OPTIONS: readonly TransactionOption[] = CANONICAL_TRANSACTION_STATUSES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export const TRANSACTION_CURRENCY_OPTIONS: readonly TransactionOption[] = SUPPORTED_FIAT_TRANSACTION_CURRENCIES.map((value) => ({
  value,
  label: value,
}));

export const TRANSACTION_CRYPTO_CURRENCY_OPTIONS: readonly TransactionOption[] = SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES.map((value) => ({
  value,
  label: value,
}));

export const BANK_TRANSFER_CHANNEL_OPTIONS: readonly TransactionOption[] = BANK_TRANSFER_CHANNEL_VALUES.map((value) => ({
  value,
  label: value,
}));

export const BANK_TRANSFER_CURRENCIES_BY_RAIL: Record<(typeof BANK_TRANSFER_CHANNEL_VALUES)[number], readonly (typeof SUPPORTED_FIAT_TRANSACTION_CURRENCIES)[number][]> = {
  SEPA: ["EUR"],
  SWIFT: ["USD", "EUR"],
  FPS: ["GBP"],
};

export const CRYPTO_ASSET_OPTIONS: readonly TransactionOption[] = [
  { value: "BTC", label: "BTC" },
  { value: "ETH", label: "ETH" },
  { value: "USDT", label: "USDT" },
  { value: "USDC", label: "USDC" },
  { value: "SOL", label: "SOL" },
  { value: "LTC", label: "LTC" },
] as const;

export const MCC_OPTIONS: readonly TransactionOption[] = [
  { value: "5411", label: "5411 Grocery stores" },
  { value: "5541", label: "5541 Service stations" },
  { value: "5732", label: "5732 Electronics stores" },
  { value: "5812", label: "5812 Eating places and restaurants" },
  { value: "4121", label: "4121 Taxicabs and rideshare" },
  { value: "4814", label: "4814 Telecom services" },
  { value: "5999", label: "5999 Miscellaneous retail" },
  { value: "6011", label: "6011 ATM" },
] as const;

export const TRANSACTION_REJECT_REASONS: readonly TransactionRejectReason[] = [
  { code: "05", label: "Do not honor", category: "card" },
  { code: "41", label: "Lost card", category: "card" },
  { code: "43", label: "Stolen card", category: "card" },
  { code: "51", label: "Insufficient funds", category: "card" },
  { code: "54", label: "Expired card", category: "card" },
  { code: "55", label: "Incorrect PIN", category: "card" },
  { code: "57", label: "Transaction not permitted", category: "card" },
  { code: "59", label: "Suspected fraud", category: "card" },
  { code: "61", label: "Exceeds withdrawal limit", category: "card" },
  { code: "62", label: "Restricted card", category: "card" },
  { code: "63", label: "Security violation", category: "card" },
  { code: "91", label: "Issuer unavailable", category: "card" },
  { code: "96", label: "System malfunction", category: "card" },
  { code: "3DS_01", label: "Authentication failed", category: "3ds" },
  { code: "3DS_02", label: "Authentication required", category: "3ds" },
  { code: "3DS_03", label: "Authentication unavailable", category: "3ds" },
  { code: "AML_01", label: "AML risk detected", category: "aml" },
  { code: "AML_02", label: "Compliance check failed", category: "aml" },
  { code: "AML_03", label: "Source of funds not verified", category: "aml" },
  { code: "GEN_01", label: "Processing error", category: "generic" },
  { code: "GEN_02", label: "Timeout", category: "generic" },
] as const;

export const TRANSACTION_REJECT_REASON_OPTIONS: readonly TransactionOption[] = TRANSACTION_REJECT_REASONS.map((reason) => ({
  value: reason.code,
  label: `${reason.code} — ${reason.label}`,
}));

export const BANK_TRANSFER_STATUS_OPTIONS: readonly {
  code: BankTransferStatusCode;
  status: CanonicalTransactionStatus;
  display: string;
}[] = [
  { code: "ACSP", status: "pending", display: "Accepted" },
  { code: "ACSC", status: "completed", display: "Completed" },
  { code: "RJCT", status: "rejected", display: "Rejected" },
] as const;

export const BANK_TRANSFER_STATUS_SELECT_OPTIONS: readonly TransactionOption[] = BANK_TRANSFER_STATUS_OPTIONS.map((status) => ({
  value: status.code,
  label: status.display,
}));

export const BANK_TRANSFER_REASON_OPTIONS: readonly {
  code: BankTransferReasonCode;
  label: string;
  display: string;
}[] = [
  { code: "AC01", label: "Invalid account number", display: "Invalid account details" },
  { code: "AM04", label: "Insufficient funds", display: "Insufficient funds" },
  { code: "AG01", label: "Transaction forbidden", display: "Transaction forbidden" },
  { code: "FF01", label: "Fraud suspected", display: "Fraud suspected" },
  { code: "MS03", label: "Reason not specified", display: "Reason not specified" },
] as const;

export const BANK_TRANSFER_REASON_SELECT_OPTIONS: readonly TransactionOption[] = BANK_TRANSFER_REASON_OPTIONS.map((reason) => ({
  value: reason.code,
  label: reason.display,
}));

export type TransactionFormFieldKey =
  | "card_masked"
  | "funding_card_masked"
  | "counterparty_card_masked"
  | "counterparty_user_id"
  | "counterparty_name"
  | "merchant_name"
  | "merchant_country"
  | "mcc"
  | "issuer_country"
  | "iban_masked"
  | "bank_country"
  | "payment_reference"
  | "asset"
  | "wallet_masked";

export type TransactionDetailFieldKey =
  | TransactionFormFieldKey
  | "rail"
  | "reject_reason"
  | "reason_display";

export const TRANSACTION_FORM_FIELDS_BY_TYPE: Record<CanonicalTransactionType, readonly TransactionFormFieldKey[]> = {
  "Card payment": ["card_masked", "mcc", "merchant_name", "merchant_country"],
  "Card top-up": ["funding_card_masked", "issuer_country"],
  "Card transfer": ["card_masked", "counterparty_name", "counterparty_card_masked", "issuer_country"],
  "Bank transfer": ["counterparty_name", "iban_masked", "bank_country", "payment_reference"],
  "P2P transfer": ["counterparty_user_id"],
  "Crypto transfer": ["wallet_masked", "counterparty_name"],
  ATM: ["card_masked"],
};

export const TRANSACTION_DETAIL_FIELDS_BY_TYPE: Record<CanonicalTransactionType, readonly TransactionDetailFieldKey[]> = {
  "Card payment": ["card_masked", "mcc", "merchant_name", "merchant_country"],
  "Card top-up": ["funding_card_masked", "issuer_country", "reject_reason"],
  "Card transfer": ["card_masked", "counterparty_name", "counterparty_card_masked", "issuer_country"],
  "Bank transfer": ["rail", "counterparty_name", "iban_masked", "bank_country", "payment_reference", "reason_display"],
  "P2P transfer": ["counterparty_user_id", "counterparty_name"],
  "Crypto transfer": ["wallet_masked", "counterparty_name"],
  ATM: ["card_masked", "mcc"],
};

export const TRANSACTION_DETAIL_LABELS: Record<TransactionDetailFieldKey, string> = {
  card_masked: "Card",
  funding_card_masked: "Funding card",
  counterparty_card_masked: "Counterparty card",
  counterparty_user_id: "Counterparty user",
  counterparty_name: "Counterparty",
  merchant_name: "Merchant",
  merchant_country: "Merchant country",
  mcc: "MCC",
  issuer_country: "Issuer country",
  iban_masked: "IBAN",
  bank_country: "Bank country",
  payment_reference: "Payment reference",
  asset: "Asset",
  wallet_masked: "Wallet",
  rail: "Rail",
  reject_reason: "Reject reason",
  reason_display: "Reason",
};

function trimNullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function isCanonicalTransactionType(value: string | null | undefined): value is CanonicalTransactionType {
  return (CANONICAL_TRANSACTION_TYPES as readonly string[]).includes((value ?? "").trim());
}

export function isSupportedTransactionCurrency(value: string | null | undefined): value is SupportedTransactionCurrency {
  return (SUPPORTED_TRANSACTION_CURRENCIES as readonly string[]).includes((value ?? "").trim().toUpperCase());
}

export function isSupportedFiatTransactionCurrency(
  value: string | null | undefined
): value is (typeof SUPPORTED_FIAT_TRANSACTION_CURRENCIES)[number] {
  return (SUPPORTED_FIAT_TRANSACTION_CURRENCIES as readonly string[]).includes((value ?? "").trim().toUpperCase());
}

export function isSupportedCryptoTransactionCurrency(
  value: string | null | undefined
): value is (typeof SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES)[number] {
  return (SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES as readonly string[]).includes((value ?? "").trim().toUpperCase());
}

export function getSupportedTransactionCurrencies(type: string | null | undefined): readonly SupportedTransactionCurrency[] {
  return trimNullable(type) === "Crypto transfer"
    ? SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES
    : SUPPORTED_FIAT_TRANSACTION_CURRENCIES;
}

export function getSupportedTransactionCurrenciesForSelection(
  type: string | null | undefined,
  rail?: string | null | undefined
): readonly SupportedTransactionCurrency[] {
  const normalizedType = trimNullable(type);
  if (normalizedType === "Crypto transfer") {
    return SUPPORTED_CRYPTO_TRANSACTION_CURRENCIES;
  }
  if (normalizedType === "Bank transfer") {
    const normalizedRail = trimNullable(rail) as (typeof BANK_TRANSFER_CHANNEL_VALUES)[number] | null;
    if (normalizedRail && normalizedRail in BANK_TRANSFER_CURRENCIES_BY_RAIL) {
      return BANK_TRANSFER_CURRENCIES_BY_RAIL[normalizedRail];
    }
  }
  return SUPPORTED_FIAT_TRANSACTION_CURRENCIES;
}

export function getTransactionCurrencyMenuOptions(
  type: string | null | undefined,
  rail?: string | null | undefined
): readonly TransactionOption[] {
  const allowedCurrencies = getSupportedTransactionCurrenciesForSelection(type, rail);
  if (trimNullable(type) === "Crypto transfer") {
    return TRANSACTION_CRYPTO_CURRENCY_OPTIONS;
  }
  return TRANSACTION_CURRENCY_OPTIONS.filter((option) =>
    (allowedCurrencies as readonly string[]).includes(option.value)
  );
}

export function normalizeTransactionCurrencyForType(
  type: string | null | undefined,
  currency: string | null | undefined,
  rail?: string | null | undefined
): SupportedTransactionCurrency | null {
  const normalizedCurrency = trimNullable(currency)?.toUpperCase();
  const allowedCurrencies = getSupportedTransactionCurrenciesForSelection(type, rail);
  if (normalizedCurrency && (allowedCurrencies as readonly string[]).includes(normalizedCurrency)) {
    return normalizedCurrency as SupportedTransactionCurrency;
  }
  if (trimNullable(type) === "Bank transfer") {
    return (allowedCurrencies[0] ?? "EUR") as SupportedTransactionCurrency;
  }
  return trimNullable(type) === "Crypto transfer" ? "USDC" : "USD";
}

export function findRejectReasonByCode(code: string | null | undefined): TransactionRejectReason | null {
  const normalizedCode = trimNullable(code)?.toUpperCase();
  if (!normalizedCode) return null;
  return TRANSACTION_REJECT_REASONS.find((reason) => reason.code === normalizedCode) ?? null;
}

export function findBankTransferStatusByCode(
  code: string | null | undefined
): (typeof BANK_TRANSFER_STATUS_OPTIONS)[number] | null {
  const normalizedCode = trimNullable(code)?.toUpperCase();
  if (!normalizedCode) return null;
  return BANK_TRANSFER_STATUS_OPTIONS.find((status) => status.code === normalizedCode) ?? null;
}

export function getBankTransferStatusCodeForStatus(status: string | null | undefined): BankTransferStatusCode | null {
  const normalizedStatus = trimNullable(status)?.toLowerCase();
  if (!normalizedStatus) return null;
  return BANK_TRANSFER_STATUS_OPTIONS.find((option) => option.status === normalizedStatus)?.code ?? null;
}

export function findBankTransferReasonByCode(
  code: string | null | undefined
): (typeof BANK_TRANSFER_REASON_OPTIONS)[number] | null {
  const normalizedCode = trimNullable(code)?.toUpperCase();
  if (!normalizedCode) return null;
  return BANK_TRANSFER_REASON_OPTIONS.find((reason) => reason.code === normalizedCode) ?? null;
}

export function getCanonicalStatusForTransaction(
  type: string | null | undefined,
  status: string | null | undefined,
  statusCode?: string | null | undefined
): string | null {
  if (trimNullable(type) === "Bank transfer") {
    return findBankTransferStatusByCode(statusCode)?.status ?? trimNullable(status)?.toLowerCase() ?? null;
  }
  return trimNullable(status)?.toLowerCase() ?? null;
}

export function getTransactionStatusDisplay(transaction: Partial<TransactionRow>): string | null {
  const type = trimNullable(transaction.type);
  if (type === "Bank transfer") {
    return trimNullable(transaction.status_display) ?? findBankTransferStatusByCode(transaction.status_code)?.display ?? null;
  }
  const status = trimNullable(transaction.status);
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : null;
}

export function roundToUsdCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAmountUsd(amount: number | null | undefined, currency: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const normalizedCurrency = trimNullable(currency)?.toUpperCase();
  if (!normalizedCurrency || !isSupportedTransactionCurrency(normalizedCurrency)) return null;
  if (isSupportedFiatTransactionCurrency(normalizedCurrency)) {
    return roundToUsdCents(amount * TRANSACTION_FX_RATES[normalizedCurrency]);
  }
  if (isSupportedCryptoTransactionCurrency(normalizedCurrency)) {
    return roundToUsdCents(amount * TRANSACTION_CRYPTO_USD_RATES[normalizedCurrency]);
  }
  return null;
}

export function formatMaskedCardReference(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `*${digits.slice(-4)}`;
}

export function getCardReferenceLastFour(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.slice(-4);
}

export function getTransactionChannelMenuOptions(
  type: string | null | undefined,
  direction: string | null | undefined
): readonly TransactionOption[] {
  switch (trimNullable(type)) {
    case "Card payment":
      return (trimNullable(direction)?.toLowerCase() === "inbound"
        ? [{ value: "Refund", label: "Refund" }]
        : CARD_PAYMENT_OUTBOUND_CHANNEL_VALUES.map((value) => ({ value, label: value }))) as readonly TransactionOption[];
    case "Bank transfer":
      return BANK_TRANSFER_CHANNEL_OPTIONS;
    case "Card top-up":
      return [{ value: "ePOS", label: "ePOS" }] as const;
    case "Card transfer":
      return [{ value: "C2C", label: "C2C" }] as const;
    case "P2P transfer":
      return [{ value: "P2P", label: "P2P" }] as const;
    case "Crypto transfer":
      return [{ value: "CRYPTO", label: "CRYPTO" }] as const;
    case "ATM":
      return [{ value: "ATM", label: "ATM" }] as const;
    default:
      return [];
  }
}

export function getFixedDirectionForTransactionType(type: string | null | undefined): string | null {
  switch (trimNullable(type)) {
    case "Card top-up":
      return "inbound";
    case "ATM":
      return "outbound";
    default:
      return null;
  }
}

export function isDirectionLockedForTransactionType(type: string | null | undefined): boolean {
  return getFixedDirectionForTransactionType(type) !== null;
}

export function isChannelLockedForTransactionType(type: string | null | undefined): boolean {
  const normalizedType = trimNullable(type);
  return (
    normalizedType === "Card top-up" ||
    normalizedType === "Card transfer" ||
    normalizedType === "P2P transfer" ||
    normalizedType === "Crypto transfer" ||
    normalizedType === "ATM"
  );
}

export function normalizeTransactionDirectionForType(
  type: string | null | undefined,
  direction: string | null | undefined
): string | null {
  const fixedDirection = getFixedDirectionForTransactionType(type);
  if (fixedDirection) return fixedDirection;
  const normalizedDirection = trimNullable(direction)?.toLowerCase();
  if (normalizedDirection === "inbound" || normalizedDirection === "outbound") return normalizedDirection;
  return normalizedDirection ?? null;
}

export function normalizeTransactionChannelForType(
  type: string | null | undefined,
  direction: string | null | undefined,
  channel: string | null | undefined
): string | null {
  const normalizedType = trimNullable(type);
  const normalizedChannel = trimNullable(channel);
  const normalizedDirection = trimNullable(direction)?.toLowerCase();

  switch (normalizedType) {
    case "Card payment":
      if (normalizedDirection === "inbound") return "Refund";
      return normalizedChannel === "POS" || normalizedChannel === "ePOS" ? normalizedChannel : "ePOS";
    case "Card top-up":
      return "ePOS";
    case "Card transfer":
      return "C2C";
    case "Bank transfer":
      return (BANK_TRANSFER_CHANNEL_VALUES as readonly string[]).includes(normalizedChannel ?? "") ? normalizedChannel : "SEPA";
    case "P2P transfer":
      return "P2P";
    case "Crypto transfer":
      return "CRYPTO";
    case "ATM":
      return "ATM";
    default:
      return normalizedChannel;
  }
}

export function normalizeTransactionRail(
  type: string | null | undefined,
  channel: string | null | undefined,
  rail: string | null | undefined
): string | null {
  const normalizedType = trimNullable(type);
  const normalizedRail = trimNullable(rail);
  const normalizedChannel = trimNullable(channel);
  if (normalizedType === "Bank transfer") {
    return normalizedChannel ?? normalizedRail ?? "SEPA";
  }
  return isCanonicalTransactionType(normalizedType) ? null : normalizedRail;
}

export function getTransactionDescription(values: Partial<TransactionRow>): string | null {
  const type = trimNullable(values.type);
  const direction = trimNullable(values.direction)?.toLowerCase();
  const merchantName = trimNullable(values.merchant_name);
  const counterpartyName = trimNullable(values.counterparty_name);
  const displayName = trimNullable(values.display_name);
  const cardMasked = formatMaskedCardReference(values.card_masked);
  const fundingCardMasked = formatMaskedCardReference(values.funding_card_masked);
  const counterpartyCardMasked = formatMaskedCardReference(values.counterparty_card_masked);

  switch (type) {
    case "Card payment":
      if (direction === "inbound") {
        return merchantName ? `Refund from ${merchantName}` : "Refund";
      }
      return merchantName ?? displayName ?? counterpartyName ?? "Card payment";
    case "Card top-up":
      return fundingCardMasked ?? cardMasked ?? null;
    case "Card transfer":
      return counterpartyName ?? counterpartyCardMasked ?? displayName ?? "Card transfer";
    case "Bank transfer":
      return counterpartyName ?? displayName ?? "Bank transfer";
    case "P2P transfer":
      return counterpartyName ?? displayName ?? "P2P transfer";
    case "Crypto transfer":
      return direction === "inbound" ? "Crypto deposit" : "Crypto withdrawal";
    case "ATM":
      return "ATM withdrawal";
    default:
      return displayName ?? merchantName ?? counterpartyName ?? type;
  }
}

export function getTransactionDescriptionFromRow(transaction: Partial<TransactionRow>): string | null {
  return getTransactionDescription(transaction);
}

export function getTransactionDetailFields(
  type: string | null | undefined,
  status: string | null | undefined
): readonly TransactionDetailFieldKey[] {
  if (!isCanonicalTransactionType(type)) return [];
  const baseFields = [...TRANSACTION_DETAIL_FIELDS_BY_TYPE[type]];
  if (type === "Bank transfer") {
    if (trimNullable(status)?.toLowerCase() !== "rejected") {
      return baseFields.filter((field) => field !== "reason_display");
    }
    return baseFields;
  }
  if (type !== "Card top-up" || trimNullable(status)?.toLowerCase() !== "rejected") {
    return baseFields.filter((field) => field !== "reject_reason");
  }
  return baseFields;
}

export function getTransactionFormFields(type: string | null | undefined): readonly TransactionFormFieldKey[] {
  return isCanonicalTransactionType(type) ? TRANSACTION_FORM_FIELDS_BY_TYPE[type] : [];
}

export function getUserDisplayName(user: { id?: string | null; full_name?: string | null; email?: string | null } | null | undefined): string | null {
  return trimNullable(user?.full_name) ?? trimNullable(user?.email) ?? trimNullable(user?.id);
}

export function getPaymentMethodCardOptions(paymentMethods: PaymentMethodRow[]): TransactionOption[] {
  const seen = new Set<string>();
  return paymentMethods
    .filter((paymentMethod) => {
      const type = trimNullable(paymentMethod.type)?.toLowerCase() ?? "";
      return type === "card" || type.includes("card");
    })
    .map((paymentMethod) => formatMaskedCardReference(paymentMethod.masked_number))
    .filter((masked): masked is string => Boolean(masked))
    .filter((masked) => {
      if (seen.has(masked)) return false;
      seen.add(masked);
      return true;
    })
    .map((masked) => ({ value: masked, label: masked }));
}

export function getTransactionRejectReasonLabel(reason: TransactionRejectReason | null | undefined): string | null {
  if (!reason) return null;
  return `${reason.code} — ${reason.label}`;
}

function transactionDateToMs(value: string | null | undefined): number | null {
  const trimmed = trimNullable(value);
  if (!trimmed) return null;
  const parsed = new Date(trimmed).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function getTransactionChronologyConflictIds(
  transactions: Pick<TransactionRow, "id" | "transaction_date">[]
): string[] {
  const conflicts: string[] = [];
  let maxDateBelowMs: number | null = null;

  for (let index = transactions.length - 1; index >= 0; index -= 1) {
    const transaction = transactions[index];
    const currentDateMs = transactionDateToMs(transaction?.transaction_date);
    if (currentDateMs != null && maxDateBelowMs != null && currentDateMs < maxDateBelowMs) {
      conflicts.push(transaction.id);
    }
    if (currentDateMs != null) {
      maxDateBelowMs = maxDateBelowMs == null ? currentDateMs : Math.max(maxDateBelowMs, currentDateMs);
    }
  }

  return conflicts.reverse();
}
