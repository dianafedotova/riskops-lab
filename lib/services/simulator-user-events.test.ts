import {
  createSimulatorUserEvent,
  updateSimulatorUserEvent,
} from "@/lib/services/simulator-user-events";
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

describe("simulator user events", () => {
  it("rejects invalid event rows before insert", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createSimulatorUserEvent(supabase as never, makeViewer(), {
      user_id: "",
      event_time: "not-a-date",
      event_type: "login",
      ip_address: "abc",
    });

    expect(result.error).toBe(
      "User is required. Event time must be a valid date/time. Event type must be one of: sign_up, sign_in, open_app, logout, password_reset, added_sof, added_poa, added_poi, changed_phone, changed_email, changed_address, changed_password, changed_device. IP address must be a valid IPv4 or IPv6 value."
    );
  });

  it("creates a staff activity event", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "evt-1",
            user_id: "user-1",
            event_time: "2026-04-07T12:00:00.000Z",
            event_type: "sign_in",
            device_id: "dev-a1",
            ip_address: "185.32.1.44",
            country_code: "GB",
            device_name: "Windows Chrome",
            created_at: "2026-04-07T12:00:00.000Z",
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
        if (table === "user_events") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createSimulatorUserEvent(supabase as never, makeViewer(), {
      user_id: "user-1",
      event_time: "2026-04-07T12:00",
      event_type: "sign_in",
      device_id: "dev-a1",
      ip_address: "185.32.1.44",
      country_code: "gb",
      device_name: "Windows Chrome",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "sign_in",
        country_code: "GB",
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

    const result = await updateSimulatorUserEvent(supabase as never, makeViewer({ organization_id: null }), {
      id: "evt-1",
      user_id: "user-1",
      event_time: "2026-04-07T12:00",
      event_type: "sign_in",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });
});
