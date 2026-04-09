import {
  createSimulatorAlert,
  parseAlertsCsv,
  updateSimulatorAlert,
  validateAlertsCsv,
} from "@/lib/services/simulator-alerts";
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

function makeUserLookupSupabase(ids: string[]) {
  const inFilter = vi.fn(async () => ({
    data: ids.map((id) => ({ id })),
    error: null,
  }));
  const select = vi.fn(() => ({
    in: inFilter,
  }));
  return {
    from: vi.fn(() => ({
      select,
    })),
  };
}

describe("parseAlertsCsv", () => {
  it("rejects an id header", () => {
    const result = parseAlertsCsv("id,user_id,alert_type,severity,status\n1,user-1,fraud,high,open\n");
    expect(result.errors).toContain("alerts.csv must not include an id column.");
  });

  it("reports missing required headers", () => {
    const result = parseAlertsCsv("user_id,alert_type,severity\nuser-1,fraud,high\n");
    expect(result.errors).toContain("alerts.csv is missing required header: status.");
  });
});

describe("validateAlertsCsv", () => {
  it("validates and normalizes supported rows", async () => {
    const supabase = makeUserLookupSupabase(["user-1"]);

    const result = await validateAlertsCsv(supabase as never, makeViewer(), [
      {
        user_id: "user-1",
        alert_type: "Fraud",
        severity: "HIGH",
        status: "OPEN",
        rule_code: "FRD_001",
        created_at: "2026-04-07T12:30:00Z",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        user_id: "user-1",
        alert_type: "Fraud",
        severity: "high",
        status: "open",
        created_at: "2026-04-07T12:30:00.000Z",
      }),
    ]);
  });

  it("normalizes alert_date as a date without time", async () => {
    const supabase = makeUserLookupSupabase(["user-1"]);

    const result = await validateAlertsCsv(supabase as never, makeViewer(), [
      {
        user_id: "user-1",
        alert_type: "Fraud",
        severity: "HIGH",
        status: "OPEN",
        rule_code: "FRD_001",
        alert_date: "2026-04-07",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        alert_date: "2026-04-07",
      }),
    ]);
  });

  it("rejects duplicate import rows", async () => {
    const supabase = makeUserLookupSupabase(["user-1"]);

    const result = await validateAlertsCsv(supabase as never, makeViewer(), [
      { user_id: "user-1", alert_type: "fraud", severity: "high", status: "open", rule_code: "FRD_001" },
      { user_id: "user-1", alert_type: "fraud", severity: "high", status: "open", rule_code: "FRD_001" },
    ]);

    expect(result.errors).toContain("Row 3 duplicates row 2.");
    expect(result.rows).toEqual([]);
  });

  it("surfaces invalid field values", async () => {
    const supabase = makeUserLookupSupabase([]);

    const result = await validateAlertsCsv(supabase as never, makeViewer(), [
      {
        user_id: "",
        alert_type: "",
        severity: "urgent",
        status: "queued",
        rule_code: "",
        created_at: "not-a-date",
      },
    ]);

    expect(result.errors).toEqual([
      "Row 2: User is required.",
      "Row 2: Alert type is required.",
      "Row 2: Severity must be one of: low, medium, high.",
      "Row 2: Status must be one of: open, monitoring, escalated, closed.",
      "Row 2: Rule code is required.",
      "Row 2: Created at must be a valid date/time.",
    ]);
  });

  it("rejects unknown user ids", async () => {
    const supabase = makeUserLookupSupabase(["user-1"]);

    const result = await validateAlertsCsv(supabase as never, makeViewer(), [
      { user_id: "missing-user", alert_type: "fraud", severity: "high", status: "open", rule_code: "FRD_001" },
    ]);

    expect(result.errors).toContain(
      "User missing-user was not found or is outside your visible organization scope."
    );
    expect(result.rows).toEqual([]);
  });
});

describe("simulator alert mutations", () => {
  it("blocks non-staff create before any insert", async () => {
    const insert = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };

    const result = await createSimulatorAlert(supabase as never, makeViewer({ role: "trainee" }), {
      user_id: "user-1",
      alert_type: "fraud",
      severity: "high",
      status: "open",
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

    const result = await updateSimulatorAlert(supabase as never, makeViewer({ organization_id: null }), {
      id: "alert-1",
      user_id: "user-1",
      alert_type: "fraud",
      severity: "high",
      status: "open",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });
});
