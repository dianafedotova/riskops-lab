"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("event_type", error.name || "global_error");
      scope.setExtra("pathname", typeof window !== "undefined" ? window.location.pathname : null);
      if (error.digest) {
        scope.setExtra("digest", error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-app-shell px-4 py-10 text-slate-200">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <section className="shell-card w-full space-y-4 p-6 text-[var(--app-shell-bg)]">
            <p className="field-label">Global failure</p>
            <h1 className="heading-page">RiskOps Lab could not finish loading.</h1>
            <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
              We logged the failure and kept the beta in a safe fallback state.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => reset()} className="ui-btn ui-btn-primary">
                Reload shell
              </button>
              <Link href="/" className="ui-btn ui-btn-secondary">
                Go home
              </Link>
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
