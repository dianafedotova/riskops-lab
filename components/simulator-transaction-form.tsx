"use client";

import { FilterSelect } from "@/components/filter-select";
import { buildOptionsWithCurrent, SimulatorFormField, SimulatorFormInput } from "@/components/simulator-form-primitives";
import { formatTransactionAmountUsd } from "@/lib/format";
import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import { createSimulatorTransaction, deleteSimulatorTransaction, updateSimulatorTransaction } from "@/lib/services/simulator-transactions";
import { createClient } from "@/lib/supabase";
import {
  BANK_TRANSFER_REASON_SELECT_OPTIONS,
  BANK_TRANSFER_STATUS_SELECT_OPTIONS,
  calculateAmountUsd,
  findBankTransferReasonByCode,
  findBankTransferStatusByCode,
  findRejectReasonByCode,
  formatMaskedCardReference,
  getBankTransferStatusCodeForStatus,
  getPaymentMethodCardOptions,
  getTransactionChannelMenuOptions,
  getTransactionCurrencyMenuOptions,
  getTransactionDescription,
  getTransactionFormFields,
  getUserDisplayName,
  isCanonicalTransactionType,
  isDirectionLockedForTransactionType,
  getSupportedTransactionCurrencies,
  MCC_OPTIONS,
  normalizeTransactionCurrencyForType,
  normalizeTransactionChannelForType,
  normalizeTransactionDirectionForType,
  normalizeTransactionRail,
  TRANSACTION_REJECT_REASON_OPTIONS,
  TRANSACTION_STATUS_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
} from "@/lib/transactions";
import type { AppUserRow, CreateSimulatorTransactionInput, PaymentMethodRow, TransactionRow } from "@/lib/types";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type SimulatorTransactionFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  userId: string;
  paymentMethods: PaymentMethodRow[];
  initialValue?: Partial<TransactionRow> | null;
  submitLabel?: string;
  onSaved?: (transaction: TransactionRow) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
};

type TransactionFormValues = {
  transaction_date: string;
  direction: string;
  type: string;
  channel: string;
  rail: string;
  display_name: string;
  card_masked: string;
  funding_card_masked: string;
  counterparty_card_masked: string;
  counterparty_user_id: string;
  counterparty_name: string;
  merchant_name: string;
  merchant_country: string;
  mcc: string;
  issuer_country: string;
  iban_masked: string;
  bank_country: string;
  payment_reference: string;
  asset: string;
  wallet_masked: string;
  status_code: string;
  reason_code: string;
  status_display: string;
  reason_display: string;
  reject_reason_code: string;
  status: string;
  amount: string;
  amount_usd: string;
  currency: string;
};

