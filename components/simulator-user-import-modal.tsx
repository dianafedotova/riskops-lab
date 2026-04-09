"use client";

import { CsvFormatDisclosure } from "@/components/csv-format-disclosure";
import { ModalShell } from "@/components/modal-shell";
import {
  importSimulatorUsersCsv,
  parseUsersCsv,
  validateUsersCsv,
} from "@/lib/services/simulator-users";
import { createClient } from "@/lib/supabase";
import type { AppUserRow, CreateSimulatorUserInput, ImportedSimulatorUserRow } from "@/lib/types";
import { useState } from "react";

const USER_REQUIRED_HEADERS = ["email", "full_name"] as const;
const USER_OPTIONAL_HEADERS = [
  "first_name",
  "last_name",
  "country_code",
  "country_name",
  "tier",
  "status",
  "risk_level",
  "registration_date",
  "phone",
  "nationality",
  "date_of_birth",
  "address_text",
  "proof_of_identity",
  "proof_of_address",
  "source_of_funds_docs",
  "occupation",
  "employment_status",
  "annual_income_min_usd",
  "annual_income_max_usd",
  "primary_source_of_funds",
  "selfie_path",
] as const;

const USER_MINIMAL_TEMPLATE = `email,full_name
casey.doe@example.com,Casey Doe`;

const USER_FULL_TEMPLATE = `email,full_name,first_name,last_name,country_code,country_name,tier,status,risk_level,registration_date,phone,nationality,date_of_birth,address_text,proof_of_identity,proof_of_address,source_of_funds_docs,occupation,employment_status,annual_income_min_usd,annual_income_max_usd,primary_source_of_funds,selfie_path
casey.doe@example.com,Casey Doe,Casey,Doe,GB,United Kingdom,Tier 3,active,high,2026-04-07,+44 ******12,British,1996-08-14,"221B Baker Street, London",Passport,Utility bill,Bank statement,Analyst,Employed,65000,90000,Salary,selfies/casey-doe.png`;

type SimulatorUserImportModalProps = {
  viewer: AppUserRow | null;
  onClose: () => void;
  onImported: (created: ImportedSimulatorUserRow[]) => void;
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

export function SimulatorUserImportModal({
  viewer,
  onClose,
  onImported,
}: SimulatorUserImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<CreateSimulatorUserInput[]>([]);
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
      setErrors(["Choose a users.csv file first."]);
      setValidatedRows([]);
      setValidationCount(0);
      return;
    }

    setBusyState("validating");
    setErrors([]);
    setValidatedRows([]);
    setValidationCount(0);

    const text = await file.text();
    const parsed = parseUsersCsv(text);
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      setBusyState("idle");
      return;
    }

    const validated = validateUsersCsv(parsed.rows);
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
    const result = await importSimulatorUsersCsv(supabase, viewer, validatedRows);

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
      title="Import Users CSV"
      description="Validate the whole file first. IDs are generated automatically during import."
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
            {busyState === "importing" ? "Importing…" : "Import users"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[1rem] border border-slate-200/90 bg-slate-50/85 p-4">
          <label htmlFor="users-csv-file" className="mb-2 block text-sm font-semibold text-slate-800">
            Choose `users.csv`
          </label>
          <input
            id="users-csv-file"
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
          fileLabel="Users CSV"
          requiredHeaders={[...USER_REQUIRED_HEADERS]}
          optionalHeaders={[...USER_OPTIONAL_HEADERS]}
          minimalTemplate={USER_MINIMAL_TEMPLATE}
          fullTemplate={USER_FULL_TEMPLATE}
          notes={[
            "The file is create-only in v1. Existing rows are not updated.",
            "Keep `id` out of the file. IDs are generated automatically during import.",
            "If you include `tier`, use `Tier 0`, `Tier 1`, `Tier 2`, `Tier 3`, or `Tier 4`.",
            "If you include `first_name` and `last_name`, keep `full_name` too so the row passes validation.",
          ]}
        />

        {errors.length > 0 ? <ErrorList errors={errors} /> : null}

        {validationCount > 0 && errors.length === 0 ? (
          <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">Ready to import</p>
            <p className="mt-1 text-sm text-emerald-800">
              {validationCount} user{validationCount === 1 ? "" : "s"} validated. Import will create all rows in one batch.
            </p>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
