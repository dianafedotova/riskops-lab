"use client";

import { CsvFormatDisclosure } from "@/components/csv-format-disclosure";
import { ModalShell } from "@/components/modal-shell";
import {
  importSimulatorAlertsCsv,
  parseAlertsCsv,
  validateAlertsCsv,
} from "@/lib/services/simulator-alerts";
import { createClient } from "@/lib/supabase";
import type { AppUserRow, CreateSimulatorAlertInput, ImportedSimulatorAlertRow } from "@/lib/types";
import { useState } from "react";

const ALERT_REQUIRED_HEADERS = ["user_id", "alert_type", "severity", "status"] as const;
const ALERT_OPTIONAL_HEADERS = [
  "rule_code",
  "rule_name",
  "description",
  "created_at",
  "alert_date",
  "decision",
] as const;

const ALERT_MINIMAL_TEMPLATE = `user_id,alert_type,severity,status
6f2d7bf4-8a7c-4cc8-b37f-6a067c7d8e89,fraud,high,open`;

const ALERT_FULL_TEMPLATE = `user_id,alert_type,severity,status,rule_code,rule_name,description,created_at,alert_date,decision
6f2d7bf4-8a7c-4cc8-b37f-6a067c7d8e89,fraud,high,open,FRAUD_017,Velocity spike,"Card-not-present spend velocity breached the threshold",2026-04-07T09:15:00Z,2026-04-07T09:15:00Z,escalated`;

type SimulatorAlertImportModalProps = {
  viewer: AppUserRow | null;
  onClose: () => void;
  onImported: (created: ImportedSimulatorAlertRow[]) => void;
};

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-[1rem] border border-rose-200 bg-rose-50/90 px-4 py-3">
      <p className="text-sm font-semibold text-rose-900">Import blocked</p>
      <ul className="mt-2 space-y-1 text-sm text-rose-800">
        {errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function SimulatorAlertImportModal({
  viewer,
  onClose,
  onImported,
}: SimulatorAlertImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<CreateSimulatorAlertInput[]>([]);
  const [validationCount, setValidationCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [busyState, setBusyState] = useState<"idle" | "validating" | "importing">("idle");

  const resetValidation = () => {
    setValidatedRows([]);
    setValidationCount(0);
    setErrors([]);
  };

  const validateFile = async () => {
    if (!file) {
      setErrors(["Choose an alerts.csv file first."]);
      setValidatedRows([]);
      setValidationCount(0);
      return;
    }

    setBusyState("validating");
    setErrors([]);
    setValidatedRows([]);
    setValidationCount(0);

    const text = await file.text();
    const parsed = parseAlertsCsv(text);
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      setBusyState("idle");
      return;
    }

    const supabase = createClient();
    const validated = await validateAlertsCsv(supabase, viewer, parsed.rows);
    if (validated.errors.length > 0) {
      setErrors(validated.errors);
      setBusyState("idle");
      return;
    }

    setValidatedRows(validated.rows);
    setValidationCount(validated.rows.length);
    setBusyState("idle");
  };

  const importFile = async () => {
    if (validatedRows.length === 0) {
      setErrors(["Validate the file before importing."]);
      return;
    }

    setBusyState("importing");
    setErrors([]);
    const supabase = createClient();
    const result = await importSimulatorAlertsCsv(supabase, viewer, validatedRows);

    if (result.error) {
      setErrors([result.error]);
      setBusyState("idle");
      return;
    }

    onImported(result.created);
    setBusyState("idle");
    onClose();
  };

  return (
    <ModalShell
      title="Import Alerts CSV"
      description="Validate the whole file first. Each row must reference an existing user_id."
      onClose={onClose}
      closeDisabled={busyState !== "idle"}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busyState !== "idle"}
            className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void validateFile()}
            disabled={!file || busyState !== "idle"}
            className="ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
          >
            {busyState === "validating" ? "Validating…" : "Validate"}
          </button>
          <button
            type="button"
            onClick={() => void importFile()}
            disabled={validatedRows.length === 0 || busyState !== "idle"}
            className="ui-btn ui-btn-primary min-h-0 rounded-[0.95rem] px-4 py-2 text-sm disabled:opacity-50"
          >
            {busyState === "importing" ? "Importing…" : "Import alerts"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[1rem] border border-slate-200/90 bg-slate-50/85 p-4">
          <label htmlFor="alerts-csv-file" className="mb-2 block text-sm font-semibold text-slate-800">
            Choose `alerts.csv`
          </label>
          <input
            id="alerts-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              resetValidation();
            }}
            disabled={busyState !== "idle"}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-[0.85rem] file:border-0 file:bg-[var(--app-shell-bg)] file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-600)]"
          />
        </div>

        <CsvFormatDisclosure
          fileLabel="Alerts CSV"
          requiredHeaders={[...ALERT_REQUIRED_HEADERS]}
          optionalHeaders={[...ALERT_OPTIONAL_HEADERS]}
          minimalTemplate={ALERT_MINIMAL_TEMPLATE}
          fullTemplate={ALERT_FULL_TEMPLATE}
          notes={[
            "Import alerts only after the referenced users already exist.",
            "Every `user_id` must already exist and be visible in your organization scope.",
            "Keep `id` out of the file. Alert `id` is derived from `rule_code`, while `internal_id` stays a UUID.",
          ]}
        />

        {errors.length > 0 ? <ErrorList errors={errors} /> : null}

        {validationCount > 0 && errors.length === 0 ? (
          <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">Ready to import</p>
            <p className="mt-1 text-sm text-emerald-800">
              {validationCount} alert{validationCount === 1 ? "" : "s"} validated. Import will create all rows in one batch.
            </p>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
