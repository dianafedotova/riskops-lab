"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BrandedDatePickerProps = {
  disabled?: boolean;
  id: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
  iso: string;
  label: number;
};

const SHORT_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(value: string): Date | null {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(5, 7)) - 1;
  const day = Number(normalized.slice(8, 10));
  const parsed = new Date(year, month, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toFirstDayOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, delta: number) {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1);
}

function addYears(value: Date, delta: number) {
  return new Date(value.getFullYear() + delta, value.getMonth(), 1);
}

function formatTriggerLabel(value: string, placeholder: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return placeholder;
  return `${pad(parsed.getDate())}-${SHORT_MONTH_NAMES[parsed.getMonth()]}-${parsed.getFullYear()}`;
}

function formatMonthLabel(value: Date) {
  return `${LONG_MONTH_NAMES[value.getMonth()]} ${value.getFullYear()}`;
}

function buildCalendarCells(monthDate: Date): CalendarCell[] {
  const firstOfMonth = toFirstDayOfMonth(monthDate);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return {
      date: cellDate,
      inCurrentMonth: cellDate.getMonth() === firstOfMonth.getMonth(),
      iso: toIsoDate(cellDate),
      label: cellDate.getDate(),
    };
  });
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      {direction === "left" ? <path d="m12.5 4.75-5 5 5 5" /> : <path d="m7.5 4.75 5 5-5 5" />}
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
    >
      <rect x="3.25" y="4.5" width="13.5" height="12.25" rx="2.2" />
      <path d="M6.5 2.75v3.5M13.5 2.75v3.5M3.5 8h13" />
    </svg>
  );
}

function NavButton({
  ariaLabel,
  disabled,
  onClick,
  direction,
  double,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
  direction: "left" | "right";
  double?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="ui-btn ui-btn-secondary min-h-0 rounded-[0.65rem] px-1.5 py-1 text-[0.78rem] shadow-none disabled:opacity-50"
    >
      <span className="relative flex items-center justify-center">
        <ArrowIcon direction={direction} />
        {double ? (
          <span className={joinClasses("absolute", direction === "left" ? "left-[-4px]" : "right-[-4px]")}>
            <ArrowIcon direction={direction} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function BrandedDatePicker({
  disabled = false,
  id,
  onChange,
  placeholder = "Select date",
  value,
}: BrandedDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => getTodayDate(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => toFirstDayOfMonth(selectedDate ?? today));

  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const triggerLabel = useMemo(() => formatTriggerLabel(value, placeholder), [placeholder, value]);
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : "";

  useEffect(() => {
    if (!open) return;

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
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setVisibleMonth(toFirstDayOfMonth(selectedDate ?? today));
          setOpen((current) => !current);
        }}
        className={joinClasses(
          "dark-input flex h-11 w-full items-center justify-between gap-3 rounded-[0.95rem] px-4 text-left text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60",
          selectedDate ? "text-slate-800" : "text-slate-400",
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="shrink-0 text-[var(--brand-700)]">
          <CalendarIcon />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-[18.25rem] max-w-[min(18.25rem,calc(100vw-3rem))] overflow-hidden rounded-[1rem] border border-[rgb(191_208_216_/_0.94)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(241,247,249,0.992))] p-3 shadow-[0_22px_42px_rgba(18,31,46,0.16),inset_0_1px_0_rgba(255,255,255,0.82)]">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Pick a date</p>
              <p className="mt-0.5 text-[0.95rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--app-shell-bg)]">
                {formatMonthLabel(visibleMonth)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <NavButton
                ariaLabel="Previous year"
                disabled={disabled}
                onClick={() => setVisibleMonth((current) => addYears(current, -1))}
                direction="left"
                double
              />
              <NavButton
                ariaLabel="Previous month"
                disabled={disabled}
                onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                direction="left"
              />
              <NavButton
                ariaLabel="Next month"
                disabled={disabled}
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                direction="right"
              />
              <NavButton
                ariaLabel="Next year"
                disabled={disabled}
                onClick={() => setVisibleMonth((current) => addYears(current, 1))}
                direction="right"
                double
              />
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="flex h-6 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400"
              >
                {label}
              </div>
            ))}
            {calendarCells.map((cell) => {
              const isSelected = cell.iso === selectedIso;
              const isToday = cell.iso === todayIso;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso);
                    setVisibleMonth(toFirstDayOfMonth(cell.date));
                    setOpen(false);
                  }}
                  className={joinClasses(
                    "flex h-8 items-center justify-center rounded-[0.65rem] border text-[0.8125rem] font-semibold leading-none transition duration-150",
                    isSelected
                      ? "border-transparent bg-[linear-gradient(180deg,var(--brand-600),var(--brand-700))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(24,42,59,0.18)]"
                      : isToday
                        ? "border-[rgb(154_198_201_/_0.95)] bg-[linear-gradient(180deg,rgba(246,252,251,0.99),rgba(231,243,242,0.99))] text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_12px_rgba(18,31,46,0.06)] hover:border-[var(--brand-400)] hover:bg-[linear-gradient(180deg,rgba(239,249,247,1),rgba(223,239,238,1))]"
                        : cell.inCurrentMonth
                          ? "border-transparent bg-white/76 text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                          : "border-transparent bg-transparent text-slate-400 hover:border-slate-200/70 hover:bg-white/70",
                  )}
                >
                  {cell.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="ui-btn ui-btn-ghost min-h-0 rounded-[0.65rem] px-2 py-1 text-xs disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(todayIso);
                setVisibleMonth(toFirstDayOfMonth(today));
                setOpen(false);
              }}
              className="ui-btn ui-btn-secondary min-h-0 rounded-[0.65rem] px-2.5 py-1 text-xs shadow-none disabled:opacity-50"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
