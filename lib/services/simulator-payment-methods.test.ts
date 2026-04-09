import {
  createSimulatorPaymentMethod,
  deleteSimulatorPaymentMethod,
  updateSimulatorPaymentMethod,
} from "@/lib/services/simulator-payment-methods";
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

describe("simulator payment methods", () => {
  it("rejects invalid payment method rows before insert", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorPaymentMethod(supabase as never, makeViewer(), {
      user_id: "",
      type: "loan",
    });

    expect(result.error).toBe(
      "User is required. Payment method type must be one of: card, bank, crypto."
    );
  });

  it("requires masked number for card methods", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorPaymentMethod(supabase as never, makeViewer(), {
      user_id: "user-1",
      type: "card",
      card_network: "Visa",
    });

    expect(result.error).toBe("Masked number is required for card methods.");
  });

  it("creates a card payment method", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "pm-1",
            user_id: "user-1",
            type: "card",
            masked_number: "****4242",
            card_network: "Visa",
            status: "active",
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
        if (table === "user_payment_methods") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createSimulatorPaymentMethod(supabase as never, makeViewer(), {
      user_id: "user-1",
      type: "card",
      masked_number: "****4242",
      card_network: "Visa",
      status: "active",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "card",
        masked_number: "****4242",
        card_network: "Visa",
      })
    );
  });

  it("blocks update when organization is missing", async () => {
    const update = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        update,
      })),
    };

    const result = await updateSimulatorPaymentMethod(supabase as never, makeViewer({ organization_id: null }), {
      id: "pm-1",
      user_id: "user-1",
      type: "bank",
      account_number: "****9012",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });

  it("deletes a payment method for staff viewers", async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const deleteFn = vi.fn(() => ({
      eq,
    }));
    const supabase = {
      from: vi.fn(() => ({
        delete: deleteFn,
      })),
    };

    const result = await deleteSimulatorPaymentMethod(supabase as never, makeViewer(), "pm-1");

    expect(result.error).toBeNull();
    expect(deleteFn).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "pm-1");
  });
});
