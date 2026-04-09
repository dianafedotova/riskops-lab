import {
  createInternalNote,
  updateInternalNote,
} from "@/lib/services/internal-notes";
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

describe("internal notes", () => {
  it("blocks non-staff note creation", async () => {
    const insert = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    };

    const result = await createInternalNote(supabase as never, makeViewer({ role: "trainee" }), {
      user_id: "user-1",
      note_text: "Check SOF docs",
      created_at: "2026-04-07",
    });

    expect(result.error).toBe("Staff access is required.");
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates a rich internal note payload", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const selectNote = vi.fn(async () => ({
      data: {
        id: "note-1",
        user_id: "user-1",
        note_text: "Check SOF docs",
        created_at: "2026-04-07T12:00:00.000Z",
        created_by: "analyst@riskopslab.com",
        updated_at: "2026-04-07T12:00:00.000Z",
        updated_by: "analyst@riskopslab.com",
      },
      error: null,
    }));
    const notesQuery = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              id: "note-1",
              user_id: "user-1",
              note_text: "Check SOF docs",
              created_at: "2026-04-07T12:00:00.000Z",
              created_by: "analyst@riskopslab.com",
              updated_at: "2026-04-07T12:00:00.000Z",
              updated_by: "analyst@riskopslab.com",
            },
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: selectNote,
        })),
      })),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "internal_notes") {
          return notesQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createInternalNote(supabase as never, makeViewer(), {
      user_id: "user-1",
      note_text: "Check SOF docs",
      created_at: "2026-04-07",
    });

    expect(result.error).toBeNull();
    expect(notesQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        note_text: "Check SOF docs",
        created_at: "2026-04-07T00:00:00.000Z",
        created_by: "analyst@riskopslab.com",
        updated_by: "analyst@riskopslab.com",
      })
    );
  });

  it("creates a note with support agent signature when requested", async () => {
    const usersIn = vi.fn(async () => ({
      data: [{ id: "user-1" }],
      error: null,
    }));
    const selectNote = vi.fn(async () => ({
      data: {
        id: "note-2",
        user_id: "user-1",
        note_text: "Hi",
        created_at: "2026-04-07T12:00:00.000Z",
        created_by: "supportagent@riskopslab.com",
        updated_at: "2026-04-07T12:00:00.000Z",
        updated_by: "supportagent@riskopslab.com",
      },
      error: null,
    }));
    const notesQuery = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              id: "note-2",
              user_id: "user-1",
              note_text: "Hi",
              created_at: "2026-04-07T12:00:00.000Z",
              created_by: "supportagent@riskopslab.com",
              updated_at: "2026-04-07T12:00:00.000Z",
              updated_by: "supportagent@riskopslab.com",
            },
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: selectNote,
        })),
      })),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => ({
              in: usersIn,
            })),
          };
        }
        if (table === "internal_notes") {
          return notesQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await createInternalNote(supabase as never, makeViewer(), {
      user_id: "user-1",
      note_text: "Hi",
      created_at: "2026-04-07",
      signature: "supportagent@riskopslab.com",
    });

    expect(result.error).toBeNull();
    expect(notesQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: "supportagent@riskopslab.com",
        updated_by: "supportagent@riskopslab.com",
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

    const result = await updateInternalNote(supabase as never, makeViewer({ organization_id: null }), {
      id: "note-1",
      user_id: "user-1",
      note_text: "Check SOF docs",
      created_at: "2026-04-07",
    });

    expect(result.error).toBe("Current staff organization is missing.");
    expect(update).not.toHaveBeenCalled();
  });
});
