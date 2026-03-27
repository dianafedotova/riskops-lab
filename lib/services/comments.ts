import type { AppUserRole } from "@/lib/app-user-role";
import { canCreatePrivateNotes, canReplyAsQA, canViewPrivateNotes, canWriteTraineeDiscussion } from "@/lib/permissions/checks";
import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import type {
  PersistedWorkflowAuthorRole,
  PrivateNoteCommentRow,
  ReviewDiscussionCommentRow,
  SimulatorCommentRow,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminPrivateNoteRow = {
  id: string;
  user_id: string | null;
  alert_id: string | null;
  author_app_user_id: string;
  author_role: PersistedWorkflowAuthorRole;
  parent_note_id: string | null;
  body: string;
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
};

function mapPrivateNote(row: AdminPrivateNoteRow): PrivateNoteCommentRow {
  return {
    id: row.id,
    thread_id: null,
    decision_id: null,
    user_id: row.user_id,
    alert_id: row.alert_id,
    author_app_user_id: row.author_app_user_id,
    author_role: "admin",
    comment_type: "admin_private",
    parent_comment_id: null,
    body: row.body,
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
      "id, user_id, alert_id, author_app_user_id, author_role, parent_note_id, body, is_edited, is_deleted, created_at, updated_at"
    )
    .eq("author_role", "admin")
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
      data: { discussionComments: [], privateNotes: [] },
      error: discussion.error,
    };
  }

  return {
    data: {
      discussionComments: discussion.comments,
      privateNotes: privateNotes.notes,
    },
    error: privateNotes.error,
  };
}

export async function addTraineeDiscussionComment(
  supabase: SupabaseClient,
  args: { threadId: string | null; authorAppUserId: string; role: AppUserRole | null; body: string }
) {
  if (!canWriteTraineeDiscussion(args.role)) {
    throw new Error("Only trainees can add discussion notes.");
  }
  if (!args.threadId) {
    throw new Error("No review thread yet. Wait a moment or refresh the page.");
  }
  if (!args.body.trim()) return;

  const { error } = await supabase.from("simulator_comments").insert({
    thread_id: args.threadId,
    author_app_user_id: args.authorAppUserId,
    author_role: "trainee",
    comment_type: "user_comment",
    parent_comment_id: null,
    body: args.body.trim(),
  });

  if (error) throw error;
}

export async function addTraineeDiscussionReply(
  supabase: SupabaseClient,
  args: {
    threadId: string | null;
    parentCommentId: string;
    authorAppUserId: string;
    role: AppUserRole | null;
    body: string;
  }
) {
  if (!canWriteTraineeDiscussion(args.role)) {
    throw new Error("Only trainees can reply in trainee discussion.");
  }
  if (!args.threadId) {
    throw new Error("No review thread yet. Wait a moment or refresh the page.");
  }
  if (!args.body.trim()) return;

  const { error } = await supabase.from("simulator_comments").insert({
    thread_id: args.threadId,
    author_app_user_id: args.authorAppUserId,
    author_role: "trainee",
    comment_type: "user_comment",
    parent_comment_id: args.parentCommentId,
    body: args.body.trim(),
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
  }
) {
  if (!canReplyAsQA(args.role)) {
    throw new Error("Only staff can send QA replies.");
  }
  if (!args.threadId) {
    throw new Error("No review thread yet.");
  }
  if (!args.body.trim()) return;

  const { error } = await supabase.from("simulator_comments").insert({
    thread_id: args.threadId,
    author_app_user_id: args.authorAppUserId,
    author_role: "admin",
    comment_type: "admin_qa",
    parent_comment_id: args.parentCommentId,
    body: args.body.trim(),
  });

  if (error) throw error;
  await recordAppUserActivity(supabase, {
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
  }
) {
  if (!canWriteTraineeDiscussion(args.role)) {
    throw new Error("Only trainees can edit trainee discussion.");
  }
  if (!args.threadId || !args.body.trim()) return;

  const { error } = await supabase
    .from("simulator_comments")
    .update({
      body: args.body.trim(),
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

  const row: Record<string, unknown> = {
    author_app_user_id: args.authorAppUserId,
    author_role: "admin",
    parent_note_id: null,
    body: args.body.trim(),
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
