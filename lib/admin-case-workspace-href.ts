import type { ReviewThreadContextType } from "@/lib/types";

function withReviewThreadParam(href: string, threadId: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}reviewThread=${encodeURIComponent(threadId)}`;
}

/**
 * Deep link into alert or simulator user workspace with a specific review thread (staff review mode).
 */
export function buildAdminCaseWorkspaceHref(args: {
  threadId: string;
  contextType: ReviewThreadContextType | string | null | undefined;
  alertId: string | null | undefined;
  simulatorUserId: string | null | undefined;
}): string | null {
  const ctx = (args.contextType ?? "").trim().toLowerCase();
  if (ctx === "alert" && args.alertId) {
    return withReviewThreadParam(`/alerts/${encodeURIComponent(String(args.alertId))}`, args.threadId);
  }
  if (ctx === "profile" && args.simulatorUserId) {
    return withReviewThreadParam(`/users/${encodeURIComponent(String(args.simulatorUserId))}`, args.threadId);
  }
  return null;
}

export function adminCaseTargetSummary(args: {
  contextType: ReviewThreadContextType | string | null | undefined;
  alertId: string | null | undefined;
  simulatorUserId: string | null | undefined;
  simUserEmail: string | null | undefined;
  simUserFullName: string | null | undefined;
}): { label: string; openLabel: string } {
  const ctx = (args.contextType ?? "").trim().toLowerCase();
  if (ctx === "alert" && args.alertId) {
    return { label: `Alert · ${args.alertId}`, openLabel: "Open case in alert" };
  }
  if (ctx === "profile" && args.simulatorUserId) {
    const name = (args.simUserFullName ?? "").trim();
    const email = (args.simUserEmail ?? "").trim();
    const who = name && email ? `${name} · ${email}` : name || email || args.simulatorUserId;
    return { label: `Profile · ${who}`, openLabel: "Open simulator profile" };
  }
  return { label: "Review case", openLabel: "Open case" };
}
