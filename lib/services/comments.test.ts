import { addPrivateNote, addStaffQaReply, addTraineeDiscussionComment, listVisiblePrivateNotes } from "@/lib/services/comments";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

function createSupabaseStub() {
  return {
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(async () => ({ data: [], error: null })),
          is: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn> };
}

describe("comment service access guards", () => {
  it("blocks trainee from sending QA replies before any DB write", async () => {
    const supabase = createSupabaseStub();

    await expect(
      addStaffQaReply(supabase, {
        threadId: "thread-1",
        parentCommentId: "comment-1",
        authorAppUserId: "app-user-1",
        role: "trainee",
        body: "QA reply",
      })
    ).rejects.toThrow("Only staff can send QA replies.");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("blocks trainee from creating private notes before any DB write", async () => {
    const supabase = createSupabaseStub();

    await expect(
      addPrivateNote(supabase, {
        authorAppUserId: "app-user-1",
        role: "trainee",
        body: "Private",
        target: { simulatorUserId: "sim-user-1" },
      })
    ).rejects.toThrow("Only staff can create private notes.");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("blocks staff from posting trainee discussion messages", async () => {
    const supabase = createSupabaseStub();

    await expect(
      addTraineeDiscussionComment(supabase, {
        threadId: "thread-1",
        authorAppUserId: "app-user-1",
        role: "reviewer",
        body: "hello",
      })
    ).rejects.toThrow("Only trainees can add discussion notes.");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("never returns private notes to trainee viewers", async () => {
    const supabase = createSupabaseStub();

    const result = await listVisiblePrivateNotes(
      supabase,
      { appUserId: "app-user-1", role: "trainee" },
      { simulatorUserId: "sim-user-1" }
    );

    expect(result.notes).toEqual([]);
    expect(result.error).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
