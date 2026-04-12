import { canAccessStaffFeatures } from "@/lib/app-user-role";
import { requireCurrentAppUser } from "@/lib/auth/current-app-user";
import { notifyAlertAssigned } from "@/lib/product-notifications";
import { captureSentryException, captureSentryMessage } from "@/lib/sentry-capture";
import {
  upsertAlertReviewAssignments,
  type AlertReviewAssignmentPriority,
} from "@/lib/services/alert-review-assignments";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

type AssignmentRequestBody = {
  alertId?: string;
  dueAt?: string | null;
  priority?: AlertReviewAssignmentPriority;
  traineeAppUserIds?: string[];
};

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isPriority(value: unknown): value is AlertReviewAssignmentPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function parseBody(body: unknown): AssignmentRequestBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as AssignmentRequestBody;
}

export async function POST(request: NextRequest) {
  try {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) return badRequest("Invalid request body.");

    const alertId = body.alertId?.trim() ?? "";
    const traineeAppUserIds = Array.isArray(body.traineeAppUserIds)
      ? [...new Set(body.traineeAppUserIds.map((value) => String(value).trim()).filter(Boolean))]
      : [];
    const dueAt =
      body.dueAt == null ? null : typeof body.dueAt === "string" ? body.dueAt.trim() || null : "__invalid__";

    if (!alertId) return badRequest("alertId is required.");
    if (!isPriority(body.priority)) return badRequest("Invalid assignment priority.");
    if (!Array.isArray(body.traineeAppUserIds)) return badRequest("traineeAppUserIds is required.");
    if (traineeAppUserIds.length === 0) return badRequest("Select at least one trainee.");
    if (dueAt === "__invalid__") return badRequest("Invalid dueAt value.");

    const supabase = await createServerSupabaseClient();
    const currentUser = await requireCurrentAppUser(supabase);

    if (!currentUser.authUser || !currentUser.appUser) {
      return badRequest("Authentication is required.", 401);
    }

    if (!canAccessStaffFeatures(currentUser.appUser.role)) {
      return badRequest("Staff access is required.", 403);
    }

    const existingRes = await supabase
      .from("alert_review_assignments")
      .select("trainee_app_user_id")
      .eq("alert_id", alertId)
      .is("cancelled_at", null)
      .in("trainee_app_user_id", traineeAppUserIds);

    const existingIds =
      existingRes.error == null
        ? new Set(
            ((existingRes.data as Array<{ trainee_app_user_id: string }> | null) ?? []).map((row) =>
              String(row.trainee_app_user_id)
            )
          )
        : null;

    if (existingRes.error) {
      captureSentryMessage("Could not prefetch existing alert assignments before notification send", {
        level: "error",
        type: "alert_assignment_prefetch_failed",
        pathname: request.nextUrl.pathname,
        tags: {
          source: "route",
        },
        extra: {
          alertId,
          detail: existingRes.error.message,
        },
      });
    }

    const result = await upsertAlertReviewAssignments(supabase, currentUser.appUser, {
      alertId,
      traineeAppUserIds,
      priority: body.priority,
      dueAt,
    });

    if (result.error) {
      return badRequest(result.error, /access|required/i.test(result.error) ? 403 : 400);
    }

    const newlyAssignedIds =
      existingIds == null ? [] : traineeAppUserIds.filter((traineeAppUserId) => !existingIds.has(traineeAppUserId));
    const notification =
      newlyAssignedIds.length > 0
        ? await notifyAlertAssigned(supabase, {
            alertId,
            assignerAppUserId: currentUser.appUser.id,
            traineeAppUserIds: newlyAssignedIds,
            priority: body.priority,
            dueAt,
          })
        : {
            attempted: 0,
            disabled: 0,
            failed: 0,
            results: [],
            sent: 0,
            skipped: 0,
          };

    return NextResponse.json({
      error: null,
      notification,
    });
  } catch (error) {
    captureSentryException(error, {
      level: "error",
      type: "alert_review_assignments_route_failed",
      pathname: request.nextUrl.pathname,
      tags: {
        source: "route",
      },
    });
    return badRequest("Could not save assignments right now.", 500);
  }
}
