"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

export function buildOptionsWithCurrent(
  baseOptions: readonly SelectOption[],
  value: string
): SelectOption[] {
  if (!value || baseOptions.some((option) => option.value === value)) {
    return [...baseOptions];
  }
  return [...baseOptions, { value, label: value }];
}

export function SimulatorFormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function SimulatorFormInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`dark-input h-11 w-full px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function SimulatorFormTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`dark-input min-h-[132px] w-full px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}
