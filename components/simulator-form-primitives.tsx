"use client";

import {
  brandedFieldLabelClassName,
  brandedFieldShellClassName,
  brandedInputClassName,
  brandedTextareaClassName,
  uiCx,
} from "@/shared/ui/control-styles";
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
    <label htmlFor={htmlFor} className={brandedFieldShellClassName}>
      <span className={brandedFieldLabelClassName}>{label}</span>
      {children}
    </label>
  );
}

export function SimulatorFormInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={uiCx(brandedInputClassName, props.className)}
    />
  );
}

export function SimulatorFormTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={uiCx(brandedTextareaClassName, props.className)}
    />
  );
}
