export function uiCx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const brandedCompactSelectTriggerClassName =
  "dark-input flex h-10 w-full items-center justify-between gap-3 rounded-[0.65rem] px-4 text-left text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20";

export const brandedFormControlTriggerClassName =
  "dark-input flex h-11 w-full items-center justify-between gap-3 rounded-[0.95rem] px-4 text-left text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)]";

export const brandedDisabledControlClassName = "cursor-not-allowed opacity-60";

export const brandedControlChevronClassName =
  "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150";

export const brandedControlMenuClassName =
  "absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-[0.7rem] border border-slate-200/95 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]";

export function brandedControlOptionClassName(selected: boolean) {
  return uiCx(
    "block w-full px-4 py-2 text-left text-sm font-medium transition-colors duration-150 outline-none",
    selected
      ? "bg-[var(--brand-700)] text-white"
      : "text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
  );
}

export const brandedDatePopoverClassName =
  "absolute left-0 top-full z-40 mt-1.5 w-[18.25rem] max-w-[min(18.25rem,calc(100vw-3rem))] overflow-hidden rounded-[1rem] border border-[rgb(191_208_216_/_0.94)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(241,247,249,0.992))] p-3 shadow-[0_22px_42px_rgba(18,31,46,0.16),inset_0_1px_0_rgba(255,255,255,0.82)]";

export const brandedFieldShellClassName = "flex flex-col gap-1.5";
export const brandedFieldLabelClassName =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";
export const brandedFieldHelpClassName = "text-xs leading-relaxed text-slate-500";
export const brandedFieldErrorClassName =
  "text-xs leading-relaxed text-[var(--danger-700)]";
export const brandedFieldSuccessClassName =
  "text-xs leading-relaxed text-[var(--brand-700)]";

export const brandedInputClassName =
  "dark-input h-11 w-full px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60";

export const brandedTextareaClassName =
  "dark-input min-h-[132px] w-full px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60";

export const brandedModalBackdropClassName =
  "fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]";

export function brandedModalPanelClassName(widthClassName: string) {
  return uiCx(
    "w-full overflow-hidden rounded-[1.2rem] border border-slate-200/95 bg-[linear-gradient(180deg,rgb(255_255_255/_0.99),rgb(248_250_252/_0.99))] shadow-[0_24px_56px_rgba(15,23,42,0.22)]",
    widthClassName
  );
}

export const brandedModalHeaderClassName = "border-b border-slate-200/80 px-5 py-4";
export const brandedModalBodyClassName = "max-h-[min(78vh,52rem)] overflow-y-auto px-5 py-5";
export const brandedModalFooterClassName = "border-t border-slate-200/80 px-5 py-4";
export const brandedModalCloseButtonClassName =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";
