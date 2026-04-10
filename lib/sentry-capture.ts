import * as Sentry from "@sentry/nextjs";
import type { SeverityLevel } from "@sentry/nextjs";

type CaptureSentryOptions = {
  level?: SeverityLevel;
  type?: string;
  pathname?: string | null;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

function applyScope(scope: Sentry.Scope, options: CaptureSentryOptions) {
  scope.setLevel(options.level ?? "error");

  if (options.type) {
    scope.setTag("event_type", options.type);
  }

  if (options.pathname) {
    scope.setExtra("pathname", options.pathname);
  }

  for (const [key, value] of Object.entries(options.tags ?? {})) {
    scope.setTag(key, value);
  }

  for (const [key, value] of Object.entries(options.extra ?? {})) {
    scope.setExtra(key, value);
  }
}

export function captureSentryMessage(message: string, options: CaptureSentryOptions = {}) {
  Sentry.withScope((scope) => {
    applyScope(scope, options);
    Sentry.captureMessage(message);
  });
}

export function captureSentryException(error: unknown, options: CaptureSentryOptions = {}) {
  Sentry.withScope((scope) => {
    applyScope(scope, options);
    Sentry.captureException(error);
  });
}
