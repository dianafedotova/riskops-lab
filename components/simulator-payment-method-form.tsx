"use client";

import { FilterSelect } from "@/components/filter-select";
import {
  buildOptionsWithCurrent,
  SimulatorFormField,
  SimulatorFormInput,
  SimulatorFormTextarea,
} from "@/components/simulator-form-primitives";
import {
  createSimulatorPaymentMethod,
  deleteSimulatorPaymentMethod,
  updateSimulatorPaymentMethod,
} from "@/lib/services/simulator-payment-methods";
import { createClient } from "@/lib/supabase";
import type {
  AppUserRow,
  CreateSimulatorPaymentMethodInput,
  PaymentMethodRow,
} from "@/lib/types";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type SimulatorPaymentMethodFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  userId: string;
  initialValue?: Partial<PaymentMethodRow> | null;
  submitLabel?: string;
  onSaved?: (paymentMethod: PaymentMethodRow) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
};

type PaymentMethodFormValues = {
  type: string;
  status: string;
  /** Last four digits only; saved as `**** **** **** XXXX`. */
  card_last_four: string;
  card_network: string;
  bank_type: string;
  account_number: string;
  wallet_type: string;
  wallet_address: string;
};

const TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank account" },
  { value: "crypto", label: "Crypto wallet" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "Select status" },
  { value: "active", label: "Active" },
  { value: "frozen", label: "Frozen" },
  { value: "blocked", label: "Blocked" },
  { value: "closed", label: "Closed" },
] as const;

const CARD_NETWORK_OPTIONS = [
  { value: "", label: "Select network" },
  { value: "Visa", label: "Visa" },
  { value: "Mastercard", label: "Mastercard" },
  { value: "American Express", label: "American Express" },
  { value: "Discover", label: "Discover" },
  { value: "UnionPay", label: "UnionPay" },
  { value: "Other", label: "Other" },
] as const;

const BANK_RAIL_OPTIONS = [
  { value: "", label: "Select rail" },
  { value: "SEPA", label: "SEPA" },
  { value: "SWIFT", label: "SWIFT" },
  { value: "Faster Payment", label: "Faster Payment" },
] as const;

