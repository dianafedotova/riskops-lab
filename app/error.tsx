"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("event_type", error.name || "route_error");
      scope.setExtra("pathname", typeof window !== "undefined" ? window.location.pathname : null);
      if (error.digest) {
        scope.setExtra("digest", error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-10">
      <section className="page-panel surface-lift w-full space-y-4 p-6 text-[var(--app-shell-bg)]">
        <p className="field-label">Something went wrong</p>
        <h1 className="heading-page">We hit an unexpected beta error.</h1>
        <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
          The issue has been logged. You can retry this page or head back to a stable route.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => reset()} className="ui-btn ui-btn-primary">
            Try again
          </button>
          <Link href="/" className="ui-btn ui-btn-secondary">
            Go home
          </Link>
        </div>
      </section>
    </div>
  );
}
