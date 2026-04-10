"use client";

import {
  brandedModalBackdropClassName,
  brandedModalBodyClassName,
  brandedModalCloseButtonClassName,
  brandedModalFooterClassName,
  brandedModalHeaderClassName,
  brandedModalPanelClassName,
} from "@/shared/ui/control-styles";
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
      className={brandedModalBackdropClassName}
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
        className={brandedModalPanelClassName(widthClassName)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={brandedModalHeaderClassName}>
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
              className={brandedModalCloseButtonClassName}
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
        <div className={brandedModalBodyClassName}>{children}</div>
        {footer ? <div className={brandedModalFooterClassName}>{footer}</div> : null}
      </div>
    </div>
  );
}
