"use client";

import { useCallback, useState } from "react";

type CsvFormatDisclosureProps = {
  fileLabel: string;
  requiredHeaders: string[];
  optionalHeaders?: string[];
  minimalTemplate: string;
  fullTemplate?: string;
  notes?: string[];
};

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CopyIconInBlock({
  text,
  ariaLabel,
  variant,
}: {
  text: string;
  ariaLabel: string;
  variant: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return;
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  const surface =
    variant === "dark"
      ? "border-white/15 bg-slate-800/95 text-slate-200 hover:border-white/25 hover:bg-slate-700/95"
      : "border-slate-200/95 bg-white/95 text-slate-600 shadow-sm hover:border-slate-300 hover:bg-white";

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      title={copied ? "Copied" : "Copy"}
      aria-label={copied ? "Copied" : ariaLabel}
      className={`absolute right-1.5 top-1.5 z-[1] rounded-[0.4rem] border p-0.5 transition ${surface}`}
    >
      {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
    </button>
  );
}

export function CsvFormatDisclosure({
  fileLabel,
  requiredHeaders,
  optionalHeaders = [],
  minimalTemplate,
  fullTemplate,
  notes = [],
}: CsvFormatDisclosureProps) {
  const requiredLine = requiredHeaders.join(", ");
  const optionalLine = optionalHeaders.join(", ");

  return (
    <details className="rounded-[1rem] border border-slate-200/90 bg-white/90 px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3.5 6.25 8 10.75l4.5-4.5" />
          </svg>
          View required headers and CSV template
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-t border-slate-200/80 pt-4">
        <div className="space-y-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Required Headers</p>
            <div className="relative mt-1 rounded-[0.85rem] border border-slate-200/80 bg-slate-50/80">
              <CopyIconInBlock text={requiredLine} ariaLabel={`Copy required ${fileLabel} headers`} variant="light" />
              <p className="px-3 py-2 pr-9 font-mono text-xs leading-relaxed text-slate-700">{requiredLine}</p>
            </div>
          </div>

          {optionalHeaders.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Optional Headers</p>
              <div className="relative mt-1 rounded-[0.85rem] border border-slate-200/80 bg-slate-50/80">
                <CopyIconInBlock text={optionalLine} ariaLabel={`Copy optional ${fileLabel} headers`} variant="light" />
                <p className="px-3 py-2 pr-9 font-mono text-xs leading-relaxed text-slate-700">{optionalLine}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className={`grid gap-3 ${fullTemplate ? "xl:grid-cols-2" : ""}`}>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Minimal {fileLabel} Template
            </p>
            <div className="relative">
              <CopyIconInBlock text={minimalTemplate} ariaLabel={`Copy minimal ${fileLabel} CSV template`} variant="dark" />
              <pre className="overflow-x-auto rounded-[0.95rem] border border-slate-200/90 bg-slate-950 px-3 py-3 pr-9 text-xs leading-6 text-slate-100">
                <code>{minimalTemplate}</code>
              </pre>
            </div>
          </div>

          {fullTemplate ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Full {fileLabel} Template
              </p>
              <div className="relative">
                <CopyIconInBlock text={fullTemplate} ariaLabel={`Copy full ${fileLabel} CSV template`} variant="dark" />
                <pre className="overflow-x-auto rounded-[0.95rem] border border-slate-200/90 bg-slate-950 px-3 py-3 pr-9 text-xs leading-6 text-slate-100">
                  <code>{fullTemplate}</code>
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {notes.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
