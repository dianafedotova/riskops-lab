import { isSuperAdmin, type AppUserRole } from "@/lib/app-user-role";
import type {
  AdminPersonListRow,
  AdminStaffProfileRow,
  AdminTraineeProfileRow,
  AppUserRow,
  OrganizationRow,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const APP_USER_ADMIN_SELECT =
  "id, auth_user_id, role, organization_id, email, created_at, full_name, first_name, last_name, country_code, country_name, avatar_url, provider, status, is_active, last_login_at, updated_at" as const;
const ORGANIZATION_SELECT = "id, name, slug, org_type, status" as const;
const ADMIN_PEOPLE_LIMIT = 2000;

type AdminPeopleViewer = Pick<AppUserRow, "id" | "role" | "organization_id">;

function normalizeAppUserRow(row: AppUserRow & { role: AppUserRole }): AppUserRow {
  return {
    ...row,
    id: String(row.id),
    auth_user_id: String(row.auth_user_id),
    organization_id: row.organization_id ? String(row.organization_id) : null,
    email: row.email?.trim() || null,
    full_name: row.full_name?.trim() || null,
    first_name: row.first_name?.trim() || null,
    last_name: row.last_name?.trim() || null,
    country_code: row.country_code?.trim() || null,
    country_name: row.country_name?.trim() || null,
    avatar_url: row.avatar_url?.trim() || null,
    provider: row.provider?.trim() || null,
    status: row.status?.trim() || null,
    last_login_at: row.last_login_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function normalizeNeedle(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function mapOrganizationRow(row: OrganizationRow): OrganizationRow {
  return {
    ...row,
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    org_type: String(row.org_type),
    status: String(row.status),
  };
}

function buildOrganizationSlugBase(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "organization";
}

export function canViewAdminPersonRow(viewer: AdminPeopleViewer, row: AppUserRow): boolean {
  if (isSuperAdmin(viewer.role)) return true;
  return Boolean(viewer.organization_id && row.organization_id === viewer.organization_id && row.role === "trainee");
}

async function loadOrganizationMap(
  supabase: SupabaseClient,
  organizationIds: string[]
): Promise<Map<string, OrganizationRow>> {
  if (organizationIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("organizations")
    .select(ORGANIZATION_SELECT)
    .in("id", organizationIds);

  if (error) {
    return new Map();
  }

  return new Map(
    (((data as OrganizationRow[] | null) ?? []).map((row) => [
      String(row.id),
      {
        ...row,
        id: String(row.id),
        name: row.name,
        slug: row.slug,
        org_type: row.org_type,
        status: row.status,
      },
    ]) as Array<[string, OrganizationRow]>)
  );
}

export function filterAdminPeople(
  rows: AdminPersonListRow[],
  filters: {
    query: string;
    role: AppUserRole | "all";
    organizationId: string | "all";
  }
): AdminPersonListRow[] {
  const query = normalizeNeedle(filters.query);

  return rows.filter((row) => {
    if (filters.role !== "all" && row.role !== filters.role) return false;
    if (filters.organizationId !== "all" && row.organization_id !== filters.organizationId) return false;
    if (!query) return true;

    const haystack = [
      row.id,
      row.email ?? "",
      row.full_name ?? "",
      row.organization_name ?? "",
      row.role,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export async function listAdminPeople(
  supabase: SupabaseClient,
  viewer: AdminPeopleViewer | null
): Promise<{ rows: AdminPersonListRow[]; organizations: OrganizationRow[]; error: string | null }> {
  if (!viewer?.role || (viewer.role !== "reviewer" && viewer.role !== "ops_admin" && viewer.role !== "super_admin")) {
    return { rows: [], organizations: [], error: "Admin access is required." };
  }

  let query = supabase
    .from("app_users")
    .select(APP_USER_ADMIN_SELECT)
    .order("created_at", { ascending: false })
    .limit(ADMIN_PEOPLE_LIMIT);

  if (!isSuperAdmin(viewer.role)) {
    if (!viewer.organization_id) {
      return { rows: [], organizations: [], error: "Current staff organization is missing." };
    }
    query = query.eq("organization_id", viewer.organization_id).eq("role", "trainee");
  }

  const { data, error } = await query;
  if (error) {
    return { rows: [], organizations: [], error: error.message };
  }

  const visibleRows = (((data as AppUserRow[] | null) ?? [])
    .map((row) => normalizeAppUserRow(row as AppUserRow & { role: AppUserRole }))
    .filter((row) => canViewAdminPersonRow(viewer, row))) as AppUserRow[];
  const organizationIds = Array.from(new Set(visibleRows.map((row) => row.organization_id).filter(Boolean))) as string[];
  const organizationMap = await loadOrganizationMap(supabase, organizationIds);
  const organizations = Array.from(organizationMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    rows: visibleRows.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      organization_id: row.organization_id,
      organization_name: row.organization_id ? organizationMap.get(row.organization_id)?.name ?? null : null,
      is_active: row.is_active ?? null,
      last_login_at: row.last_login_at ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    })),
    organizations,
    error: null,
  };
}

export async function listAdminOrganizations(
  supabase: SupabaseClient,
  viewer: AdminPeopleViewer | null
): Promise<{ organizations: OrganizationRow[]; error: string | null }> {
  if (!viewer?.role || !isSuperAdmin(viewer.role)) {
    return { organizations: [], error: null };
  }

  const { data, error } = await supabase
    .from("organizations")
    .select(ORGANIZATION_SELECT)
    .order("name", { ascending: true });

  if (error) {
    return { organizations: [], error: error.message };
  }

  return {
    organizations: ((data as OrganizationRow[] | null) ?? []).map(mapOrganizationRow),
    error: null,
  };
}

export async function getAdminPersonProfile(
  supabase: SupabaseClient,
  viewer: AdminPeopleViewer | null,
  targetAppUserId: string
): Promise<{
  profile: AdminTraineeProfileRow | AdminStaffProfileRow | null;
  organization: OrganizationRow | null;
  error: string | null;
}> {
  if (!viewer?.role || (viewer.role !== "reviewer" && viewer.role !== "ops_admin" && viewer.role !== "super_admin")) {
    return { profile: null, organization: null, error: "Admin access is required." };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select(APP_USER_ADMIN_SELECT)
    .eq("id", targetAppUserId)
    .maybeSingle();

  if (error) {
    return { profile: null, organization: null, error: error.message };
  }

  if (!data) {
    return { profile: null, organization: null, error: "Person not found." };
  }

  const profile = normalizeAppUserRow(data as AppUserRow & { role: AppUserRole });
  if (!canViewAdminPersonRow(viewer, profile) && !isSuperAdmin(viewer.role)) {
    return { profile: null, organization: null, error: "You do not have access to this person." };
  }

  const organization = profile.organization_id
    ? (await loadOrganizationMap(supabase, [profile.organization_id])).get(profile.organization_id) ?? null
    : null;

  return {
    profile: {
      ...profile,
      organization_name: organization?.name ?? null,
      organization_slug: organization?.slug ?? null,
      organization_type: organization?.org_type ?? null,
    },
    organization,
    error: null,
  };
}

export async function updateAdminPersonIdentity(
  supabase: SupabaseClient,
  viewer: AdminPeopleViewer | null,
  args: {
    targetAppUserId: string;
    role: AppUserRole;
    organizationId: string;
  }
): Promise<{ error: string | null }> {
  if (!viewer?.role || !isSuperAdmin(viewer.role)) {
    return { error: "Only super admin can update roles or organizations." };
  }

  const { error } = await supabase.rpc("admin_update_app_user_identity", {
    p_target_user_id: args.targetAppUserId,
    p_new_role: args.role,
    p_new_organization_id: args.organizationId,
  });

  return { error: error?.message ?? null };
}

export async function createAdminOrganization(
  supabase: SupabaseClient,
  viewer: AdminPeopleViewer | null,
  args: {
    name: string;
    orgType?: OrganizationRow["org_type"];
  }
): Promise<{ organization: OrganizationRow | null; error: string | null }> {
  if (!viewer?.role || !isSuperAdmin(viewer.role)) {
    return { organization: null, error: "Only super admin can add organizations." };
  }

  const name = args.name.trim();
  if (!name) {
    return { organization: null, error: "Organization name is required." };
  }

  const { data, error } = await supabase.rpc("admin_create_organization", {
    p_name: name,
    p_org_type: args.orgType ?? "b2b",
  });

  if (error) {
    const missingFunction =
      error.message.includes("admin_create_organization") && error.message.includes("schema cache");
    if (!missingFunction) {
      return { organization: null, error: error.message };
    }

    const orgType = args.orgType ?? "b2b";
    const slugBase = buildOrganizationSlugBase(name);
    const { data: slugRows, error: slugError } = await supabase
      .from("organizations")
      .select("slug")
      .ilike("slug", `${slugBase}%`);

    if (slugError) {
      return { organization: null, error: slugError.message };
    }

    const existingSlugs = new Set(
      (((slugRows as Array<{ slug: string | null }> | null) ?? [])
        .map((row) => (row.slug ?? "").trim().toLowerCase())
        .filter(Boolean))
    );

    let slug = slugBase;
    let suffix = 1;
    while (existingSlugs.has(slug)) {
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug,
        org_type: orgType,
        status: "active",
      })
      .select(ORGANIZATION_SELECT)
      .maybeSingle();

    if (insertError) {
      return { organization: null, error: insertError.message };
    }

    if (!inserted) {
      return { organization: null, error: "Organization was created but no row was returned." };
    }

    return {
      organization: mapOrganizationRow(inserted as OrganizationRow),
      error: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { organization: null, error: "Organization was created but no row was returned." };
  }

  return {
    organization: mapOrganizationRow(row as OrganizationRow),
    error: null,
  };
}
