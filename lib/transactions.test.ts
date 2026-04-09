import {
  calculateAmountUsd,
  formatMaskedCardReference,
  getTransactionChronologyConflictIds,
  normalizeTransactionCurrencyForType,
  getTransactionDescription,
} from "@/lib/transactions";
import { describe, expect, it } from "vitest";

describe("transactions helpers", () => {
  it("calculates USD values with hardcoded FX rates and rounds to cents", () => {
    expect(calculateAmountUsd(10, "USD")).toBe(10);
    expect(calculateAmountUsd(10, "EUR")).toBe(11.6);
    expect(calculateAmountUsd(10, "GBP")).toBe(13.5);
    expect(calculateAmountUsd(10, "USDC")).toBe(10);
    expect(calculateAmountUsd(0.000014, "BTC")).toBe(1);
    expect(calculateAmountUsd(0.00046, "ETH")).toBe(1);
    expect(calculateAmountUsd(10.015, "USD")).toBe(10.02);
  });

  it("normalizes transaction currency by transaction type", () => {
    expect(normalizeTransactionCurrencyForType("Crypto transfer", "BTC")).toBe("BTC");
    expect(normalizeTransactionCurrencyForType("Crypto transfer", "USD")).toBe("USDC");
    expect(normalizeTransactionCurrencyForType("Card payment", "BTC")).toBe("USD");
    expect(normalizeTransactionCurrencyForType("Card payment", "EUR")).toBe("EUR");
  });

  it("formats all card references as *last4", () => {
    expect(formatMaskedCardReference("**** **** **** 4242")).toBe("*4242");
    expect(formatMaskedCardReference("*1122")).toBe("*1122");
    expect(formatMaskedCardReference("4242")).toBe("*4242");
  });

  it("builds transaction descriptions from type-specific fields", () => {
    expect(
      getTransactionDescription({
        type: "Card payment",
        direction: "outbound",
        merchant_name: "Amazon",
      })
    ).toBe("Amazon");

    expect(
      getTransactionDescription({
        type: "Card payment",
        direction: "inbound",
        merchant_name: "Zara",
      })
    ).toBe("Refund from Zara");

    expect(
      getTransactionDescription({
        type: "Card top-up",
        funding_card_masked: "**** **** **** 4572",
      })
    ).toBe("*4572");

    expect(
      getTransactionDescription({
        type: "Crypto transfer",
        direction: "outbound",
      })
    ).toBe("Crypto withdrawal");
  });

  it("flags rows that are placed too early compared with newer rows below", () => {
    expect(
      getTransactionChronologyConflictIds([
        { id: "tx-1", transaction_date: "2026-05-10T00:00:00.000Z" },
        { id: "tx-2", transaction_date: "2026-05-09T00:00:00.000Z" },
        { id: "tx-3", transaction_date: "2026-05-12T00:00:00.000Z" },
        { id: "tx-4", transaction_date: "2026-05-03T00:00:00.000Z" },
      ])
    ).toEqual(["tx-1", "tx-2"]);
  });
});
