import {
  canViewAdminPersonRow,
  createAdminOrganization,
  filterAdminPeople,
  updateAdminPersonIdentity,
} from "@/lib/services/admin-people";
import type { AdminPersonListRow, AppUserRow } from "@/lib/types";
import { describe, expect, it, vi } from "vitest";

function makeAppUser(partial: Partial<AppUserRow>): AppUserRow {
  return {
    id: partial.id ?? "app-user-1",
    auth_user_id: partial.auth_user_id ?? "auth-1",
    role: partial.role ?? "trainee",
    organization_id: partial.organization_id ?? "org-1",
    email: partial.email ?? "person@example.com",
    created_at: partial.created_at ?? "2026-04-06T00:00:00.000Z",
    full_name: partial.full_name ?? "Casey Doe",
    first_name: partial.first_name ?? "Casey",
    last_name: partial.last_name ?? "Doe",
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

function makeListRow(partial: Partial<AdminPersonListRow>): AdminPersonListRow {
  return {
    id: partial.id ?? "app-user-1",
    email: partial.email ?? "person@example.com",
    full_name: partial.full_name ?? "Casey Doe",
    role: partial.role ?? "trainee",
    organization_id: partial.organization_id ?? "org-1",
    organization_name: partial.organization_name ?? "Org One",
    is_active: partial.is_active ?? true,
    last_login_at: partial.last_login_at ?? null,
    created_at: partial.created_at ?? "2026-04-06T00:00:00.000Z",
    updated_at: partial.updated_at ?? null,
  };
}

describe("canViewAdminPersonRow", () => {
  it("lets reviewer see only trainee accounts in the same organization", () => {
    const reviewer = makeAppUser({ id: "reviewer-1", role: "reviewer", organization_id: "org-1" });

    expect(canViewAdminPersonRow(reviewer, makeAppUser({ role: "trainee", organization_id: "org-1" }))).toBe(true);
    expect(canViewAdminPersonRow(reviewer, makeAppUser({ role: "trainee", organization_id: "org-2" }))).toBe(false);
    expect(canViewAdminPersonRow(reviewer, makeAppUser({ role: "ops_admin", organization_id: "org-1" }))).toBe(false);
  });

  it("lets ops admin see only trainee accounts in the same organization", () => {
    const opsAdmin = makeAppUser({ id: "ops-1", role: "ops_admin", organization_id: "org-1" });

    expect(canViewAdminPersonRow(opsAdmin, makeAppUser({ role: "trainee", organization_id: "org-1" }))).toBe(true);
    expect(canViewAdminPersonRow(opsAdmin, makeAppUser({ role: "trainee", organization_id: "org-2" }))).toBe(false);
    expect(canViewAdminPersonRow(opsAdmin, makeAppUser({ role: "reviewer", organization_id: "org-1" }))).toBe(false);
  });

  it("lets super admin see all app users", () => {
    const superAdmin = makeAppUser({ id: "super-1", role: "super_admin", organization_id: "org-1" });

    expect(canViewAdminPersonRow(superAdmin, makeAppUser({ role: "trainee", organization_id: "org-2" }))).toBe(true);
    expect(canViewAdminPersonRow(superAdmin, makeAppUser({ role: "reviewer", organization_id: "org-3" }))).toBe(true);
  });
});

describe("filterAdminPeople", () => {
  const rows = [
    makeListRow({ id: "trainee-1", full_name: "Alice Doe", email: "alice@example.com", role: "trainee", organization_id: "org-1" }),
    makeListRow({ id: "reviewer-1", full_name: "Ben Reviewer", email: "ben@example.com", role: "reviewer", organization_id: "org-1" }),
    makeListRow({ id: "ops-1", full_name: "Cara Ops", email: "cara@example.com", role: "ops_admin", organization_id: "org-2", organization_name: "Org Two" }),
  ];

  it("matches by id, name, and email", () => {
    expect(filterAdminPeople(rows, { query: "alice", role: "all", organizationId: "all" })).toHaveLength(1);
    expect(filterAdminPeople(rows, { query: "reviewer-1", role: "all", organizationId: "all" })).toHaveLength(1);
    expect(filterAdminPeople(rows, { query: "cara@example.com", role: "all", organizationId: "all" })).toHaveLength(1);
  });

  it("applies role and organization filters together", () => {
    expect(filterAdminPeople(rows, { query: "", role: "ops_admin", organizationId: "org-2" })).toHaveLength(1);
    expect(filterAdminPeople(rows, { query: "", role: "trainee", organizationId: "org-2" })).toHaveLength(0);
  });
});

describe("updateAdminPersonIdentity", () => {
  it("blocks non-super-admin before any rpc call", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as { rpc: typeof rpc };

    const result = await updateAdminPersonIdentity(supabase as never, makeAppUser({ role: "reviewer" }), {
      targetAppUserId: "person-1",
      role: "reviewer",
      organizationId: "org-2",
    });

    expect(result.error).toBe("Only super admin can update roles or organizations.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the admin rpc for super admin", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const supabase = { rpc } as unknown as { rpc: typeof rpc };

    const result = await updateAdminPersonIdentity(supabase as never, makeAppUser({ role: "super_admin" }), {
      targetAppUserId: "person-1",
      role: "ops_admin",
      organizationId: "org-2",
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith("admin_update_app_user_identity", {
      p_target_user_id: "person-1",
      p_new_role: "ops_admin",
      p_new_organization_id: "org-2",
    });
  });
});

describe("createAdminOrganization", () => {
  it("blocks non-super-admin before any rpc call", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as { rpc: typeof rpc };

    const result = await createAdminOrganization(supabase as never, makeAppUser({ role: "reviewer" }), {
      name: "New Org",
    });

    expect(result.error).toBe("Only super admin can add organizations.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the admin rpc for super admin and returns the created organization", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          id: "org-9",
          name: "New Org",
          slug: "new-org",
          org_type: "b2b",
          status: "active",
        },
      ],
      error: null,
    }));
    const supabase = { rpc } as unknown as { rpc: typeof rpc };

    const result = await createAdminOrganization(supabase as never, makeAppUser({ role: "super_admin" }), {
      name: "New Org",
    });

    expect(result.error).toBeNull();
    expect(result.organization).toEqual({
      id: "org-9",
      name: "New Org",
      slug: "new-org",
      org_type: "b2b",
      status: "active",
    });
    expect(rpc).toHaveBeenCalledWith("admin_create_organization", {
      p_name: "New Org",
      p_org_type: "b2b",
    });
  });
});
