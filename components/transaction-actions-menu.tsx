"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_MIN_WIDTH_PX = 12 * 16;
const MENU_GAP_PX = 8;
const VIEWPORT_PAD_PX = 8;
const MENU_ESTIMATED_HEIGHT_PX = 176;

type TransactionActionsMenuProps = {
  onView: () => void;
  onDuplicate?: (() => void) | null;
  onEdit?: (() => void) | null;
};

export function TransactionActionsMenu({ onView, onDuplicate, onEdit }: TransactionActionsMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    let left = rect.right - MENU_MIN_WIDTH_PX;
    left = Math.max(VIEWPORT_PAD_PX, Math.min(left, window.innerWidth - MENU_MIN_WIDTH_PX - VIEWPORT_PAD_PX));

    const shouldOpenUpward = rect.bottom + MENU_GAP_PX + MENU_ESTIMATED_HEIGHT_PX > window.innerHeight - VIEWPORT_PAD_PX;
    const top = shouldOpenUpward
      ? Math.max(VIEWPORT_PAD_PX, rect.top - MENU_GAP_PX - MENU_ESTIMATED_HEIGHT_PX)
      : rect.bottom + MENU_GAP_PX;

    setMenuCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-[0.85rem] border border-[rgb(188_209_206_/_0.9)] bg-[linear-gradient(180deg,rgba(247,251,250,0.98),rgba(233,241,240,0.98))] text-[11px] font-semibold tracking-[0.04em] text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_5px_12px_rgba(148,163,184,0.10)] transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:-translate-y-[1px] hover:border-[rgb(154_191_185_/_0.95)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,246,244,0.98))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_16px_rgba(148,163,184,0.14)]"
        title="Transaction actions"
        aria-label="Transaction actions"
      >
        <span className="text-sm leading-none">...</span>
      </button>

      {open && menuCoords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Transaction actions"
              className="fixed z-[10000] min-w-[12rem] overflow-hidden rounded-[1rem] border border-slate-200/95 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
              style={{ top: menuCoords.top, left: menuCoords.left }}
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#5e8d9c] hover:text-white focus-visible:bg-[#5e8d9c] focus-visible:text-white focus-visible:outline-none"
                onClick={() => {
                  setOpen(false);
                  onView();
                }}
              >
                View details
              </button>
              {onDuplicate ? (
                <>
                  <div className="h-px w-full bg-slate-200" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[rgb(56_120_128)] hover:text-white focus-visible:bg-[rgb(56_120_128)] focus-visible:text-white focus-visible:outline-none"
                    onClick={() => {
                      setOpen(false);
                      onDuplicate();
                    }}
                  >
                    Duplicate
                  </button>
                </>
              ) : null}
              {onEdit ? (
                <>
                  <div className="h-px w-full bg-slate-200" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[var(--brand-700)] hover:text-white focus-visible:bg-[var(--brand-700)] focus-visible:text-white focus-visible:outline-none"
                    onClick={() => {
                      setOpen(false);
                      onEdit();
                    }}
                  >
                    Edit
                  </button>
                </>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
