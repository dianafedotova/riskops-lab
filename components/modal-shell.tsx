"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";

type ModalShellProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
  closeDisabled?: boolean;
};

export function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  widthClassName = "max-w-3xl",
  closeDisabled = false,
}: ModalShellProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDisabled, onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`w-full overflow-hidden rounded-[1.2rem] border border-slate-200/95 bg-[linear-gradient(180deg,rgb(255_255_255/_0.99),rgb(248_250_252/_0.99))] shadow-[0_24px_56px_rgba(15,23,42,0.22)] ${widthClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close dialog"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 4l8 8M12 4 4 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="max-h-[min(78vh,52rem)] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-200/80 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
