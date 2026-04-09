"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  menuClassName?: string;
  onChange: (value: string) => void;
  /** Full list for resolving the current `value` label (may include values not shown in the menu). */
  options: FilterSelectOption[];
  /** Subset shown in the dropdown; defaults to `options`. */
  menuOptions?: FilterSelectOption[];
  value: string;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function FilterSelect({
  ariaLabel,
  className,
  disabled = false,
  id,
  menuClassName,
  onChange,
  options,
  menuOptions: menuOptionsProp,
  value,
}: FilterSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);

  const menuOpts = menuOptionsProp ?? options;
  const isOpen = open && !disabled;

  const selectedOption = useMemo((): FilterSelectOption => {
    const match = options.find((option) => option.value === value);
    if (match) return match;
    if (options.length > 0) return options[0]!;
    return { value, label: value ? String(value) : "—" };
  }, [options, value]);

  const menuSelectedIndex = useMemo(() => {
    const idx = menuOpts.findIndex((option) => option.value === value);
    return idx >= 0 ? idx : 0;
  }, [menuOpts, value]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[menuSelectedIndex]?.focus();
  }, [isOpen, menuSelectedIndex]);

  const openAndFocus = (index: number) => {
    setOpen(true);
    queueMicrotask(() => {
      optionRefs.current[index]?.focus();
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus(menuSelectedIndex);
          }
        }}
        className={joinClasses(
          "dark-input flex h-10 w-full items-center justify-between gap-3 rounded-[0.65rem] px-4 text-left text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <span className="truncate">{selectedOption.label}</span>
          <svg
            className={joinClasses(
              "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150",
            isOpen && "rotate-180",
          )}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5.75 7.75 10 12l4.25-4.25" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className={joinClasses(
            "absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-[0.7rem] border border-slate-200/95 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]",
            menuClassName,
          )}
        >
          <ul id={listboxId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto">
            {menuOpts.map((option, index) => {
              const selected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={selected}>
                  <button
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        optionRefs.current[(index + 1) % menuOpts.length]?.focus();
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        optionRefs.current[(index - 1 + menuOpts.length) % menuOpts.length]?.focus();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setOpen(false);
                      }
                    }}
                    className={joinClasses(
                      "block w-full px-4 py-2 text-left text-sm font-medium transition-colors duration-150 outline-none",
                      selected
                        ? "bg-[var(--brand-700)] text-white"
                        : "text-slate-700 hover:bg-slate-100 focus:bg-slate-100",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
