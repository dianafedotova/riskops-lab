"use client";

import { FilterSelect } from "@/components/filter-select";
import {
  buildOptionsWithCurrent,
  type SelectOption,
  SimulatorFormField,
  SimulatorFormInput,
} from "@/components/simulator-form-primitives";
import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import {
  createSimulatorUserEvent,
  deleteSimulatorUserEvent,
  USER_EVENT_TYPE_VALUES,
  updateSimulatorUserEvent,
} from "@/lib/services/simulator-user-events";
import { createClient } from "@/lib/supabase";
import type {
  AppUserRow,
  CreateSimulatorUserEventInput,
  UserEventRow,
} from "@/lib/types";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type SimulatorUserEventFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  userId: string;
  linkedDeviceOptions?: SelectOption[];
  linkedDeviceNameById?: Record<string, string>;
  initialValue?: Partial<UserEventRow> | null;
  submitLabel?: string;
  onSaved?: (userEvent: UserEventRow) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
};

type UserEventFormValues = {
  event_time: string;
  event_type: string;
  device_id: string;
  device_name: string;
  ip_address: string;
  country_code: string;
};

type DeviceSourceMode = "generate" | "linked";

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "Select event" },
  ...USER_EVENT_TYPE_VALUES.map((value) => ({
    value,
    label: value.replaceAll("_", " "),
  })),
] as const;

const COUNTRY_CODE_OPTIONS = [
  { value: "", label: "No country" },
  ...COUNTRY_OPTIONS.map((country) => ({
    value: country.code,
    label: `${country.code} · ${country.name}`,
  })),
] as const;

function toInputValue(value: string | null | undefined): string {
  return value ?? "";
}

function toDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function generateDeviceUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function buildUserEventFormValues(userEvent?: Partial<UserEventRow> | null): UserEventFormValues {
  return {
    event_time: toDateTimeLocalInput(userEvent?.event_time),
    event_type: toInputValue(userEvent?.event_type).toLowerCase(),
    device_id: toInputValue(userEvent?.device_id),
    device_name: toInputValue(userEvent?.device_name),
    ip_address: toInputValue(userEvent?.ip_address),
    country_code: toInputValue(userEvent?.country_code).toUpperCase(),
  };
}

