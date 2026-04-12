import { captureSentryException, captureSentryMessage } from "@/lib/sentry-capture";
import { getEmailReplyToAddress, getProductEmailSiteOrigin, sendResendEmail } from "@/lib/product-email";
import {
  buildAlertAssignedEmailContent,
  buildCaseReviewedEmailContent,
} from "@/lib/product-email-templates";
import type { AlertReviewAssignmentPriority } from "@/lib/services/alert-review-assignments";
import type {
  ReviewSubmissionEvaluation,
  ReviewSubmissionRow,
  ReviewSubmissionState,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const APP_USER_NOTIFICATION_SELECT = "id, email, full_name, organization_id" as const;
const NOTIFICATION_PREFERENCE_SELECT =
  "app_user_id, product_email_enabled, case_reviewed_email_enabled, alert_assigned_email_enabled" as const;

type NotificationType = "case_reviewed" | "alert_assigned";
type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "disabled" | "skipped";

type AppUserNotificationRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_id: string | null;
};

type NotificationPreferenceRow = {
  app_user_id: string;
  product_email_enabled: boolean | null;
  case_reviewed_email_enabled: boolean | null;
  alert_assigned_email_enabled: boolean | null;
};

export type NotificationAttemptResult = {
  deliveryId: string | null;
  error: string | null;
  providerMessageId: string | null;
  recipientAppUserId: string;
  recipientEmail: string | null;
  status: NotificationDeliveryStatus;
  type: NotificationType;
};

export type NotificationBatchResult = {
  attempted: number;
  disabled: number;
  failed: number;
  results: NotificationAttemptResult[];
  sent: number;
  skipped: number;
};

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];
}

function isCaseReviewedEmailEnabled(
  row: NotificationPreferenceRow | null | undefined
): boolean {
  return row?.product_email_enabled !== false && row?.case_reviewed_email_enabled !== false;
}

function isAlertAssignedEmailEnabled(
  row: NotificationPreferenceRow | null | undefined
): boolean {
  return row?.product_email_enabled !== false && row?.alert_assigned_email_enabled !== false;
}

function emptyBatchResult(results: NotificationAttemptResult[]): NotificationBatchResult {
  return summarizeNotificationResults(results);
}

function summarizeNotificationResults(results: NotificationAttemptResult[]): NotificationBatchResult {
  return {
    results,
    attempted: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    disabled: results.filter((result) => result.status === "disabled").length,
  };
}

async function loadAppUserNotificationMap(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, AppUserNotificationRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("app_users")
    .select(APP_USER_NOTIFICATION_SELECT)
    .in("id", ids);

  if (error) {
    captureSentryMessage("Could not load app_users rows for product email", {
      level: "error",
      type: "product_email_app_user_lookup_failed",
      tags: {
        source: "product_email",
      },
      extra: {
        appUserIds: ids,
        detail: error.message,
      },
    });
    return new Map();
  }

  const rows = (data as AppUserNotificationRow[] | null) ?? [];
  return new Map(
    rows.map((row) => [
      String(row.id),
      {
        id: String(row.id),
        email: row.email?.trim() || null,
        full_name: row.full_name?.trim() || null,
        organization_id: row.organization_id ? String(row.organization_id) : null,
      },
    ])
  );
}

