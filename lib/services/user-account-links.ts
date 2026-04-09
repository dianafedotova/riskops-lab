import type {
  AppUserRow,
  CreateUserAccountLinkInput,
  UpdateUserAccountLinkInput,
  UserAccountLinkRow,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureStaffViewer,
  ensureVisibleUsers,
  normalizeRequiredText,
  shouldRetryWithLegacyShape,
  type StaffViewer,
} from "@/lib/services/simulator-shared";

const USER_ACCOUNT_LINK_SELECT =
  "id, user_id, linked_user_id, link_reason, organization_id, created_at, updated_at" as const;

type UserAccountLinkViewer = Pick<AppUserRow, "id" | "role" | "organization_id"> | null | undefined;

type NormalizedUserAccountLinkInput = {
  user_id: string;
  linked_user_id: string;
  link_reason: string;
};

function normalizeLinkPair(userId: string, linkedUserId: string) {
  return [userId, linkedUserId].sort((left, right) => left.localeCompare(right)) as [string, string];
}

function normalizeUserAccountLinkInput(
  input: CreateUserAccountLinkInput | UpdateUserAccountLinkInput
): { value: NormalizedUserAccountLinkInput | null; errors: string[] } {
  const errors: string[] = [];
  const userId = normalizeRequiredText(input.user_id, "User", errors);
  const linkedUserId = normalizeRequiredText(input.linked_user_id, "Linked user", errors);
  const linkReason = normalizeRequiredText(input.link_reason, "Link reason", errors);

  if (userId && linkedUserId && userId === linkedUserId) {
    errors.push("Linked user must be different from the current user.");
  }

  if (errors.length > 0) return { value: null, errors };

  const [canonicalUserId, canonicalLinkedUserId] = normalizeLinkPair(userId!, linkedUserId!);
  return {
    value: {
      user_id: canonicalUserId,
      linked_user_id: canonicalLinkedUserId,
      link_reason: linkReason!,
    },
    errors,
  };
}

function normalizeUserAccountLinkRow(row: Partial<UserAccountLinkRow>): UserAccountLinkRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    linked_user_id: String(row.linked_user_id ?? ""),
    link_reason: row.link_reason?.trim() || "",
    organization_id: row.organization_id ? String(row.organization_id) : null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function listUserAccountLinksForUser(
  supabase: SupabaseClient,
  viewer: UserAccountLinkViewer,
  simulatorUserId: string
): Promise<{ links: UserAccountLinkRow[]; error: string | null }> {
  if (!viewer?.id) return { links: [], error: "You must be signed in to view linked accounts." };

  const { data, error } = await supabase
    .from("user_account_links")
    .select(USER_ACCOUNT_LINK_SELECT)
    .or(`user_id.eq.${simulatorUserId},linked_user_id.eq.${simulatorUserId}`)
    .order("created_at", { ascending: false });

  if (error) return { links: [], error: error.message };
  return {
    links: (((data as UserAccountLinkRow[] | null) ?? []).map((row) => normalizeUserAccountLinkRow(row))),
    error: null,
  };
}

export async function createUserAccountLink(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: CreateUserAccountLinkInput
): Promise<{ link: UserAccountLinkRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { link: null, error: viewerError };

  const { value, errors } = normalizeUserAccountLinkInput(input);
  if (!value) return { link: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id, value.linked_user_id]);
  if (visibleUsers.error) return { link: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id) || !visibleUsers.ids.has(value.linked_user_id)) {
    return { link: null, error: "Both users must exist and stay inside your visible organization scope." };
  }

  const richInsert = await supabase
    .from("user_account_links")
    .insert({
      ...value,
      organization_id: viewer!.organization_id,
      created_by_app_user_id: viewer!.id,
      updated_by_app_user_id: viewer!.id,
    })
    .select(USER_ACCOUNT_LINK_SELECT)
    .single();

  if (richInsert.error && !shouldRetryWithLegacyShape(richInsert.error.message)) {
    return { link: null, error: richInsert.error.message };
  }
  if (!richInsert.error) {
    return { link: normalizeUserAccountLinkRow(richInsert.data as UserAccountLinkRow), error: null };
  }

  const legacyInsert = await supabase
    .from("user_account_links")
    .insert({
      ...value,
      organization_id: viewer!.organization_id,
    })
    .select(USER_ACCOUNT_LINK_SELECT)
    .single();

  if (legacyInsert.error) return { link: null, error: legacyInsert.error.message };
  return { link: normalizeUserAccountLinkRow(legacyInsert.data as UserAccountLinkRow), error: null };
}

export async function updateUserAccountLink(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  input: UpdateUserAccountLinkInput
): Promise<{ link: UserAccountLinkRow | null; error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { link: null, error: viewerError };

  const { value, errors } = normalizeUserAccountLinkInput(input);
  if (!value) return { link: null, error: errors.join(" ") };

  const visibleUsers = await ensureVisibleUsers(supabase, [value.user_id, value.linked_user_id]);
  if (visibleUsers.error) return { link: null, error: visibleUsers.error };
  if (!visibleUsers.ids.has(value.user_id) || !visibleUsers.ids.has(value.linked_user_id)) {
    return { link: null, error: "Both users must exist and stay inside your visible organization scope." };
  }

  const richUpdate = await supabase
    .from("user_account_links")
    .update({
      ...value,
      organization_id: viewer!.organization_id,
      updated_by_app_user_id: viewer!.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(USER_ACCOUNT_LINK_SELECT)
    .single();

  if (richUpdate.error && !shouldRetryWithLegacyShape(richUpdate.error.message)) {
    return { link: null, error: richUpdate.error.message };
  }
  if (!richUpdate.error) {
    return { link: normalizeUserAccountLinkRow(richUpdate.data as UserAccountLinkRow), error: null };
  }

  const legacyUpdate = await supabase
    .from("user_account_links")
    .update({
      ...value,
      organization_id: viewer!.organization_id,
    })
    .eq("id", input.id)
    .select(USER_ACCOUNT_LINK_SELECT)
    .single();

  if (legacyUpdate.error) return { link: null, error: legacyUpdate.error.message };
  return { link: normalizeUserAccountLinkRow(legacyUpdate.data as UserAccountLinkRow), error: null };
}

export async function deleteUserAccountLink(
  supabase: SupabaseClient,
  viewer: StaffViewer,
  linkId: string
): Promise<{ error: string | null }> {
  const viewerError = ensureStaffViewer(viewer);
  if (viewerError) return { error: viewerError };

  const { error } = await supabase.from("user_account_links").delete().eq("id", linkId);
  if (error) return { error: error.message };
  return { error: null };
}
