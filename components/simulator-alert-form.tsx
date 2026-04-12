"use client";

import { FilterSelect } from "@/components/filter-select";
import { createSimulatorAlert, updateSimulatorAlert } from "@/lib/services/simulator-alerts";
import { createClient } from "@/lib/supabase";
import type { AlertRow, AppUserRow, UpdateSimulatorAlertInput, UserRow } from "@/lib/types";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useState } from "react";

type SimulatorAlertFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  initialValue?: Partial<AlertRow> | null;
  initialUser?: Pick<UserRow, "id" | "full_name" | "email"> | null;
  submitLabel?: string;
  onSaved?: (alert: AlertRow) => void;
  onCancel?: () => void;
};

type AlertFormValues = {
  user_id: string;
  alert_type: string;
  severity: string;
  status: string;
  rule_code: string;
  rule_name: string;
  description: string;
  alert_date: string;
  decision: string;
};

const ALERT_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "fraud", label: "Fraud" },
  { value: "aml", label: "AML" },
] as const;

const ALERT_SEVERITY_OPTIONS = [
  { value: "", label: "Select severity" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const ALERT_STATUS_OPTIONS = [
  { value: "", label: "Select status" },
  { value: "open", label: "Open" },
  { value: "monitoring", label: "Monitoring" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
] as const;

const ALERT_DECISION_OPTIONS = [
  { value: "", label: "No decision" },
  { value: "false_positive", label: "False positive" },
  { value: "true_positive", label: "True positive" },
  { value: "info_requested", label: "Info requested" },
  { value: "escalated", label: "Escalated" },
] as const;

function toInputValue(value: string | null | undefined): string {
  return value ?? "";
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildAlertFormValues(
  alert?: Partial<AlertRow> | null,
  user?: Pick<UserRow, "id" | "full_name" | "email"> | null
): AlertFormValues {
  return {
    user_id: toInputValue(alert?.user_id ?? user?.id),
    alert_type: toInputValue(alert?.alert_type ?? alert?.type).toLowerCase(),
    severity: toInputValue(alert?.severity).toLowerCase(),
    status: toInputValue(alert?.status).toLowerCase(),
    rule_code: toInputValue(alert?.rule_code),
    rule_name: toInputValue(alert?.rule_name),
    description: toInputValue(alert?.description),
    alert_date: toDateInput(alert?.alert_date),
    decision: toInputValue(alert?.decision),
  };
}

function Field({
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

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      data-amp-mask=""
      className={`dark-input h-11 w-full px-4 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      data-amp-mask=""
      className={`dark-input min-h-[132px] w-full px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-ring)] disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function SimulatorAlertForm({
  viewer,
  mode,
  initialValue,
  initialUser,
  submitLabel,
  onSaved,
  onCancel,
}: SimulatorAlertFormProps) {
  const [values, setValues] = useState<AlertFormValues>(() => buildAlertFormValues(initialValue, initialUser));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isCreateMode = mode === "create";

  useEffect(() => {
    setValues(buildAlertFormValues(initialValue, initialUser));
  }, [initialUser, initialValue]);

  const handleChange = (field: keyof AlertFormValues, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const payload: UpdateSimulatorAlertInput = {
      id: String(initialValue?.id ?? ""),
      user_id: values.user_id,
      alert_type: values.alert_type,
      severity: values.severity,
      status: isCreateMode ? "open" : values.status,
      rule_code: toNullableString(values.rule_code),
      rule_name: toNullableString(values.rule_name),
      description: toNullableString(values.description),
      alert_date: toNullableString(values.alert_date),
      decision: isCreateMode ? null : toNullableString(values.decision),
    };

    const result =
      mode === "create"
        ? await createSimulatorAlert(supabase, viewer, payload)
        : await updateSimulatorAlert(supabase, viewer, payload);

    if (result.error || !result.alert) {
      setError(result.error ?? "Could not save this alert.");
      setSaving(false);
      return;
    }

    setSuccessMessage(mode === "create" ? "Alert created." : "Alert updated.");
    setSaving(false);
    onSaved?.(result.alert);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field htmlFor="sim-alert-user-id" label="User ID">
            <Input
              id="sim-alert-user-id"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={values.user_id}
              onChange={(event) => handleChange("user_id", event.target.value)}
              placeholder="Paste an existing user ID"
              disabled={saving}
            />
          </Field>
        </div>
        <Field htmlFor="sim-alert-type" label="Alert Type">
          <FilterSelect
            id="sim-alert-type"
            ariaLabel="Alert type"
            disabled={saving}
            value={values.alert_type}
            onChange={(nextValue) => handleChange("alert_type", nextValue)}
            options={[...ALERT_TYPE_OPTIONS]}
            className="h-11 rounded-[0.95rem]"
          />
        </Field>
        <Field htmlFor="sim-alert-severity" label="Severity">
          <FilterSelect
            id="sim-alert-severity"
            ariaLabel="Alert severity"
            disabled={saving}
            value={values.severity}
            onChange={(nextValue) => handleChange("severity", nextValue)}
            options={[...ALERT_SEVERITY_OPTIONS]}
            className="h-11 rounded-[0.95rem]"
          />
        </Field>
        {!isCreateMode ? (
          <Field htmlFor="sim-alert-status" label="Status">
            <FilterSelect
              id="sim-alert-status"
              ariaLabel="Alert status"
              disabled={saving}
              value={values.status}
              onChange={(nextValue) => handleChange("status", nextValue)}
              options={[...ALERT_STATUS_OPTIONS]}
              className="h-11 rounded-[0.95rem]"
            />
          </Field>
        ) : null}
        {!isCreateMode ? (
          <Field htmlFor="sim-alert-decision" label="Decision">
            <FilterSelect
              id="sim-alert-decision"
              ariaLabel="Alert decision"
              disabled={saving}
              value={values.decision}
              onChange={(nextValue) => handleChange("decision", nextValue)}
              options={[...ALERT_DECISION_OPTIONS]}
              className="h-11 rounded-[0.95rem]"
            />
          </Field>
        ) : null}
        <Field htmlFor="sim-alert-rule-code" label="Rule Code">
          <Input
            id="sim-alert-rule-code"
            type="text"
            value={values.rule_code}
            onChange={(event) => handleChange("rule_code", event.target.value)}
            placeholder="AML_001"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-alert-rule-name" label="Rule Name">
          <Input
            id="sim-alert-rule-name"
            type="text"
            value={values.rule_name}
            onChange={(event) => handleChange("rule_name", event.target.value)}
            placeholder="Velocity spike"
            disabled={saving}
          />
        </Field>
        <Field htmlFor="sim-alert-date" label="Alert Date">
          <Input
            id="sim-alert-date"
            type="date"
            value={values.alert_date}
            onChange={(event) => handleChange("alert_date", event.target.value)}
            disabled={saving}
          />
        </Field>
      </div>

      <Field htmlFor="sim-alert-description" label="Description">
        <Textarea
          id="sim-alert-description"
          value={values.description}
          onChange={(event) => handleChange("description", event.target.value)}
          disabled={saving}
          placeholder="Explain why this alert was raised"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        {error ? <p className="mr-auto text-sm font-medium text-rose-700">{error}</p> : null}
        {!error && successMessage ? <p className="mr-auto text-sm font-medium text-emerald-700">{successMessage}</p> : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create alert" : "Save alert")}
        </button>
      </div>
    </form>
  );
}
