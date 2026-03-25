import { describe, expect, it } from "vitest";
import { normalizeFinancialsRow } from "./user-financials";

describe("normalizeFinancialsRow", () => {
  it("returns null for non-objects", () => {
    expect(normalizeFinancialsRow(null)).toBeNull();
    expect(normalizeFinancialsRow(undefined)).toBeNull();
    expect(normalizeFinancialsRow("x")).toBeNull();
  });

  it("maps canonical user_financials columns", () => {
    expect(
      normalizeFinancialsRow({
        user_id: "u-1",
        current_balance: 100,
        total_turnover: 200,
      })
    ).toEqual({
      user_id: "u-1",
      current_balance: 100,
      total_turnover: 200,
    });
  });

  it("accepts legacy balance / turnover column names", () => {
    expect(
      normalizeFinancialsRow({
        user_id: "u-2",
        balance_usd: 50,
        turnover_usd: 999,
      })
    ).toEqual({
      user_id: "u-2",
      current_balance: 50,
      total_turnover: 999,
    });
  });

  it("uses placeholder user_id when amounts exist but id missing", () => {
    expect(
      normalizeFinancialsRow({
        current_balance: 1,
        total_turnover: 2,
      })
    ).toEqual({
      user_id: "—",
      current_balance: 1,
      total_turnover: 2,
    });
  });
});
