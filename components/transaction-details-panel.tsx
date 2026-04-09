"use client";

import { formatDate, formatTransactionAmount, formatTransactionAmountUsd } from "@/lib/format";
import {
  formatMaskedCardReference,
  getTransactionDescriptionFromRow,
  getTransactionDetailFields,
  getTransactionRejectReasonLabel,
  getTransactionStatusDisplay,
  TRANSACTION_DETAIL_LABELS,
} from "@/lib/transactions";
import type { TransactionDetailFieldKey } from "@/lib/transactions";
import type { TransactionRow } from "@/lib/types";
import Link from "next/link";

type TransactionDetailsPanelProps = {
  transaction: TransactionRow;
};

function hasDetailValue(transaction: TransactionRow, field: TransactionDetailFieldKey): boolean {
  switch (field) {
    case "card_masked":
    case "funding_card_masked":
    case "counterparty_card_masked":
      return Boolean(formatMaskedCardReference(transaction[field]));
    case "counterparty_user_id":
      return Boolean(transaction.counterparty_user_id?.trim());
    case "reject_reason":
      return Boolean(getTransactionRejectReasonLabel(transaction.reject_reason));
    case "reason_display":
      return Boolean(transaction.reason_display?.trim());
    default: {
      const value = transaction[field];
      return typeof value === "string" ? value.trim() !== "" : value != null;
    }
  }
}

function renderDetailValue(transaction: TransactionRow, field: TransactionDetailFieldKey) {
  switch (field) {
    case "card_masked":
      return formatMaskedCardReference(transaction.card_masked) ?? "—";
    case "funding_card_masked":
      return formatMaskedCardReference(transaction.funding_card_masked) ?? "—";
    case "counterparty_card_masked":
      return formatMaskedCardReference(transaction.counterparty_card_masked) ?? "—";
    case "counterparty_user_id":
      return transaction.counterparty_user_id ? (
        <Link href={`/users/${transaction.counterparty_user_id}`} className="font-mono text-[var(--brand-700)] hover:underline">
          {transaction.counterparty_user_id}
        </Link>
      ) : (
        "—"
      );
    case "reject_reason":
      return getTransactionRejectReasonLabel(transaction.reject_reason) ?? "—";
    case "reason_display":
      return transaction.reason_display ?? "—";
    default:
      return (transaction[field] as string | null | undefined) ?? "—";
  }
}

export function TransactionDetailsPanel({ transaction }: TransactionDetailsPanelProps) {
  const description = getTransactionDescriptionFromRow(transaction) ?? "—";
  const detailFields = getTransactionDetailFields(transaction.type, transaction.status).filter((field) =>
    hasDetailValue(transaction, field)
  );
  const direction = (transaction.direction ?? "").trim().toLowerCase();
  const rejected = (transaction.status ?? "").trim().toLowerCase() === "rejected";
  const statusDisplay = getTransactionStatusDisplay(transaction) ?? "—";
  const amountClass = rejected
    ? "text-slate-700"
    : direction === "inbound"
      ? "text-emerald-600"
      : direction === "outbound"
        ? "text-rose-600"
        : "text-slate-900";

  return (
    <div className="space-y-2.5 rounded-[0.85rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(245,248,251,0.98))] px-2.5 py-2.5">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</p>
          <p className="mt-0.5 text-[13px] font-medium text-slate-900">{formatDate(transaction.transaction_date)}</p>
        </div>
        <div className="rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Amount</p>
          <p className={`mt-0.5 text-[13px] font-medium ${amountClass}`}>
            {transaction.amount_usd != null
              ? `${formatTransactionAmount(transaction.amount, transaction.currency, transaction.direction, transaction.status)} (${formatTransactionAmountUsd(transaction.amount_usd, transaction.direction, transaction.status, { withSign: false })})`
              : formatTransactionAmount(transaction.amount, transaction.currency, transaction.direction, transaction.status)}
          </p>
        </div>
        <div className="rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Direction</p>
          <p className="mt-0.5 text-[13px] font-medium capitalize text-slate-900">{transaction.direction ?? "—"}</p>
        </div>
        <div className="rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
          <p className="mt-0.5 text-[13px] font-medium text-slate-900">{statusDisplay}</p>
        </div>
        <div className="rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Channel</p>
          <p className="mt-0.5 text-[13px] font-medium text-slate-900">{transaction.channel ?? "—"}</p>
        </div>
        <div className="rounded-[0.8rem] border border-slate-200/80 bg-white/90 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Description</p>
          <p className="mt-0.5 text-[13px] font-medium text-slate-900">
            {transaction.type === "P2P transfer" && transaction.counterparty_user_id ? (
              <Link href={`/users/${transaction.counterparty_user_id}`} className="text-[var(--brand-700)] hover:underline">
                {description}
              </Link>
            ) : (
              description
            )}
          </p>
        </div>
      </div>

      {detailFields.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {detailFields.map((field) => (
            <div key={field} className="rounded-[0.8rem] border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {TRANSACTION_DETAIL_LABELS[field]}
              </p>
              <div className="mt-0.5 break-words text-[13px] font-medium text-slate-900">{renderDetailValue(transaction, field)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
