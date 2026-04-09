"use client";

import {
  SimulatorFormField,
  SimulatorFormInput,
  SimulatorFormTextarea,
} from "@/components/simulator-form-primitives";
import {
  createUserAccountLink,
  deleteUserAccountLink,
  updateUserAccountLink,
} from "@/lib/services/user-account-links";
import { createClient } from "@/lib/supabase";
import type { AppUserRow, UserAccountLinkRow } from "@/lib/types";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type UserAccountLinkFormProps = {
  viewer: AppUserRow | null;
  mode: "create" | "edit";
  currentUserId: string;
  initialValue?: Partial<UserAccountLinkRow> | null;
  submitLabel?: string;
  onSaved?: (link: UserAccountLinkRow) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
};

type UserAccountLinkFormValues = {
  linked_user_id: string;
  link_reason: string;
};

function toInputValue(value: string | null | undefined): string {
  return value ?? "";
}

function buildUserAccountLinkFormValues(
  currentUserId: string,
  link?: Partial<UserAccountLinkRow> | null
): UserAccountLinkFormValues {
  const linkedUserId =
    link?.user_id && link?.linked_user_id
      ? (link.user_id === currentUserId ? link.linked_user_id : link.user_id)
      : "";

  return {
    linked_user_id: toInputValue(linkedUserId),
    link_reason: toInputValue(link?.link_reason),
  };
}

export function UserAccountLinkForm({
  viewer,
  mode,
  currentUserId,
  initialValue,
  submitLabel,
  onSaved,
  onDeleted,
  onCancel,
}: UserAccountLinkFormProps) {
  const [values, setValues] = useState<UserAccountLinkFormValues>(() =>
    buildUserAccountLinkFormValues(currentUserId, initialValue)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(buildUserAccountLinkFormValues(currentUserId, initialValue));
  }, [currentUserId, initialValue]);

  const handleChange = (field: keyof UserAccountLinkFormValues, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      user_id: currentUserId,
      linked_user_id: values.linked_user_id,
      link_reason: values.link_reason,
    };

    const result =
      mode === "create"
        ? await createUserAccountLink(supabase, viewer, payload)
        : await updateUserAccountLink(supabase, viewer, {
            id: String(initialValue?.id ?? ""),
            ...payload,
          });

    if (result.error || !result.link) {
      setError(result.error ?? "Could not save this account link.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved?.(result.link);
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !initialValue?.id) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const result = await deleteUserAccountLink(supabase, viewer, String(initialValue.id));
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
      <div className="grid gap-4">
        <SimulatorFormField htmlFor="sim-link-current-user" label="Current User ID">
          <SimulatorFormInput id="sim-link-current-user" type="text" value={currentUserId} disabled />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-link-linked-user" label="Linked User ID">
          <SimulatorFormInput
            id="sim-link-linked-user"
            type="text"
            value={values.linked_user_id}
            onChange={(event) => handleChange("linked_user_id", event.target.value)}
            placeholder="Paste the related user ID"
            disabled={saving || deleting}
          />
        </SimulatorFormField>
        <SimulatorFormField htmlFor="sim-link-reason" label="Link Reason">
          <SimulatorFormTextarea
            id="sim-link-reason"
            value={values.link_reason}
            onChange={(event) => handleChange("link_reason", event.target.value)}
            placeholder="Shared device, shared IP, same beneficiary, manual analyst link..."
            disabled={saving || deleting}
            className="min-h-[120px]"
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
            {deleting ? "Deleting…" : "Delete link"}
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
          {saving ? "Saving…" : submitLabel ?? (mode === "create" ? "Create link" : "Save link")}
        </button>
      </div>
    </form>
  );
}
