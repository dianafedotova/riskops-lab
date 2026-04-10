import * as Sentry from "@sentry/nextjs";

const edgeDsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  dsn: edgeDsn,
  enabled: Boolean(edgeDsn),
  sendDefaultPii: true,
  environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
