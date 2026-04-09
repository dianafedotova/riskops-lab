import {
  buildAppUserActivityInsertRow,
  listAppUserActivityForAppUser,
} from "@/lib/services/app-user-activity";
import { describe, expect, it } from "vitest";

describe("buildAppUserActivityInsertRow", () => {
  it("maps meta to metadata and sets entity when alert_id is present", () => {
    const row = buildAppUserActivityInsertRow({
      appUserId: "user-1",
      eventType: "trainee_decision_submitted",
      meta: {
        alert_id: "alert-uuid",
        thread_id: "thread-1",
        decision: "true_positive",
      },
    });

    expect(row).toEqual({
      app_user_id: "user-1",
      event_type: "trainee_decision_submitted",
      metadata: {
        alert_id: "alert-uuid",
        thread_id: "thread-1",
        decision: "true_positive",
      },
      entity_type: "alert",
      entity_id: "alert-uuid",
    });
  });

  it("omits undefined meta values and leaves entity null without alert_id", () => {
    const row = buildAppUserActivityInsertRow({
      appUserId: "user-1",
      eventType: "qa_reply_created",
      meta: {
        thread_id: "t1",
        alert_id: undefined,
      },
    });

    expect(row.metadata).toEqual({ thread_id: "t1" });
    expect(row.entity_type).toBeNull();
    expect(row.entity_id).toBeNull();
  });

  it("lists activity rows by app user id", async () => {
    const limit = 25;
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: async (value: number) => ({
        data: [
          {
            id: "evt-1",
            app_user_id: "user-1",
            event_type: "review_submission_created",
            entity_id: "alert-1",
            entity_type: "alert",
            metadata: { submission_version: 2 },
            created_at: "2026-04-06T00:00:00.000Z",
          },
        ],
        error: null,
        capturedLimit: value,
      }),
    };
    const supabase = {
      from: () => query,
    } as never;

    const result = await listAppUserActivityForAppUser(supabase, {
      appUserId: "user-1",
      limit,
    });

    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.app_user_id).toBe("user-1");
  });
});
