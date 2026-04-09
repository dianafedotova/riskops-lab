import { isSuperAdmin, type AppUserRole } from "@/lib/app-user-role";
import { canCreatePrivateNotes, canReplyAsQA, canViewPrivateNotes, canWriteTraineeDiscussion } from "@/lib/permissions/checks";
import { buildRichNoteStorageFields } from "@/lib/rich-note";
import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import type {
  PersistedWorkflowAuthorRole,
  PrivateNoteCommentRow,
  RichNoteFormat,
  ReviewDiscussionCommentRow,
  SimulatorCommentRow,
} from "@/lib/types";
import type { JSONContent } from "@tiptap/core";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminPrivateNoteRow = {
  id: string;
  user_id: string | null;
  alert_id: string | null;
  author_app_user_id: string;
  author_role: PersistedWorkflowAuthorRole;
  parent_note_id: string | null;
  body: string;
  body_json?: JSONContent | null;
  body_format?: RichNoteFormat | null;
  is_edited?: boolean | null;
  is_deleted?: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

export type CommentViewerContext = {
  appUserId: string | null;
  role: AppUserRole | null;
};

export type PrivateNoteTarget = {
  alertInternalId?: string | null;
  simulatorUserId?: string | null;
};

export type CommentPanelData = {
  discussionComments: SimulatorCommentRow[];
  privateNotes: SimulatorCommentRow[];
  authorLabels: Record<string, string>;
};

function mapPrivateNote(row: AdminPrivateNoteRow): PrivateNoteCommentRow {
  return {
    id: row.id,
    thread_id: null,
    decision_id: null,
    user_id: row.user_id,
    alert_id: row.alert_id,
    author_app_user_id: row.author_app_user_id,
    author_role: row.author_role,
    comment_type: "admin_private",
    parent_comment_id: null,
    body: row.body,
    body_json: row.body_json ?? null,
    body_format: row.body_format ?? "plain_text",
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}

function hasPrivateNoteTarget(target: PrivateNoteTarget): boolean {
  return Boolean(target.alertInternalId || target.simulatorUserId);
}

export async function listReviewDiscussionComments(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ comments: ReviewDiscussionCommentRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("simulator_comments")
    .select("*")
    .eq("thread_id", threadId)
    .neq("comment_type", "admin_private")
    .order("created_at", { ascending: true });

  if (error) {
    return { comments: [], error: new Error(error.message) };
  }

  return { comments: (data as ReviewDiscussionCommentRow[]) ?? [], error: null };
}

export async function listVisiblePrivateNotes(
  supabase: SupabaseClient,
  viewer: CommentViewerContext,
  target: PrivateNoteTarget
): Promise<{ notes: SimulatorCommentRow[]; error: Error | null }> {
  if (!viewer.appUserId || !canViewPrivateNotes(viewer.role) || !hasPrivateNoteTarget(target)) {
    return { notes: [], error: null };
  }

  let query = supabase
    .from("admin_private_notes")
    .select(
      "id, user_id, alert_id, author_app_user_id, author_role, parent_note_id, body, body_json, body_format, is_edited, is_deleted, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (viewer.role !== "super_admin") {
    query = query.eq("author_app_user_id", viewer.appUserId);
  }

  if (target.simulatorUserId) {
    query = query.eq("user_id", target.simulatorUserId).is("alert_id", null);
  } else if (target.alertInternalId) {
    query = query.eq("alert_id", target.alertInternalId).is("user_id", null);
  }

  const { data, error } = await query;
  if (error) {
    return { notes: [], error: new Error(error.message) };
  }

  return {
    notes: ((data as AdminPrivateNoteRow[]) ?? []).filter((row) => !row.is_deleted).map(mapPrivateNote),
    error: null,
  };
}

export async function loadCommentPanelData(
  supabase: SupabaseClient,
  args: {
    threadId?: string | null;
    reviewMode?: boolean;
    viewer: CommentViewerContext;
    includePrivateNotes?: boolean;
    target: PrivateNoteTarget;
  }
): Promise<{ data: CommentPanelData; error: Error | null }> {
  const discussionPromise =
    args.reviewMode && args.threadId
      ? listReviewDiscussionComments(supabase, args.threadId)
      : Promise.resolve({ comments: [], error: null });
  const privatePromise = args.includePrivateNotes
    ? listVisiblePrivateNotes(supabase, args.viewer, args.target)
    : Promise.resolve({ notes: [], error: null });

  const [discussion, privateNotes] = await Promise.all([discussionPromise, privatePromise]);

  if (discussion.error) {
    return {
      data: { discussionComments: [], privateNotes: [], authorLabels: {} },
      error: discussion.error,
    };
  }

  const authorIds = Array.from(
    new Set(
      [...discussion.comments, ...privateNotes.notes]
        .map((comment) => comment.author_app_user_id)
        .filter(Boolean)
    )
  );

  let authorLabels: Record<string, string> = {};
  if (authorIds.length > 0) {
    let rows: { id: string; email: string | null; full_name?: string | null }[] = [];
    const withFullName = await supabase
      .from("app_users")
      .select("id, email, full_name")
      .in("id", authorIds);

    if (withFullName.error) {
      const fallback = await supabase
        .from("app_users")
        .select("id, email")
        .in("id", authorIds);
      rows = (fallback.data as { id: string; email: string | null }[]) ?? [];
    } else {
      rows = (withFullName.data as { id: string; email: string | null; full_name?: string | null }[]) ?? [];
    }

    authorLabels = {};
    for (const row of rows) {
      const fullName = (row.full_name ?? "").trim();
      const email = (row.email ?? "").trim();
      authorLabels[row.id] = fullName && email ? `${fullName} · ${email}` : (fullName || email || "user");
    }
  }

  return {
    data: {
      discussionComments: discussion.comments,
      privateNotes: privateNotes.notes,
      authorLabels,
    },
    error: privateNotes.error,
  };
}

export async function addTraineeDiscussionComment(
  supabase: SupabaseClient,
  args: {
    threadId: string | null;
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
  }
) {
  if (!canWriteTraineeDiscussion(args.role)) {
    throw new Error("Only trainees can add discussion notes.");
  }
  if (!args.threadId) {
    throw new Error("No cases for review yet. Wait a moment or refresh the page.");
  }
  if (!args.body.trim()) return;

  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  const { data, error } = await supabase
    .from("simulator_comments")
    .insert({
      thread_id: args.threadId,
      author_app_user_id: args.authorAppUserId,
      author_role: "trainee",
      comment_type: "user_comment",
      parent_comment_id: null,
      ...richBodyFields,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data?.id ? String(data.id) : null;
}

export async function addTraineeDiscussionReply(
  supabase: SupabaseClient,
  args: {
    threadId: string | null;
    parentCommentId: string;
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
  }
) {
  if (!canWriteTraineeDiscussion(args.role)) {
    throw new Error("Only trainees can reply in trainee discussion.");
  }
  if (!args.threadId) {
    throw new Error("No cases for review yet. Wait a moment or refresh the page.");
  }
  if (!args.body.trim()) return;

  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  const { error } = await supabase.from("simulator_comments").insert({
    thread_id: args.threadId,
    author_app_user_id: args.authorAppUserId,
    author_role: "trainee",
    comment_type: "user_comment",
    parent_comment_id: args.parentCommentId,
    ...richBodyFields,
  });

  if (error) throw error;
}

export async function addStaffQaReply(
  supabase: SupabaseClient,
  args: {
    threadId: string | null;
    parentCommentId: string;
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
  }
) {
  if (!canReplyAsQA(args.role)) {
    throw new Error("Only staff can send QA replies.");
  }
  if (!args.threadId) {
    throw new Error("No cases for review yet.");
  }
  if (!args.body.trim()) return;

  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  const { error } = await supabase.from("simulator_comments").insert({
    thread_id: args.threadId,
    author_app_user_id: args.authorAppUserId,
    author_role: args.role ?? "reviewer",
    comment_type: "admin_qa",
    parent_comment_id: args.parentCommentId,
    ...richBodyFields,
  });

  if (error) throw error;
  void recordAppUserActivity(supabase, {
    appUserId: args.authorAppUserId,
    eventType: "qa_reply_created",
    meta: {
      thread_id: args.threadId,
      parent_comment_id: args.parentCommentId,
    },
  });
}

export async function updateTraineeRootDiscussionComment(
  supabase: SupabaseClient,
  args: {
    threadId: string | null;
    commentId: string;
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
  }
) {
  if (!canWriteTraineeDiscussion(args.role)) {
    throw new Error("Only trainees can edit trainee discussion.");
  }
  if (!args.threadId || !args.body.trim()) return;

  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  const { error } = await supabase
    .from("simulator_comments")
    .update({
      ...richBodyFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.commentId)
    .eq("author_app_user_id", args.authorAppUserId)
    .eq("comment_type", "user_comment")
    .is("parent_comment_id", null)
    .eq("thread_id", args.threadId);

  if (error) throw error;
}

export async function addPrivateNote(
  supabase: SupabaseClient,
  args: {
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
    target: PrivateNoteTarget;
  }
) {
  if (!canCreatePrivateNotes(args.role)) {
    throw new Error("Only staff can create private notes.");
  }
  if (!args.body.trim()) return;
  if (!hasPrivateNoteTarget(args.target)) {
    throw new Error("Private note target is missing.");
  }

  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  const row: Record<string, unknown> = {
    author_app_user_id: args.authorAppUserId,
    author_role: args.role ?? "reviewer",
    parent_note_id: null,
    ...richBodyFields,
    is_edited: false,
    is_deleted: false,
  };

  if (args.target.simulatorUserId) {
    row.user_id = args.target.simulatorUserId;
    row.alert_id = null;
  } else {
    row.user_id = null;
    row.alert_id = args.target.alertInternalId ?? null;
  }

  const { error } = await supabase.from("admin_private_notes").insert(row);
  if (error) throw error;
  await recordAppUserActivity(supabase, {
    appUserId: args.authorAppUserId,
    eventType: "private_note_created",
    meta: {
      alert_id: row.alert_id ?? null,
      user_id: row.user_id ?? null,
    },
  });
}

export async function updatePrivateNote(
  supabase: SupabaseClient,
  args: {
    noteId: string;
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
  }
) {
  if (!canCreatePrivateNotes(args.role)) {
    throw new Error("Only staff can edit private notes.");
  }
  if (!args.body.trim()) return;

  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  let query = supabase
    .from("admin_private_notes")
    .update({
      ...richBodyFields,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.noteId);

  if (!isSuperAdmin(args.role)) {
    query = query.eq("author_app_user_id", args.authorAppUserId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function deletePrivateNote(
  supabase: SupabaseClient,
  args: {
    noteId: string;
    authorAppUserId: string;
    role: AppUserRole | null;
  }
) {
  if (!canCreatePrivateNotes(args.role)) {
    throw new Error("Only staff can delete private notes.");
  }

  let query = supabase
    .from("admin_private_notes")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.noteId);

  if (!isSuperAdmin(args.role)) {
    query = query.eq("author_app_user_id", args.authorAppUserId);
  }

  const { error } = await query;
  if (error) throw error;
}