async function loadNotificationPreferenceMap(
  supabase: SupabaseClient,
  appUserIds: string[]
): Promise<Map<string, NotificationPreferenceRow>> {
  if (appUserIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(NOTIFICATION_PREFERENCE_SELECT)
    .in("app_user_id", appUserIds);

  if (error) {
    captureSentryMessage("Could not load notification preferences", {
      level: "error",
      type: "product_email_preferences_lookup_failed",
      tags: {
        source: "product_email",
      },
      extra: {
        appUserIds,
        detail: error.message,
      },
    });
    return new Map();
  }

  const rows = (data as NotificationPreferenceRow[] | null) ?? [];
  return new Map(rows.map((row) => [String(row.app_user_id), row]));
}

async function createNotificationDelivery(
  supabase: SupabaseClient,
  args: {
    errorMessage?: string | null;
    payload: Record<string, unknown>;
    recipientAppUserId: string;
    recipientEmail: string | null;
    status: NotificationDeliveryStatus;
    type: NotificationType;
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("notification_deliveries")
    .insert({
      type: args.type,
      recipient_app_user_id: args.recipientAppUserId,
      recipient_email: args.recipientEmail,
      provider: "resend",
      status: args.status,
      error_message: args.errorMessage ?? null,
      payload: args.payload,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    captureSentryMessage("Could not create notification delivery row", {
      level: "error",
      type: "notification_delivery_insert_failed",
      tags: {
        source: "product_email",
        notification_type: args.type,
      },
      extra: {
        detail: error.message,
        recipientAppUserId: args.recipientAppUserId,
      },
    });
    return null;
  }

  return data?.id ? String(data.id) : null;
}

async function finalizeNotificationDelivery(
  supabase: SupabaseClient,
  args: {
    deliveryId: string | null;
    errorMessage?: string | null;
    providerMessageId?: string | null;
    sentAt?: string | null;
    status: NotificationDeliveryStatus;
  }
): Promise<void> {
  if (!args.deliveryId) return;

  const { error } = await supabase
    .from("notification_deliveries")
    .update({
      provider_message_id: args.providerMessageId ?? null,
      status: args.status,
      error_message: args.errorMessage ?? null,
      sent_at: args.sentAt ?? null,
    })
    .eq("id", args.deliveryId);

  if (error) {
    captureSentryMessage("Could not finalize notification delivery row", {
      level: "error",
      type: "notification_delivery_finalize_failed",
      tags: {
        source: "product_email",
      },
      extra: {
        deliveryId: args.deliveryId,
        detail: error.message,
      },
    });
  }
}

async function deliverProductEmail(
  supabase: SupabaseClient,
  args: {
    enabled: boolean;
    payload: Record<string, unknown>;
    recipientAppUserId: string;
    recipient: AppUserNotificationRow | null | undefined;
    template: { html: string; subject: string; text: string };
    type: NotificationType;
  }
): Promise<NotificationAttemptResult> {
  const recipientAppUserId = args.recipientAppUserId.trim();
  const recipientEmail = args.recipient?.email ?? null;

  if (!recipientAppUserId) {
    return {
      deliveryId: null,
      error: "Recipient app user is missing.",
      providerMessageId: null,
      recipientAppUserId: "",
      recipientEmail,
      status: "failed",
      type: args.type,
    };
  }

  if (!args.enabled) {
    const deliveryId = await createNotificationDelivery(supabase, {
      type: args.type,
      recipientAppUserId,
      recipientEmail,
      status: "disabled",
      errorMessage: "Recipient disabled this notification type.",
      payload: args.payload,
    });

    return {
      deliveryId,
      error: null,
      providerMessageId: null,
      recipientAppUserId,
      recipientEmail,
      status: "disabled",
      type: args.type,
    };
  }

  if (!recipientEmail) {
    const deliveryId = await createNotificationDelivery(supabase, {
      type: args.type,
      recipientAppUserId,
      recipientEmail,
      status: "skipped",
      errorMessage: "Recipient email is missing.",
      payload: args.payload,
    });

    return {
      deliveryId,
      error: null,
      providerMessageId: null,
      recipientAppUserId,
      recipientEmail,
      status: "skipped",
      type: args.type,
    };
  }

  const deliveryId = await createNotificationDelivery(supabase, {
    type: args.type,
    recipientAppUserId,
    recipientEmail,
    status: "pending",
    payload: args.payload,
  });

  try {
    const resendResult = await sendResendEmail({
      to: recipientEmail,
      subject: args.template.subject,
      html: args.template.html,
      text: args.template.text,
      replyTo: getEmailReplyToAddress() || null,
      tags: [
        { name: "notification_type", value: args.type },
        { name: "recipient_app_user_id", value: recipientAppUserId },
      ],
    });
    const sentAt = new Date().toISOString();

    await finalizeNotificationDelivery(supabase, {
      deliveryId,
      providerMessageId: resendResult.id,
      sentAt,
      status: "sent",
    });

    return {
      deliveryId,
      error: null,
      providerMessageId: resendResult.id,
      recipientAppUserId,
      recipientEmail,
      status: "sent",
      type: args.type,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product email send failed.";

    await finalizeNotificationDelivery(supabase, {
      deliveryId,
      errorMessage: message,
      status: "failed",
    });

    captureSentryException(error, {
      level: "error",
      type: "product_email_send_failed",
      tags: {
        source: "product_email",
        notification_type: args.type,
      },
      extra: {
        recipientAppUserId,
        recipientEmail,
      },
    });

    return {
      deliveryId,
      error: message,
      providerMessageId: null,
      recipientAppUserId,
      recipientEmail,
      status: "failed",
      type: args.type,
    };
  }
}

export function shouldSendCaseReviewedEmail(reviewState: ReviewSubmissionState): boolean {
  return reviewState === "changes_requested" || reviewState === "approved" || reviewState === "closed";
}

export async function notifyCaseReviewed(
  supabase: SupabaseClient,
  submission: ReviewSubmissionRow
): Promise<NotificationAttemptResult | null> {
  const recipientAppUserId = (submission.app_user_id ?? "").trim();
  if (!recipientAppUserId) return null;

  const users = await loadAppUserNotificationMap(
    supabase,
    uniqueIds([submission.app_user_id, submission.reviewed_by_app_user_id])
  );
  const recipient = users.get(recipientAppUserId) ?? null;

  if (!shouldSendCaseReviewedEmail(submission.review_state)) {
    const payload = {
      alert_id: submission.alert_id,
      evaluation: submission.evaluation,
      review_state: submission.review_state,
      submission_id: submission.id,
      thread_id: submission.thread_id,
    };
    const deliveryId = await createNotificationDelivery(supabase, {
      type: "case_reviewed",
      recipientAppUserId,
      recipientEmail: recipient?.email ?? null,
      status: "skipped",
      errorMessage: "Review state does not trigger trainee email.",
      payload,
    });

    return {
      deliveryId,
      error: null,
      providerMessageId: null,
      recipientAppUserId,
      recipientEmail: recipient?.email ?? null,
      status: "skipped",
      type: "case_reviewed",
    };
  }

  const preferences = await loadNotificationPreferenceMap(supabase, [recipientAppUserId]);
  const reviewer = submission.reviewed_by_app_user_id
    ? users.get(String(submission.reviewed_by_app_user_id)) ?? null
    : null;
  const origin = getProductEmailSiteOrigin();
  const alertSegment = submission.alert_id ? `/alerts/${encodeURIComponent(submission.alert_id)}` : "/dashboard";
  const reviewThreadSegment = submission.thread_id
    ? `?reviewThread=${encodeURIComponent(submission.thread_id)}`
    : "";
  const caseUrl = `${origin}${alertSegment}${reviewThreadSegment}`;
  const payload = {
    alert_id: submission.alert_id,
    evaluation: submission.evaluation,
    review_state: submission.review_state,
    submission_id: submission.id,
    thread_id: submission.thread_id,
  };

  return deliverProductEmail(supabase, {
    type: "case_reviewed",
    recipientAppUserId,
    recipient,
    enabled: isCaseReviewedEmailEnabled(preferences.get(recipientAppUserId)),
    payload,
    template: buildCaseReviewedEmailContent({
      recipientName: recipient?.full_name ?? null,
      reviewState: submission.review_state,
      evaluation: submission.evaluation as ReviewSubmissionEvaluation | null,
      feedback: submission.feedback ?? null,
      reviewerName: reviewer?.full_name ?? reviewer?.email ?? null,
      alertId: submission.alert_id,
      caseUrl,
    }),
  });
}

export async function notifyAlertAssigned(
  supabase: SupabaseClient,
  args: {
    alertId: string;
    assignerAppUserId: string;
    dueAt: string | null;
    priority: AlertReviewAssignmentPriority;
    traineeAppUserIds: string[];
  }
): Promise<NotificationBatchResult> {
  const traineeIds = uniqueIds(args.traineeAppUserIds);
  if (traineeIds.length === 0) return emptyBatchResult([]);

  const users = await loadAppUserNotificationMap(supabase, uniqueIds([...traineeIds, args.assignerAppUserId]));
  const preferences = await loadNotificationPreferenceMap(supabase, traineeIds);
  const assigner = users.get(args.assignerAppUserId) ?? null;
  const origin = getProductEmailSiteOrigin();

  const results = await Promise.all(
    traineeIds.map(async (traineeAppUserId) => {
      const recipient = users.get(traineeAppUserId) ?? null;
      const payload = {
        alert_id: args.alertId,
        assigner_app_user_id: args.assignerAppUserId,
        due_at: args.dueAt,
        priority: args.priority,
        trainee_app_user_id: traineeAppUserId,
      };

      return deliverProductEmail(supabase, {
        type: "alert_assigned",
        recipientAppUserId: traineeAppUserId,
        recipient,
        enabled: isAlertAssignedEmailEnabled(preferences.get(traineeAppUserId)),
        payload,
        template: buildAlertAssignedEmailContent({
          recipientName: recipient?.full_name ?? null,
          assignerName: assigner?.full_name ?? assigner?.email ?? null,
          alertId: args.alertId,
          alertUrl: `${origin}/alerts/${encodeURIComponent(args.alertId)}`,
          priority: args.priority,
          dueAt: args.dueAt,
        }),
      });
    })
  );

  return summarizeNotificationResults(results);
}
