import {
  createSimulatorUser,
  importSimulatorUsersCsv,
  parseUsersCsv,
  updateSimulatorUser,
  validateUsersCsv,
} from "@/lib/services/simulator-users";
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

describe("parseUsersCsv", () => {
  it("rejects an id header", () => {
    const result = parseUsersCsv("id,email,full_name\n1,test@example.com,Casey Doe\n");
    expect(result.errors).toContain("users.csv must not include an id column.");
  });

  it("reports missing required headers", () => {
    const result = parseUsersCsv("email\ncasey@example.com\n");
    expect(result.errors).toContain("users.csv is missing required header: full_name.");
  });
});

describe("validateUsersCsv", () => {
  it("validates and normalizes supported rows", () => {
    const result = validateUsersCsv([
      {
        email: "CASEY@example.com",
        full_name: "Casey Doe",
        country_code: "us",
        risk_level: "high",
        status: "active",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        email: "casey@example.com",
        full_name: "Casey Doe",
        country_code: "US",
        country_name: "United States of America (the)",
        risk_level: "High",
        status: "active",
      }),
    ]);
  });

  it("rejects duplicate import rows", () => {
    const result = validateUsersCsv([
      { email: "casey@example.com", full_name: "Casey Doe" },
      { email: "casey@example.com", full_name: "Casey Doe" },
    ]);

    expect(result.errors).toContain("Row 3 duplicates row 2.");
    expect(result.rows).toEqual([]);
  });

  it("surfaces invalid field values", () => {
    const result = validateUsersCsv([
      {
        email: "not-an-email",
        full_name: "",
        status: "frozen",
        annual_income_min_usd: "1000",
        annual_income_max_usd: "10",
      },
    ]);

    expect(result.errors).toEqual([
      "Row 2: Email must be valid.",
      "Row 2: Full name is required.",
      "Row 2: Status must be one of: active, not_active, restricted, blocked, closed.",
    ]);
  });

  it("accepts Tier 0 during CSV validation", () => {
    const result = validateUsersCsv([
      {
        email: "casey@example.com",
        full_name: "Casey Doe",
        tier: "Tier 0",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        email: "casey@example.com",
        full_name: "Casey Doe",
        tier: "Tier 0",
      }),
    ]);
  });
});

describe("simulator user mutations", () => {
  it("blocks non-staff create before any insert", async () => {
    const insert = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };

    const result = await createSimulatorUser(supabase as never, makeViewer({ role: "trainee" }), {
      email: "casey@example.com",
      full_name: "Casey Doe",
    });

    expect(result.error).toBe("Staff access is required.");
    expect(insert).not.toHaveBeenCalled();
  });

  it("blocks update when current organization is missing", async () => {
    const update = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        update,
      })),
    };

    const result = await updateSimulatorUser(supabase as never, makeViewer({ organization_id: null }), {
      id: "user-1",
      email: "casey@example.com",
      full_name: "Casey Doe",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });

  it("generates id and external_user_id during create", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "generated-user-id",
            email: "casey@example.com",
            full_name: "Casey Doe",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("generated-user-id");

    const result = await createSimulatorUser(supabase as never, makeViewer(), {
      email: "casey@example.com",
      full_name: "Casey Doe",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "generated-user-id",
        external_user_id: "generated-user-id",
        email: "casey@example.com",
        full_name: "Casey Doe",
        organization_id: "org-1",
      })
    );

    randomUuidSpy.mockRestore();
  });

  it("accepts Tier 4 before insert", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "generated-user-id",
            email: "casey@example.com",
            full_name: "Casey Doe",
            tier: "Tier 4",
            organization_id: "org-1",
          },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };

    const result = await createSimulatorUser(supabase as never, makeViewer(), {
      email: "casey@example.com",
      full_name: "Casey Doe",
      tier: "Tier 4",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "Tier 4",
      })
    );
  });

  it("generates ids for every imported user row", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(async () => ({
        data: [
          { id: "generated-user-1", email: "casey@example.com", full_name: "Casey Doe" },
          { id: "generated-user-2", email: "jordan@example.com", full_name: "Jordan Poe" },
        ],
        error: null,
      })),
    }));
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("generated-user-1")
      .mockReturnValueOnce("generated-user-2");

    const result = await importSimulatorUsersCsv(supabase as never, makeViewer(), [
      { email: "casey@example.com", full_name: "Casey Doe" },
      { email: "jordan@example.com", full_name: "Jordan Poe" },
    ]);

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "generated-user-1",
        external_user_id: "generated-user-1",
        email: "casey@example.com",
      }),
      expect.objectContaining({
        id: "generated-user-2",
        external_user_id: "generated-user-2",
        email: "jordan@example.com",
      }),
    ]);

    randomUuidSpy.mockRestore();
  });
});
