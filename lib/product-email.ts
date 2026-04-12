import { getSiteOrigin } from "@/lib/site-url";

const RESEND_API_URL = "https://api.resend.com/emails";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getProductEmailSiteOrigin(): string {
  return getSiteOrigin();
}

export function getResendApiKey(): string {
  return trimEnv(process.env.RESEND_API_KEY);
}

export function getEmailFromAddress(): string {
  return trimEnv(process.env.EMAIL_FROM_ADDRESS);
}

export function getEmailFromName(): string {
  return trimEnv(process.env.EMAIL_FROM_NAME);
}

export function getEmailReplyToAddress(): string {
  return trimEnv(process.env.EMAIL_REPLY_TO_ADDRESS);
}

export function getProductEmailFromHeader(): string {
  const email = getEmailFromAddress();
  if (!email) return "";

  const name = getEmailFromName();
  return name ? `${name} <${email}>` : email;
}

export function isProductEmailConfigured(): boolean {
  return Boolean(getResendApiKey() && getProductEmailFromHeader());
}

export type ResendSendEmailArgs = {
  html: string;
  replyTo?: string | null;
  subject: string;
  tags?: Array<{ name: string; value: string }>;
  text: string;
  to: string;
};

export async function sendResendEmail(args: ResendSendEmailArgs): Promise<{ id: string }> {
  const apiKey = getResendApiKey();
  const from = getProductEmailFromHeader();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  if (!from) {
    throw new Error("Missing EMAIL_FROM_ADDRESS.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "riskops-lab/product-email",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.replyTo?.trim() ? args.replyTo.trim() : undefined,
      tags: args.tags,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: unknown; id?: unknown; message?: unknown } | null;

  if (!response.ok) {
    const detail =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : `Resend request failed with status ${response.status}`;
    throw new Error(detail);
  }

  if (!payload || typeof payload.id !== "string" || !payload.id.trim()) {
    throw new Error("Resend response did not include a message id.");
  }

  return { id: payload.id };
}