function toInputValue(value: string | null | undefined): string {
  return value ?? "";
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Pull trailing digits from stored masked values like `**** **** **** 4242` or `****4242`. */
function cardLastFourFromMasked(masked: string | null | undefined): string {
  const digits = (masked ?? "").replace(/\D/g, "");
  return digits.slice(-4);
}

function formatMaskedCardFromLastFour(lastFour: string): string | null {
  const digits = lastFour.replace(/\D/g, "");
  return digits.length === 4 ? `**** **** **** ${digits}` : null;
}

function buildPaymentMethodFormValues(paymentMethod?: Partial<PaymentMethodRow> | null): PaymentMethodFormValues {
  return {
    type: toInputValue(paymentMethod?.type).toLowerCase(),
    status: toInputValue(paymentMethod?.status).toLowerCase(),
    card_last_four: cardLastFourFromMasked(paymentMethod?.masked_number),
    card_network: toInputValue(paymentMethod?.card_network),
    bank_type: toInputValue(paymentMethod?.bank_type),
    account_number: toInputValue(paymentMethod?.account_number),
    wallet_type: toInputValue(paymentMethod?.wallet_type),
    wallet_address: toInputValue(paymentMethod?.wallet_address),
  };
}

export function SimulatorPaymentMethodForm({
  viewer,
  mode,
  userId,
  initialValue,
  submitLabel,
  onSaved,
  onDeleted,
  onCancel,
}: SimulatorPaymentMethodFormProps) {
  const [values, setValues] = useState<PaymentMethodFormValues>(() => buildPaymentMethodFormValues(initialValue));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(buildPaymentMethodFormValues(initialValue));
  }, [initialValue]);

  const typeOptions = useMemo(() => buildOptionsWithCurrent(TYPE_OPTIONS, values.type), [values.type]);
  const statusOptions = useMemo(() => buildOptionsWithCurrent(STATUS_OPTIONS, values.status), [values.status]);
  const cardNetworkOptions = useMemo(
    () => buildOptionsWithCurrent(CARD_NETWORK_OPTIONS, values.card_network),
    [values.card_network]
  );
  const bankRailOptions = useMemo(
    () => buildOptionsWithCurrent(BANK_RAIL_OPTIONS, values.bank_type),
    [values.bank_type]
  );

  const handleChange = (field: keyof PaymentMethodFormValues, nextValue: string) => {
    setValues((current) => {
      const next = {
        ...current,
        [field]: nextValue,
      };

      if (field === "type") {
        if (nextValue === "card") {
          next.bank_type = "";
          next.account_number = "";
          next.wallet_type = "";
          next.wallet_address = "";
          next.card_last_four = "";
        }
        if (nextValue === "bank") {
          next.card_last_four = "";
          next.card_network = "";
          next.wallet_type = "";
          next.wallet_address = "";
        }
        if (nextValue === "crypto") {
          next.card_last_four = "";
          next.card_network = "";
          next.bank_type = "";
          next.account_number = "";
        }
      }

      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: CreateSimulatorPaymentMethodInput = {
      user_id: userId,
      type: values.type,
      masked_number: values.type === "card" ? formatMaskedCardFromLastFour(values.card_last_four) : null,
      card_network: toNullableString(values.card_network),
      status: toNullableString(values.status),
      bank_type: toNullableString(values.bank_type),
      account_number: toNullableString(values.account_number),
      wallet_type: toNullableString(values.wallet_type),
      wallet_address: toNullableString(values.wallet_address),
    };

    const supabase = createClient();
    const result =
      mode === "create"
        ? await createSimulatorPaymentMethod(supabase, viewer, payload)
        : await updateSimulatorPaymentMethod(supabase, viewer, {
            id: String(initialValue?.id ?? ""),
            ...payload,
          });

    if (result.error || !result.paymentMethod) {
      setError(result.error ?? "Could not save this payment method.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved?.(result.paymentMethod);
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !initialValue?.id) return;

    setDeleting(true);
    setError(null);

    const supabase = createClient();
    const result = await deleteSimulatorPaymentMethod(supabase, viewer, String(initialValue.id));

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
        <SimulatorFormField htmlFor="sim-payment-type" label="Method Type">
          <FilterSelect
            id="sim-payment-type"
            ariaLabel="Payment method type"
            disabled={saving || deleting}
            value={values.type}
            onChange={(nextValue) => handleChange("type", nextValue)}
            options={typeOptions}
            menuOptions={[...TYPE_OPTIONS].filter((option) => option.value !== "")}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-payment-status" label="Status">
          <FilterSelect
            id="sim-payment-status"
            ariaLabel="Payment method status"
            disabled={saving || deleting}
            value={values.status}
            onChange={(nextValue) => handleChange("status", nextValue)}
            options={statusOptions}
            menuOptions={[...STATUS_OPTIONS].filter((option) => option.value !== "")}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>

        {values.type === "card" ? (
          <>
            <SimulatorFormField htmlFor="sim-payment-network" label="Card Network">
              <FilterSelect
                id="sim-payment-network"
                ariaLabel="Card network"
                disabled={saving || deleting}
                value={values.card_network}
                onChange={(nextValue) => handleChange("card_network", nextValue)}
                options={cardNetworkOptions}
                menuOptions={[...CARD_NETWORK_OPTIONS].filter((option) => option.value !== "")}
                className="h-11 rounded-[0.95rem]"
              />
            </SimulatorFormField>
            <SimulatorFormField htmlFor="sim-payment-masked" label="Card number (last 4 digits)">
              <div
                className={`dark-input flex h-11 w-full items-center gap-2 px-4 text-sm ${
                  saving || deleting ? "opacity-60" : ""
                }`}
              >
                <span className="select-none font-mono tracking-wide text-slate-500" aria-hidden={true}>
                  **** **** ****
                </span>
                <input
                  id="sim-payment-masked"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={values.card_last_four}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                    handleChange("card_last_four", digits);
                  }}
                  placeholder="4242"
                  disabled={saving || deleting}
                  className="min-w-[4.5rem] flex-1 bg-transparent font-mono text-slate-900 outline-none focus:ring-0 disabled:cursor-not-allowed"
                  aria-label="Last four digits of card number"
                />
              </div>
            </SimulatorFormField>
          </>
        ) : null}

        {values.type === "bank" ? (
          <>
            <SimulatorFormField htmlFor="sim-payment-bank-type" label="Rail">
              <FilterSelect
                id="sim-payment-bank-type"
                value={values.bank_type}
                onChange={(nextValue) => handleChange("bank_type", nextValue)}
                options={bankRailOptions}
                menuOptions={[...BANK_RAIL_OPTIONS].filter((option) => option.value !== "")}
                ariaLabel="Bank rail"
                disabled={saving || deleting}
                className="h-11 rounded-[0.95rem]"
              />
            </SimulatorFormField>
            <SimulatorFormField htmlFor="sim-payment-account-number" label="Account Number">
              <SimulatorFormInput
                id="sim-payment-account-number"
                type="text"
                value={values.account_number}
                onChange={(event) => handleChange("account_number", event.target.value)}
                placeholder="****9012"
                disabled={saving || deleting}
              />
            </SimulatorFormField>
          </>
        ) : null}

        {values.type === "crypto" ? (
          <>
            <SimulatorFormField htmlFor="sim-payment-wallet-type" label="Wallet Type">
              <SimulatorFormInput
                id="sim-payment-wallet-type"
                type="text"
                value={values.wallet_type}
                onChange={(event) => handleChange("wallet_type", event.target.value)}
                placeholder="EVM"
                disabled={saving || deleting}
              />
            </SimulatorFormField>
            <div className="md:col-span-2">
              <SimulatorFormField htmlFor="sim-payment-wallet-address" label="Wallet Address">
                <SimulatorFormTextarea
                  id="sim-payment-wallet-address"
                  value={values.wallet_address}
                  onChange={(event) => handleChange("wallet_address", event.target.value)}
                  placeholder="0x71C...9Af3"
                  disabled={saving || deleting}
                  className="min-h-[112px]"
                />
              </SimulatorFormField>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        {error ? <p className="mr-auto text-sm font-medium text-rose-700">{error}</p> : null}
        {mode === "edit" && onDeleted ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete method"}
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
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create method" : "Save method")}
        </button>
      </div>
    </form>
  );
}
