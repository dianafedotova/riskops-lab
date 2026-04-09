import {
  createUserAccountLink,
  updateUserAccountLink,
} from "@/lib/services/user-account-links";
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

describe("user account links", () => {
  it("rejects self-links", async () => {
    const supabase = {
      from: vi.fn(),
    };

    const result = await createUserAccountLink(supabase as never, makeViewer(), {
      user_id: "user-1",
      linked_user_id: "user-1",
      link_reason: "Shared device",
    });

    expect(result.error).toBe("Linked user must be different from the current user.");
  });

  it("creates canonicalized link pairs", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-a" }, { id: "user-b" }],
      error: null,
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "link-1",
            user_id: "user-a",
            linked_user_id: "user-b",
            link_reason: "Shared device",
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
        if (table === "user_account_links") {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createUserAccountLink(supabase as never, makeViewer(), {
      user_id: "user-b",
      linked_user_id: "user-a",
      link_reason: "Shared device",
    });

    expect(result.error).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        linked_user_id: "user-b",
        organization_id: "org-1",
        created_by_app_user_id: "staff-1",
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

    const result = await updateUserAccountLink(supabase as never, makeViewer({ organization_id: null }), {
      id: "link-1",
      user_id: "user-a",
      linked_user_id: "user-b",
      link_reason: "Shared device",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });
});
