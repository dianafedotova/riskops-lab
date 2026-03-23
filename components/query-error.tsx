"use client";

import type { ReactNode } from "react";

type QueryErrorProps = {
  message: string;
  onRetry?: () => void;
  hint?: ReactNode;
};

export function QueryErrorBanner({ message, onRetry, hint }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm text-rose-900 shadow-sm transition-shadow duration-150 ease-out"
    >
      <p>{message}</p>
      {hint}
      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-900 transition-colors duration-150 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
