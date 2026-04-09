import { createSimulatorTransaction, updateSimulatorTransaction } from "@/lib/services/simulator-transactions";
import type { AppUserRow } from "@/lib/types";
import { describe, expect, it, vi } from "vitest";

function makeViewer(partial: Partial<AppUserRow> = {}): AppUserRow {
  return {
    id: partial.id ?? "staff-1",
    auth_user_id: partial.auth_user_id ?? "auth-1",
    role: partial.role ?? "reviewer",
    organization_id: Object.prototype.hasOwnProperty.call(partial, "organization_id")
      ? (partial.organization_id ?? null)
      : "org-1",
    email: partial.email ?? "staff@example.com",
    created_at: partial.created_at ?? "2026-04-07T00:00:00.000Z",
    full_name: partial.full_name ?? "Staff User",
    first_name: partial.first_name ?? null,
    last_name: partial.last_name ?? null,
    country_code: partial.country_code ?? null,
    country_name: partial.country_name ?? null,
    avatar_url: partial.avatar_url ?? null,
    provider: partial.provider ?? null,
    status: partial.status ?? null,
    is_active: partial.is_active ?? true,
    last_login_at: partial.last_login_at ?? null,
    updated_at: partial.updated_at ?? null,
  };
}

describe("simulator transactions", () => {
  it("blocks non-staff create before any insert", async () => {
    const insert = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer({ role: "trainee" }), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "inbound",
      type: "Card payment",
      status: "completed",
      amount: "120.00",
      currency: "USD",
    });

    expect(result.error).toBe("Staff access is required.");
    expect(insert).not.toHaveBeenCalled();
  });

  it("validates required transaction fields", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "",
      transaction_date: "not-a-date",
      direction: "sideways",
      type: "",
      status: "",
      amount: "",
      currency: "",
    });

    expect(result.error).toBe(
      "User is required. Transaction date must be a valid date/time. Type is required. Direction must be one of: inbound, outbound. Status is required. Currency is required. Amount is required."
    );
  });

  it("creates a refund card payment with computed USD amount and generated description", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "tx-1",
            external_id: "tx-1",
            user_id: "user-1",
            transaction_date: "2026-04-07T10:30:00.000Z",
            direction: "inbound",
            type: "Card payment",
            channel: "Refund",
            display_name: "Refund from Zara",
            card_masked: "*1122",
            merchant_name: "Zara",
            mcc: "5651",
            status: "completed",
            amount: 10,
            amount_usd: 11.6,
            currency: "EUR",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "transactions") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("tx-1");

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "inbound",
      type: "Card payment",
      channel: "POS",
      card_masked: "**** **** **** 1122",
      merchant_name: "Zara",
      mcc: "5651",
      status: "completed",
      amount: "10",
      amount_usd: "999.99",
      currency: "EUR",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tx-1",
        external_id: "tx-1",
        user_id: "user-1",
        organization_id: "org-1",
        direction: "inbound",
        channel: "Refund",
        display_name: "Refund from Zara",
        card_masked: "*1122",
        amount: 10,
        amount_usd: 11.6,
        currency: "EUR",
      })
    );

    randomUuidSpy.mockRestore();
  });

  it("keeps outbound card payments outbound even if refund was passed as a stale channel", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "tx-4",
            external_id: "tx-4",
            user_id: "user-1",
            transaction_date: "2026-04-07T10:30:00.000Z",
            direction: "outbound",
            type: "Card payment",
            channel: "ePOS",
            display_name: "Amazon",
            card_masked: "*1122",
            merchant_name: "Amazon",
            mcc: "5411",
            status: "completed",
            amount: 10,
            amount_usd: 10,
            currency: "USD",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "transactions") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("tx-4");

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Card payment",
      channel: "Refund",
      card_masked: "*1122",
      merchant_name: "Amazon",
      mcc: "5411",
      status: "completed",
      amount: "10",
      currency: "USD",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "outbound",
        channel: "ePOS",
        display_name: "Amazon",
      })
    );

    randomUuidSpy.mockRestore();
  });

  it("requires reject reason when status is rejected", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "inbound",
      type: "Card top-up",
      channel: "ePOS",
      funding_card_masked: "*3344",
      status: "rejected",
      amount: "25",
      currency: "USD",
    });

    expect(result.error).toBe("Reject reason is required when status is rejected.");
  });

  it("restricts bank transfer currencies by rail", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const sepaResult = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Bank transfer",
      channel: "SEPA",
      rail: "SEPA",
      counterparty_name: "Alice GmbH",
      iban_masked: "DE89••••••••••••3704",
      status: "completed",
      status_code: "ACSC",
      amount: "25",
      currency: "USD",
    });

    expect(sepaResult.error).toBe("Currency must be one of: EUR.");

    const fpsResult = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Bank transfer",
      channel: "FPS",
      rail: "FPS",
      counterparty_name: "Bob Ltd",
      status: "completed",
      status_code: "ACSC",
      amount: "25",
      currency: "EUR",
    });

    expect(fpsResult.error).toBe("Currency must be one of: GBP.");
  });

  it("creates rejected bank transfers with ISO status and reason fields", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "tx-bank-rjct",
            external_id: "tx-bank-rjct",
            user_id: "user-1",
            transaction_date: "2026-04-07T10:30:00.000Z",
            direction: "outbound",
            type: "Bank transfer",
            channel: "SWIFT",
            rail: "SWIFT",
            display_name: "Maya Chen",
            counterparty_name: "Maya Chen",
            status_code: "RJCT",
            reason_code: "AC01",
            status_display: "Rejected",
            reason_display: "Invalid account details",
            reject_reason: null,
            status: "rejected",
            amount: 25,
            amount_usd: 25,
            currency: "USD",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "transactions") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Bank transfer",
      channel: "SWIFT",
      rail: "SWIFT",
      counterparty_name: "Maya Chen",
      status: "rejected",
      status_code: "RJCT",
      reason_code: "AC01",
      amount: "25",
      currency: "USD",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: "RJCT",
        reason_code: "AC01",
        status_display: "Rejected",
        reason_display: "Invalid account details",
        reject_reason: null,
        status: "rejected",
      })
    );
  });

  it("requires an ISO reason code for rejected bank transfers", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Bank transfer",
      channel: "SEPA",
      rail: "SEPA",
      counterparty_name: "Alice GmbH",
      status: "rejected",
      status_code: "RJCT",
      amount: "25",
      currency: "EUR",
    });

    expect(result.error).toBe("Bank transfer reason is required when the transfer status is rejected.");
  });

  it("blocks ISO bank-transfer fields on non-bank transactions", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Crypto transfer",
      wallet_masked: "0x71C...9Af3",
      status: "completed",
      status_code: "ACSC",
      amount: "25",
      currency: "USDC",
    });

    expect(result.error).toBe("ISO bank transfer status fields can only be used for bank transfers.");
  });

  it("persists optional bank transfer payment reference", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "tx-bank-1",
            external_id: "tx-bank-1",
            user_id: "user-1",
            transaction_date: "2026-04-07T10:30:00.000Z",
            direction: "outbound",
            type: "Bank transfer",
            channel: "SWIFT",
            rail: "SWIFT",
            display_name: "Alice GmbH",
            counterparty_name: "Alice GmbH",
            payment_reference: "Invoice 1042",
            status: "completed",
            amount: 25,
            amount_usd: 25,
            currency: "USD",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "transactions") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "Bank transfer",
      channel: "SWIFT",
      rail: "SWIFT",
      counterparty_name: "Alice GmbH",
      payment_reference: "Invoice 1042",
      status: "completed",
      status_code: "ACSC",
      amount: "25",
      currency: "USD",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_reference: "Invoice 1042",
      })
    );
  });

  it("creates a card top-up using only the funding card snapshot", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "tx-3",
            external_id: "tx-3",
            user_id: "user-1",
            transaction_date: "2026-04-07T10:30:00.000Z",
            direction: "inbound",
            type: "Card top-up",
            channel: "ePOS",
            display_name: "*3344",
            card_masked: null,
            funding_card_masked: "*3344",
            status: "completed",
            amount: 25,
            amount_usd: 25,
            currency: "USD",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "transactions") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("tx-3");

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "inbound",
      type: "Card top-up",
      channel: "ePOS",
      card_masked: "*1122",
      funding_card_masked: "**** **** **** 3344",
      status: "completed",
      amount: "25",
      currency: "USD",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        card_masked: null,
        funding_card_masked: "*3344",
        display_name: "*3344",
        channel: "ePOS",
      })
    );

    randomUuidSpy.mockRestore();
  });

  it("resolves P2P counterparty snapshot from the user table", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }, { id: "user-2" }],
      error: null,
    }));
    const usersMaybeSingle = vi.fn(async () => ({
      data: {
        id: "user-2",
        full_name: "Jane Doe",
        email: "jane@example.com",
      },
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "tx-2",
            external_id: "tx-2",
            user_id: "user-1",
            transaction_date: "2026-04-07T10:30:00.000Z",
            direction: "outbound",
            type: "P2P transfer",
            channel: "P2P",
            display_name: "Jane Doe",
            counterparty_user_id: "user-2",
            counterparty_name: "Jane Doe",
            status: "pending",
            amount: 50,
            amount_usd: 50,
            currency: "USD",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn((query: string) => {
              if (query === "id") {
                return { in: usersIn };
              }
              return {
                eq: vi.fn(() => ({
                  maybeSingle: usersMaybeSingle,
                })),
              };
            }),
          };
        }
        if (table === "transactions") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("tx-2");

    const result = await createSimulatorTransaction(supabase as never, makeViewer(), {
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "outbound",
      type: "P2P transfer",
      counterparty_user_id: "user-2",
      status: "pending",
      amount: "50",
      currency: "USD",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "P2P",
        counterparty_user_id: "user-2",
        counterparty_name: "Jane Doe",
        display_name: "Jane Doe",
      })
    );

    randomUuidSpy.mockRestore();
  });

  it("blocks update when organization is missing", async () => {
    const update = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        update,
      })),
    };

    const result = await updateSimulatorTransaction(supabase as never, makeViewer({ organization_id: null }), {
      id: "tx-1",
      user_id: "user-1",
      transaction_date: "2026-04-07T10:30",
      direction: "inbound",
      type: "Card payment",
      status: "completed",
      amount: "10",
      currency: "USD",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });
});