const DIRECTION_OPTIONS = [
  { value: "", label: "Select direction" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
] as const;

const COUNTRY_CODE_OPTIONS = [
  { value: "", label: "Select country" },
  ...COUNTRY_OPTIONS.map((country) => ({
    value: country.code,
    label: `${country.code} · ${country.name}`,
  })),
] as const;

const ALL_CONDITIONAL_FIELDS = [
  "card_masked",
  "funding_card_masked",
  "counterparty_card_masked",
  "counterparty_user_id",
  "counterparty_name",
  "merchant_name",
  "merchant_country",
  "mcc",
  "issuer_country",
  "iban_masked",
  "bank_country",
  "payment_reference",
  "asset",
  "wallet_masked",
] as const;

function toInputValue(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNumericValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCurrentDescriptionSeed(transaction?: Partial<TransactionRow> | null): string {
  return (
    getTransactionDescription({
      ...transaction,
      card_masked: formatMaskedCardReference(transaction?.card_masked),
      funding_card_masked: formatMaskedCardReference(transaction?.funding_card_masked),
      counterparty_card_masked: formatMaskedCardReference(transaction?.counterparty_card_masked),
    }) ?? ""
  );
}

function buildTransactionFormValues(transaction?: Partial<TransactionRow> | null): TransactionFormValues {
  const base: TransactionFormValues = {
    transaction_date: toDateInput(transaction?.transaction_date),
    direction: toInputValue(transaction?.direction).toLowerCase(),
    type: toInputValue(transaction?.type),
    channel: toInputValue(transaction?.channel),
    rail: toInputValue(transaction?.rail),
    display_name: getCurrentDescriptionSeed(transaction),
    card_masked: toInputValue(formatMaskedCardReference(transaction?.card_masked)),
    funding_card_masked: toInputValue(formatMaskedCardReference(transaction?.funding_card_masked)),
    counterparty_card_masked: toInputValue(formatMaskedCardReference(transaction?.counterparty_card_masked)),
    counterparty_user_id: toInputValue(transaction?.counterparty_user_id),
    counterparty_name: toInputValue(transaction?.counterparty_name),
    merchant_name: toInputValue(transaction?.merchant_name),
    merchant_country: toInputValue(transaction?.merchant_country),
    mcc: toInputValue(transaction?.mcc),
    issuer_country: toInputValue(transaction?.issuer_country),
    iban_masked: toInputValue(transaction?.iban_masked),
    bank_country: toInputValue(transaction?.bank_country),
    payment_reference: toInputValue(transaction?.payment_reference),
    asset: toInputValue(transaction?.asset).toUpperCase(),
    wallet_masked: toInputValue(transaction?.wallet_masked),
    status_code:
      toInputValue(transaction?.status_code) ||
      (toInputValue(transaction?.type) === "Bank transfer"
        ? toInputValue(getBankTransferStatusCodeForStatus(transaction?.status))
        : ""),
    reason_code: toInputValue(transaction?.reason_code),
    status_display:
      toInputValue(transaction?.status_display) ||
      toInputValue(findBankTransferStatusByCode(transaction?.status_code)?.display),
    reason_display:
      toInputValue(transaction?.reason_display) ||
      toInputValue(findBankTransferReasonByCode(transaction?.reason_code)?.display),
    reject_reason_code: toInputValue(transaction?.reject_reason?.code),
    status: toInputValue(transaction?.status).toLowerCase(),
    amount: toInputValue(transaction?.amount),
    amount_usd: toInputValue(transaction?.amount_usd),
    currency:
      normalizeTransactionCurrencyForType(
        transaction?.type,
        toInputValue(transaction?.currency || "USD"),
        transaction?.rail ?? transaction?.channel
      ) ?? "USD",
  };
  return syncDerivedValues(base);
}

function clearIrrelevantFields(next: TransactionFormValues): TransactionFormValues {
  if (!isCanonicalTransactionType(next.type)) return next;
  const visibleFields = new Set(getTransactionFormFields(next.type));
  const cleaned = { ...next };
  for (const field of ALL_CONDITIONAL_FIELDS) {
    if (!visibleFields.has(field)) cleaned[field] = "";
  }
  if (next.type !== "Bank transfer") {
    cleaned.rail = "";
    cleaned.status_code = "";
    cleaned.reason_code = "";
    cleaned.status_display = "";
    cleaned.reason_display = "";
  }
  return cleaned;
}

function syncDerivedValues(values: TransactionFormValues): TransactionFormValues {
  const next = { ...values };
  const requestedDirection =
    next.type === "Card payment" && next.channel === "Refund" && next.direction !== "outbound"
      ? "inbound"
      : next.direction;
  next.direction = normalizeTransactionDirectionForType(next.type, requestedDirection) ?? "";
  next.channel = normalizeTransactionChannelForType(next.type, next.direction, next.channel) ?? "";
  next.rail = normalizeTransactionRail(next.type, next.channel, next.rail) ?? "";
  next.currency = normalizeTransactionCurrencyForType(next.type, next.currency, next.rail || next.channel) ?? "";
  next.asset = next.type === "Crypto transfer" ? next.currency : next.asset;
  if (next.type === "ATM") next.mcc = "6011";
  if (next.type === "Bank transfer") {
    const bankTransferStatus = findBankTransferStatusByCode(next.status_code);
    next.status = bankTransferStatus?.status ?? "";
    next.status_display = bankTransferStatus?.display ?? "";
    const bankTransferReason = bankTransferStatus?.code === "RJCT" ? findBankTransferReasonByCode(next.reason_code) : null;
    next.reason_code = bankTransferReason?.code ?? "";
    next.reason_display = bankTransferReason?.display ?? "";
    next.reject_reason_code = "";
  } else {
    next.status_code = "";
    next.reason_code = "";
    next.status_display = "";
    next.reason_display = "";
    if (next.type !== "Card top-up" || next.status !== "rejected") next.reject_reason_code = "";
  }
  const amount = toNumericValue(next.amount);
  const amountUsd = amount == null ? null : calculateAmountUsd(amount, next.currency);
  next.amount_usd = amountUsd == null ? "" : amountUsd.toFixed(2);
  next.display_name =
    getTransactionDescription({
      type: next.type,
      direction: next.direction,
      channel: next.channel,
      display_name: isCanonicalTransactionType(next.type) ? "" : next.display_name,
      card_masked: next.card_masked,
      funding_card_masked: next.funding_card_masked,
      counterparty_card_masked: next.counterparty_card_masked,
      counterparty_name: next.counterparty_name,
      merchant_name: next.merchant_name,
    }) ?? "";
  return next;
}

function buildCardSelectOptions(paymentMethods: PaymentMethodRow[], currentValue: string) {
  const base = getPaymentMethodCardOptions(paymentMethods);
  const options = [{ value: "", label: base.length > 0 ? "Select card" : "Add a linked card first" }, ...base];
  return buildOptionsWithCurrent(options, currentValue);
}

function formatTransactionAmountPreview(values: TransactionFormValues): string {
  const amount = values.amount.trim();
  const currency = values.currency.trim().toUpperCase();
  if (!amount || !currency) return "—";
  if (!values.amount_usd) return `${amount} ${currency}`;
  return `${amount} ${currency} (${formatTransactionAmountUsd(Number(values.amount_usd), values.direction)})`;
}

export function SimulatorTransactionForm(props: SimulatorTransactionFormProps) {
  const formStateKey = `${props.mode}:${props.userId}:${props.initialValue?.id ?? "new"}:${props.initialValue?.updated_at ?? props.initialValue?.created_at ?? ""}`;

  return <SimulatorTransactionFormBody key={formStateKey} {...props} />;
}

function SimulatorTransactionFormBody(props: SimulatorTransactionFormProps) {
  const { viewer, mode, userId, paymentMethods, initialValue, submitLabel, onSaved, onDeleted, onCancel } = props;
  const [values, setValues] = useState<TransactionFormValues>(() => buildTransactionFormValues(initialValue));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [p2pLookupLoading, setP2pLookupLoading] = useState(false);
  const [p2pLookupError, setP2pLookupError] = useState<string | null>(null);
  const counterpartyUserId = values.counterparty_user_id.trim();
  const shouldLookupP2pCounterparty = values.type === "P2P transfer" && counterpartyUserId.length > 0;

  useEffect(() => {
    if (!shouldLookupP2pCounterparty) return;

    let cancelled = false;

    (async () => {
      setP2pLookupLoading(true);
      setP2pLookupError(null);
      const supabase = createClient();
      const { data, error: lookupError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", counterpartyUserId)
        .maybeSingle();

      if (cancelled) return;
      if (lookupError) {
        setP2pLookupError(lookupError.message);
        setP2pLookupLoading(false);
        return;
      }
      if (!data) {
        setP2pLookupError("User not found in your visible scope.");
        setP2pLookupLoading(false);
        return;
      }

      const resolvedName = getUserDisplayName(data) ?? counterpartyUserId;
      setValues((current) => {
        if (current.type !== "P2P transfer" || current.counterparty_user_id.trim() !== counterpartyUserId) {
          return current;
        }
        if (current.counterparty_name === resolvedName) return current;
        return syncDerivedValues({ ...current, counterparty_name: resolvedName });
      });
      setP2pLookupError(null);
      setP2pLookupLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [counterpartyUserId, shouldLookupP2pCounterparty]);

  const cardOptions = useMemo(
    () => buildCardSelectOptions(paymentMethods, values.card_masked),
    [paymentMethods, values.card_masked]
  );
  const typeOptions = useMemo(() => buildOptionsWithCurrent(TRANSACTION_TYPE_OPTIONS, values.type), [values.type]);
  const statusOptions = useMemo(
    () =>
      values.type === "Bank transfer"
        ? buildOptionsWithCurrent(BANK_TRANSFER_STATUS_SELECT_OPTIONS, values.status_code)
        : buildOptionsWithCurrent(TRANSACTION_STATUS_OPTIONS, values.status),
    [values.status, values.status_code, values.type]
  );
  const currencyOptions = useMemo(
    () => buildOptionsWithCurrent(getTransactionCurrencyMenuOptions(values.type, values.rail || values.channel), values.currency),
    [values.channel, values.currency, values.rail, values.type]
  );
  const directionOptions = useMemo(
    () => buildOptionsWithCurrent(DIRECTION_OPTIONS, values.direction),
    [values.direction]
  );
  const channelMenuOptions = useMemo(
    () => getTransactionChannelMenuOptions(values.type, values.direction),
    [values.direction, values.type]
  );
  const channelOptions = useMemo(
    () => buildOptionsWithCurrent(channelMenuOptions, values.channel),
    [channelMenuOptions, values.channel]
  );
  const mccOptions = useMemo(() => buildOptionsWithCurrent(MCC_OPTIONS, values.mcc), [values.mcc]);
  const rejectReasonOptions = useMemo(
    () => buildOptionsWithCurrent(TRANSACTION_REJECT_REASON_OPTIONS, values.reject_reason_code),
    [values.reject_reason_code]
  );
  const bankTransferReasonOptions = useMemo(
    () => buildOptionsWithCurrent(BANK_TRANSFER_REASON_SELECT_OPTIONS, values.reason_code),
    [values.reason_code]
  );
  const merchantCountryOptions = useMemo(
    () => buildOptionsWithCurrent(COUNTRY_CODE_OPTIONS, values.merchant_country),
    [values.merchant_country]
  );
  const effectiveIssuerCountry = values.issuer_country || (mode === "edit" ? toInputValue(initialValue?.issuer_country) : "");
  const issuerCountryOptions = useMemo(
    () => buildOptionsWithCurrent(COUNTRY_CODE_OPTIONS, effectiveIssuerCountry),
    [effectiveIssuerCountry]
  );
  const bankCountryOptions = useMemo(
    () => buildOptionsWithCurrent(COUNTRY_CODE_OPTIONS, values.bank_country),
    [values.bank_country]
  );
  const visibleFields = useMemo(() => new Set(getTransactionFormFields(values.type)), [values.type]);
  const directionLocked = isDirectionLockedForTransactionType(values.type);
  const channelLocked = channelMenuOptions.length === 1;
  const legacyCurrencyUnsupported =
    values.currency.trim() !== "" && !(getSupportedTransactionCurrencies(values.type) as readonly string[]).includes(values.currency.trim().toUpperCase());
  const p2pLookupHelperText = !shouldLookupP2pCounterparty
    ? "Description will resolve from the selected user automatically."
    : p2pLookupLoading
      ? "Looking up counterparty…"
      : p2pLookupError
        ? p2pLookupError
        : values.counterparty_name
          ? `Resolved name: ${values.counterparty_name}`
          : "Description will resolve from the selected user automatically.";

  const handleChange = (field: keyof TransactionFormValues, nextValue: string) => {
    setValues((current) => {
      let next: TransactionFormValues = {
        ...current,
        [field]: nextValue,
      };

      if (field === "type") next = clearIrrelevantFields(next);
      if (field === "counterparty_user_id" && current.type === "P2P transfer") next.counterparty_name = "";

      if (field === "card_masked" || field === "funding_card_masked" || field === "counterparty_card_masked") {
        next[field] = formatMaskedCardReference(nextValue) ?? nextValue;
      }

      if (next.type === "Crypto transfer") {
        next.asset = next.currency.trim().toUpperCase();
      }

      return syncDerivedValues(next);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: CreateSimulatorTransactionInput = {
      user_id: userId,
      transaction_date: values.transaction_date,
      direction: values.direction,
      type: values.type,
      channel: toNullableString(values.channel),
      rail: toNullableString(values.rail),
      display_name: toNullableString(values.display_name),
      card_masked: toNullableString(values.card_masked),
      funding_card_masked: toNullableString(values.funding_card_masked),
      counterparty_card_masked: toNullableString(values.counterparty_card_masked),
      counterparty_user_id: toNullableString(values.counterparty_user_id),
      counterparty_name: toNullableString(values.counterparty_name),
      merchant_name: toNullableString(values.merchant_name),
      merchant_country: toNullableString(values.merchant_country),
      mcc: toNullableString(values.mcc),
      issuer_country: toNullableString(effectiveIssuerCountry),
      iban_masked: toNullableString(values.iban_masked),
      bank_country: toNullableString(values.bank_country),
      payment_reference: toNullableString(values.payment_reference),
      asset: values.type === "Crypto transfer" ? toNullableString(values.currency) : toNullableString(values.asset),
      wallet_masked: toNullableString(values.wallet_masked),
      reject_reason: findRejectReasonByCode(values.reject_reason_code),
      status_code: findBankTransferStatusByCode(values.status_code)?.code ?? null,
      reason_code: findBankTransferReasonByCode(values.reason_code)?.code ?? null,
      status_display: toNullableString(values.status_display),
      reason_display: toNullableString(values.reason_display),
      status: values.type === "Bank transfer" ? values.status || "pending" : values.status,
      amount: values.amount,
      amount_usd: toNullableString(values.amount_usd),
      currency: values.currency,
    };

    const supabase = createClient();
    const result =
      mode === "create"
        ? await createSimulatorTransaction(supabase, viewer, payload)
        : await updateSimulatorTransaction(supabase, viewer, {
            id: String(initialValue?.id ?? ""),
            ...payload,
          });

    if (result.error || !result.transaction) {
      setError(result.error ?? "Could not save this transaction.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved?.(result.transaction);
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !initialValue?.id) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const result = await deleteSimulatorTransaction(supabase, viewer, String(initialValue.id));
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    setDeleting(false);
    onDeleted?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SimulatorFormField htmlFor="sim-transaction-date" label="Date">
          <SimulatorFormInput
            id="sim-transaction-date"
            type="date"
            value={values.transaction_date}
            onChange={(event) => handleChange("transaction_date", event.target.value)}
            disabled={saving || deleting}
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-transaction-direction" label="Direction">
          <FilterSelect
            id="sim-transaction-direction"
            ariaLabel="Transaction direction"
            disabled={saving || deleting || directionLocked}
            value={values.direction}
            onChange={(nextValue) => handleChange("direction", nextValue)}
            options={directionOptions}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-transaction-type" label="Type">
          <FilterSelect
            id="sim-transaction-type"
            ariaLabel="Transaction type"
            disabled={saving || deleting}
            value={values.type}
            onChange={(nextValue) => handleChange("type", nextValue)}
            options={typeOptions}
            menuOptions={[...TRANSACTION_TYPE_OPTIONS]}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-transaction-status" label="Status">
          <FilterSelect
            id="sim-transaction-status"
            ariaLabel="Transaction status"
            disabled={saving || deleting}
            value={values.type === "Bank transfer" ? values.status_code : values.status}
            onChange={(nextValue) =>
              handleChange(values.type === "Bank transfer" ? "status_code" : "status", nextValue)
            }
            options={statusOptions}
            menuOptions={
              values.type === "Bank transfer"
                ? [...BANK_TRANSFER_STATUS_SELECT_OPTIONS]
                : [...TRANSACTION_STATUS_OPTIONS]
            }
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-transaction-channel" label="Channel">
          {channelMenuOptions.length > 0 ? (
            <FilterSelect
              id="sim-transaction-channel"
              ariaLabel="Transaction channel"
              disabled={saving || deleting || channelLocked}
              value={values.channel}
              onChange={(nextValue) => handleChange("channel", nextValue)}
              options={channelOptions}
              menuOptions={[...channelMenuOptions]}
              className="h-11 rounded-[0.95rem]"
            />
          ) : (
            <SimulatorFormInput
              id="sim-transaction-channel"
              type="text"
              value={values.channel}
              readOnly
              disabled
              placeholder={!values.type ? "Select a transaction type first" : "Legacy channel"}
              className="cursor-not-allowed bg-slate-50/80"
            />
          )}
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-transaction-currency" label="Currency">
          <FilterSelect
            id="sim-transaction-currency"
            ariaLabel="Transaction currency"
            disabled={saving || deleting}
            value={values.currency}
            onChange={(nextValue) => handleChange("currency", nextValue)}
            options={currencyOptions}
            menuOptions={[...getTransactionCurrencyMenuOptions(values.type, values.rail || values.channel)]}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
        <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
          <SimulatorFormField htmlFor="sim-transaction-amount" label="Amount">
            <SimulatorFormInput
              id="sim-transaction-amount"
              type="number"
              step="0.01"
              value={values.amount}
              onChange={(event) => handleChange("amount", event.target.value)}
              disabled={saving || deleting}
            />
          </SimulatorFormField>
          <SimulatorFormField htmlFor="sim-transaction-amount-usd" label="Amount USD">
            <SimulatorFormInput
              id="sim-transaction-amount-usd"
              type="text"
              value={
                values.amount_usd
                  ? formatTransactionAmountUsd(Number(values.amount_usd), values.direction)
                  : ""
              }
              readOnly
              disabled
              placeholder="Calculated automatically"
              className="cursor-not-allowed bg-slate-50/80"
            />
          </SimulatorFormField>
          <div className="flex items-end rounded-[0.95rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            {formatTransactionAmountPreview(values)}
          </div>
        </div>
        <div className="md:col-span-2">
          <SimulatorFormField htmlFor="sim-transaction-display" label="Description Preview">
            <SimulatorFormInput
              id="sim-transaction-display"
              type="text"
              value={values.display_name}
              readOnly
              disabled
              placeholder="Generated automatically from transaction details"
              className="cursor-not-allowed bg-slate-50/80"
            />
          </SimulatorFormField>
        </div>
        {visibleFields.has("card_masked") ? (
          <SimulatorFormField htmlFor="sim-transaction-card" label="Card">
            <FilterSelect
              id="sim-transaction-card"
              ariaLabel="Transaction card"
              disabled={saving || deleting}
              value={values.card_masked}
              onChange={(nextValue) => handleChange("card_masked", nextValue)}
              options={cardOptions}
              menuOptions={cardOptions}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("funding_card_masked") ? (
          <SimulatorFormField htmlFor="sim-transaction-funding-card" label="Funding Card">
            <SimulatorFormInput
              id="sim-transaction-funding-card"
              type="text"
              value={values.funding_card_masked}
              onChange={(event) => handleChange("funding_card_masked", event.target.value)}
              placeholder="*1122"
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("counterparty_card_masked") ? (
          <SimulatorFormField htmlFor="sim-transaction-counterparty-card" label="Counterparty Card">
            <SimulatorFormInput
              id="sim-transaction-counterparty-card"
              type="text"
              value={values.counterparty_card_masked}
              onChange={(event) => handleChange("counterparty_card_masked", event.target.value)}
              placeholder="*1122"
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("merchant_name") ? (
          <SimulatorFormField htmlFor="sim-transaction-merchant" label="Merchant">
            <SimulatorFormInput
              id="sim-transaction-merchant"
              type="text"
              value={values.merchant_name}
              onChange={(event) => handleChange("merchant_name", event.target.value)}
              placeholder="Amazon"
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("merchant_country") ? (
          <SimulatorFormField htmlFor="sim-transaction-merchant-country" label="Merchant Country">
            <FilterSelect
              id="sim-transaction-merchant-country"
              ariaLabel="Merchant country"
              value={values.merchant_country}
              onChange={(nextValue) => handleChange("merchant_country", nextValue)}
              options={merchantCountryOptions}
              menuOptions={[...COUNTRY_CODE_OPTIONS]}
              disabled={saving || deleting}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("mcc") ? (
          <SimulatorFormField htmlFor="sim-transaction-mcc" label="MCC">
            <FilterSelect
              id="sim-transaction-mcc"
              ariaLabel="Merchant category code"
              disabled={saving || deleting || values.type === "ATM"}
              value={values.mcc}
              onChange={(nextValue) => handleChange("mcc", nextValue)}
              options={mccOptions}
              menuOptions={[...MCC_OPTIONS]}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("issuer_country") ? (
          <SimulatorFormField htmlFor="sim-transaction-issuer-country" label="Issuer Country">
            <FilterSelect
              id="sim-transaction-issuer-country"
              ariaLabel="Issuer country"
              value={effectiveIssuerCountry}
              onChange={(nextValue) => handleChange("issuer_country", nextValue)}
              options={issuerCountryOptions}
              menuOptions={[...COUNTRY_CODE_OPTIONS]}
              disabled={saving || deleting}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("counterparty_name") ? (
          <SimulatorFormField
            htmlFor={values.type === "Crypto transfer" ? "sim-transaction-counterparty-label" : "sim-transaction-counterparty-name"}
            label={values.type === "Crypto transfer" ? "Counterparty Label" : "Counterparty"}
          >
            <SimulatorFormInput
              id={values.type === "Crypto transfer" ? "sim-transaction-counterparty-label" : "sim-transaction-counterparty-name"}
              type="text"
              value={values.counterparty_name}
              onChange={(event) => handleChange("counterparty_name", event.target.value)}
              placeholder={values.type === "Crypto transfer" ? "Binance / Unknown wallet" : "Counterparty"}
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("counterparty_user_id") ? (
          <div className="md:col-span-2">
            <SimulatorFormField htmlFor="sim-transaction-counterparty-user" label="Counterparty User ID">
              <SimulatorFormInput
                id="sim-transaction-counterparty-user"
                type="text"
                value={values.counterparty_user_id}
                onChange={(event) => handleChange("counterparty_user_id", event.target.value)}
                placeholder="Paste the simulator user UUID"
                disabled={saving || deleting}
              />
            </SimulatorFormField>
            <p className="mt-2 text-xs text-slate-500">
              {p2pLookupHelperText}
            </p>
          </div>
        ) : null}
        {visibleFields.has("iban_masked") ? (
          <SimulatorFormField htmlFor="sim-transaction-iban" label="IBAN">
            <SimulatorFormInput
              id="sim-transaction-iban"
              type="text"
              value={values.iban_masked}
              onChange={(event) => handleChange("iban_masked", event.target.value)}
              placeholder="DE89••••••••••••3704"
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("bank_country") ? (
          <SimulatorFormField htmlFor="sim-transaction-bank-country" label="Bank Country">
            <FilterSelect
              id="sim-transaction-bank-country"
              ariaLabel="Bank country"
              value={values.bank_country}
              onChange={(nextValue) => handleChange("bank_country", nextValue)}
              options={bankCountryOptions}
              menuOptions={[...COUNTRY_CODE_OPTIONS]}
              disabled={saving || deleting}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("payment_reference") ? (
          <SimulatorFormField htmlFor="sim-transaction-payment-purpose" label="Payment Reference">
            <SimulatorFormInput
              id="sim-transaction-payment-purpose"
              type="text"
              value={values.payment_reference}
              onChange={(event) => handleChange("payment_reference", event.target.value)}
              placeholder="Invoice 1042 / Salary / Rent"
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {visibleFields.has("wallet_masked") ? (
          <SimulatorFormField htmlFor="sim-transaction-wallet" label="Wallet">
            <SimulatorFormInput
              id="sim-transaction-wallet"
              type="text"
              value={values.wallet_masked}
              onChange={(event) => handleChange("wallet_masked", event.target.value)}
              placeholder="0x71C…9Af3"
              disabled={saving || deleting}
            />
          </SimulatorFormField>
        ) : null}
        {values.type === "Bank transfer" && values.status_code === "RJCT" ? (
          <SimulatorFormField htmlFor="sim-transaction-bank-reason" label="Reason">
            <FilterSelect
              id="sim-transaction-bank-reason"
              ariaLabel="Bank transfer rejection reason"
              disabled={saving || deleting}
              value={values.reason_code}
              onChange={(nextValue) => handleChange("reason_code", nextValue)}
              options={bankTransferReasonOptions}
              menuOptions={[...BANK_TRANSFER_REASON_SELECT_OPTIONS]}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
        {values.type === "Card top-up" && values.status === "rejected" ? (
          <SimulatorFormField htmlFor="sim-transaction-reject-reason" label="Reject Reason">
            <FilterSelect
              id="sim-transaction-reject-reason"
              ariaLabel="Reject reason"
              disabled={saving || deleting}
              value={values.reject_reason_code}
              onChange={(nextValue) => handleChange("reject_reason_code", nextValue)}
              options={rejectReasonOptions}
              menuOptions={[...TRANSACTION_REJECT_REASON_OPTIONS]}
              className="h-11 rounded-[0.95rem]"
            />
          </SimulatorFormField>
        ) : null}
      </div>

      {legacyCurrencyUnsupported ? (
        <p className="rounded-[0.95rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This legacy transaction uses an unsupported currency. Choose one of the supported currencies for this transaction type before saving.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        {error ? <p className="mr-auto text-sm font-medium text-rose-700">{error}</p> : null}
        {mode === "edit" && onDeleted ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete transaction"}
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving || deleting}
          className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create transaction" : "Save transaction")}
        </button>
      </div>
    </form>
  );
}
