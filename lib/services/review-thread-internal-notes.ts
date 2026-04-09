import { buildRichNoteStorageFields } from "@/lib/rich-note";
import type { ReviewThreadInternalNoteRow, RichNoteFormat } from "@/lib/types";
import type { JSONContent } from "@tiptap/core";
import type { SupabaseClient } from "@supabase/supabase-js";

type RawReviewThreadInternalNoteRow = {
  thread_id: string;
  body: string | null;
  body_json?: JSONContent | null;
  body_format?: RichNoteFormat | null;
  updated_by_app_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeReviewThreadInternalNoteRow(
  row: RawReviewThreadInternalNoteRow
): ReviewThreadInternalNoteRow {
  return {
    thread_id: String(row.thread_id),
    body: row.body ?? "",
    body_json: row.body_json ?? null,
    body_format: row.body_format ?? "plain_text",
    updated_by_app_user_id: row.updated_by_app_user_id ? String(row.updated_by_app_user_id) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getReviewThreadInternalNote(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ note: ReviewThreadInternalNoteRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("review_thread_internal_notes")
    .select("thread_id, body, body_json, body_format, updated_by_app_user_id, created_at, updated_at")
    .eq("thread_id", threadId)
    .maybeSingle();

  if (error) {
    return { note: null, error: error.message };
  }

  return {
    note: data ? normalizeReviewThreadInternalNoteRow(data as RawReviewThreadInternalNoteRow) : null,
    error: null,
  };
}

export async function saveReviewThreadInternalNote(
  supabase: SupabaseClient,
  args: {
    threadId: string;
    appUserId: string;
    body: string;
    bodyJson?: JSONContent | null;
    bodyFormat?: RichNoteFormat | null;
  }
): Promise<{ note: ReviewThreadInternalNoteRow | null; error: string | null }> {
  const richBodyFields = buildRichNoteStorageFields({
    body: args.body,
    bodyJson: args.bodyJson,
    bodyFormat: args.bodyFormat,
  });

  const { data, error } = await supabase
    .from("review_thread_internal_notes")
    .upsert(
      {
        thread_id: args.threadId,
        updated_by_app_user_id: args.appUserId,
        ...richBodyFields,
      },
      { onConflict: "thread_id" }
    )
    .select("thread_id, body, body_json, body_format, updated_by_app_user_id, created_at, updated_at")
    .single();

  if (error) {
    return { note: null, error: error.message };
  }

  return {
    note: normalizeReviewThreadInternalNoteRow(data as RawReviewThreadInternalNoteRow),
    error: null,
  };
}

export async function deleteReviewThreadInternalNote(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("review_thread_internal_notes")
    .delete()
    .eq("thread_id", threadId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