export function SimulatorUserEventForm({
  viewer,
  mode,
  userId,
  linkedDeviceOptions = [],
  linkedDeviceNameById = {},
  initialValue,
  submitLabel,
  onSaved,
  onDeleted,
  onCancel,
}: SimulatorUserEventFormProps) {
  const [values, setValues] = useState<UserEventFormValues>(() => buildUserEventFormValues(initialValue));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceSourceMode, setDeviceSourceMode] = useState<DeviceSourceMode>("generate");

  const linkedDeviceOptionsWithCurrent = useMemo(
    () => buildOptionsWithCurrent(linkedDeviceOptions, values.device_id),
    [linkedDeviceOptions, values.device_id]
  );

  useEffect(() => {
    const currentDeviceId = buildUserEventFormValues(initialValue).device_id;
    const hasLinkedMatch =
      Boolean(currentDeviceId) && linkedDeviceOptions.some((option) => option.value === currentDeviceId);
    setDeviceSourceMode(hasLinkedMatch ? "linked" : "generate");
  }, [initialValue, linkedDeviceOptions]);

  useEffect(() => {
    setValues(buildUserEventFormValues(initialValue));
  }, [initialValue]);

  useEffect(() => {
    if (deviceSourceMode !== "generate") return;
    setValues((current) => {
      if (current.device_id.trim()) return current;
      return { ...current, device_id: generateDeviceUuid() };
    });
  }, [deviceSourceMode]);

  const eventTypeOptions = useMemo(
    () => buildOptionsWithCurrent(EVENT_TYPE_OPTIONS, values.event_type),
    [values.event_type]
  );
  const countryCodeOptions = useMemo(
    () => buildOptionsWithCurrent(COUNTRY_CODE_OPTIONS, values.country_code),
    [values.country_code]
  );

  const handleChange = (field: keyof UserEventFormValues, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleGenerateDeviceId = () => {
    setDeviceSourceMode("generate");
    setValues((current) => ({
      ...current,
      device_id: generateDeviceUuid(),
    }));
  };

  const handleUseLinkedDevice = (nextValue: string) => {
    setDeviceSourceMode("linked");
    setValues((current) => ({
      ...current,
      device_id: nextValue,
      device_name: linkedDeviceNameById[nextValue] || current.device_name || "Shared device",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: CreateSimulatorUserEventInput = {
      user_id: userId,
      event_time: values.event_time,
      event_type: values.event_type,
      device_id: toNullableString(values.device_id),
      device_name: toNullableString(values.device_name),
      ip_address: toNullableString(values.ip_address),
      country_code: toNullableString(values.country_code),
    };

    const supabase = createClient();
    const result =
      mode === "create"
        ? await createSimulatorUserEvent(supabase, viewer, payload)
        : await updateSimulatorUserEvent(supabase, viewer, {
            id: String(initialValue?.id ?? ""),
            ...payload,
          });

    if (result.error || !result.userEvent) {
      setError(result.error ?? "Could not save this activity event.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved?.(result.userEvent);
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !initialValue?.id) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const result = await deleteSimulatorUserEvent(supabase, viewer, String(initialValue.id));
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    setDeleting(false);
    onDeleted?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SimulatorFormField htmlFor="sim-user-event-time" label="Event Time">
          <SimulatorFormInput
            id="sim-user-event-time"
            type="datetime-local"
            value={values.event_time}
            onChange={(event) => handleChange("event_time", event.target.value)}
            disabled={saving || deleting}
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-user-event-type" label="Event Type">
          <FilterSelect
            id="sim-user-event-type"
            ariaLabel="User event type"
            disabled={saving || deleting}
            value={values.event_type}
            onChange={(nextValue) => handleChange("event_type", nextValue)}
            options={eventTypeOptions}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-user-event-device-id" label="Device ID">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateDeviceId}
                disabled={saving || deleting}
                className={`rounded-[0.95rem] border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  deviceSourceMode === "generate"
                    ? "border-[var(--brand-700)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Generate unique UUID
              </button>
              <button
                type="button"
                onClick={() => {
                  if (linkedDeviceOptionsWithCurrent.length === 0) return;
                  handleUseLinkedDevice(linkedDeviceOptionsWithCurrent[0]?.value ?? "");
                }}
                disabled={saving || deleting || linkedDeviceOptionsWithCurrent.length === 0}
                className={`rounded-[0.95rem] border px-3.5 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  deviceSourceMode === "linked"
                    ? "border-[var(--brand-700)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Use linked user device
              </button>
            </div>

            {deviceSourceMode === "linked" ? (
              <FilterSelect
                id="sim-user-event-device-id"
                ariaLabel="Linked device ID"
                disabled={saving || deleting || linkedDeviceOptionsWithCurrent.length === 0}
                value={values.device_id}
                onChange={handleUseLinkedDevice}
                options={
                  linkedDeviceOptionsWithCurrent.length > 0
                    ? linkedDeviceOptionsWithCurrent
                    : [{ value: "", label: "No linked user devices available" }]
                }
                className="h-11 rounded-[0.95rem]"
              />
            ) : (
              <div className="flex gap-2">
                <SimulatorFormInput
                  id="sim-user-event-device-id"
                  type="text"
                  value={values.device_id}
                  readOnly
                  disabled={saving || deleting}
                />
                <button
                  type="button"
                  onClick={handleGenerateDeviceId}
                  disabled={saving || deleting}
                  className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-user-event-device-name" label="Device Name">
          <SimulatorFormInput
            id="sim-user-event-device-name"
            type="text"
            value={values.device_name}
            onChange={(event) => handleChange("device_name", event.target.value)}
            placeholder="iPhone 15"
            disabled={saving || deleting}
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-user-event-ip-address" label="IP Address">
          <SimulatorFormInput
            id="sim-user-event-ip-address"
            type="text"
            value={values.ip_address}
            onChange={(event) => handleChange("ip_address", event.target.value)}
            placeholder="144.***.***.87"
            disabled={saving || deleting}
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-user-event-country" label="Country">
          <FilterSelect
            id="sim-user-event-country"
            ariaLabel="User event country"
            disabled={saving || deleting}
            value={values.country_code}
            onChange={(nextValue) => handleChange("country_code", nextValue)}
            options={countryCodeOptions}
            className="h-11 rounded-[0.95rem]"
          />
        </SimulatorFormField>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
        {error ? <p className="mr-auto text-sm font-medium text-rose-700">{error}</p> : null}
        {mode === "edit" && onDeleted ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete event"}
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || deleting}
            className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving || deleting}
          className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create event" : "Save event")}
        </button>
      </div>
    </form>
  );
}
