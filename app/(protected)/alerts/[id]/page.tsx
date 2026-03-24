"use client";

import { AlertDetailSkeleton } from "@/components/alert-detail-skeleton";
import { QueryErrorBanner } from "@/components/query-error";
import { SimulatorCommentsPanel } from "@/components/simulator-comments-panel";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { formatDate, formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import { createClient } from "@/lib/supabase";
import type { AlertNoteRow, AlertRow } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Decision = "false_positive" | "true_positive" | "info_requested" | "escalated" | null;
type AlertWithRuleCode = AlertRow & { rule_code?: string | null; rule_name?: string | null };
type KeyInfo = {
  annualIncomeMinUsd: number | null;
  annualIncomeMaxUsd: number | null;
  spend30dUsd: number | null;
};

function getStatus(decision: Decision): string {
  if (!decision) return "Open";
  if (decision === "false_positive" || decision === "true_positive") return "Resolved";
  return "In Review";
}

function getDecisionLabel(decision: Decision): string {
  if (!decision) return "Not set";
  if (decision === "false_positive") return "False Positive";
  if (decision === "true_positive") return "True Positive";
  if (decision === "info_requested") return "Info requested";
  return "Escalated";
}

function formatRuleDisplay(ruleCode: string | null | undefined, ruleName: string | null | undefined): string {
  const code = (ruleCode ?? "").trim();
  const name = (ruleName ?? "").trim();
  if (!code && !name) return "—";
  if (code && name) return `${code}: ${name}`;
  return code || name;
}

function formatUsd(value: number | null, opts?: { fractionDigits?: number }): string {
  if (value == null) return "—";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: opts?.fractionDigits ?? 0,
    maximumFractionDigits: opts?.fractionDigits ?? 0,
  })} USD`;
}

function formatSeverityLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "Unknown";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatStatusLabel(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const statusBadgeClass = (status: string | null) => {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "open") return "bg-sky-100 text-sky-700";
  if (s === "monitoring") return "bg-amber-100 text-amber-700";
  if (s === "escalated") return "bg-violet-100 text-violet-700";
  if (s === "closed") return "bg-emerald-100 text-emerald-700";
  if (s === "resolved") return "bg-emerald-100 text-emerald-700";
  if (s === "in review") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
};

const severityBadgeClass = (severity: string | null) => {
  const s = (severity ?? "").trim().toLowerCase();
  if (s === "critical") return "bg-rose-200 text-rose-800";
  if (s === "high") return "bg-rose-100 text-rose-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  if (s === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
};

const typeBadgeClass = (type: string | null) => {
  const s = (type ?? "").trim().toLowerCase();
  if (s === "aml") return "bg-indigo-100 text-indigo-700";
  if (s === "fraud") return "bg-cyan-100 text-cyan-700";
  return "bg-slate-200 text-slate-700";
};

const decisionBadgeClass = (decision: Decision) => {
  if (!decision) return "bg-slate-200 text-slate-600";
  if (decision === "false_positive") return "bg-emerald-100 text-emerald-700";
  if (decision === "true_positive") return "bg-rose-100 text-rose-700";
  if (decision === "info_requested") return "bg-slate-100 text-slate-600";
  if (decision === "escalated") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-600";
};

export default function AlertDetailsPage() {
  const supabase = createClient();
  const { appUser } = useCurrentUser();
  const params = useParams<{ id: string }>();
  const alertId = params?.id ?? "a-unknown";
  const [decision, setDecision] = useState<Decision>(null);
  const [predefinedNotes, setPredefinedNotes] = useState<AlertNoteRow[]>([]);

  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [otherAlerts, setOtherAlerts] = useState<AlertRow[]>([]);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: row, error: qError } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", alertId)
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setAlert(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      if (!row) {
        setAlert(null);
        setOtherAlerts([]);
        setLoading(false);
        return;
      }
      const a = row as AlertRow;
      setAlert(a);
      setKeyInfo(null);
      const uid = a.user_id;
      const { data: notesData } = await supabase
        .from("alerts_note")
        .select("id, alert_id, note_text, created_at, created_by")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: false });
      if (!cancelled) setPredefinedNotes((notesData as AlertNoteRow[]) ?? []);
      const ruleCode = (row as AlertWithRuleCode).rule_code?.trim() ?? "";
      if (uid) {
        const { data: others } = await supabase
          .from("alerts")
          .select("*")
          .eq("user_id", uid)
          .neq("id", alertId)
          .order("created_at", { ascending: false });
        if (!cancelled) setOtherAlerts((others as AlertRow[]) ?? []);

        if (ruleCode === "AML_001") {
          try {
            const { data: userRow } = await supabase
              .from("users")
              .select("annual_income_min_usd, annual_income_max_usd")
              .eq("id", uid)
              .maybeSingle();

            const alertDate = new Date(a.created_at);
            const startDate = new Date(alertDate);
            startDate.setDate(startDate.getDate() - 30);

            let spend30dUsd: number | null = null;
            if (!Number.isNaN(alertDate.getTime())) {
              const dateCol = "transaction_date";
              const { data: txRows } = await supabase
                .from("transactions")
                .select("amount, amount_usd")
                .eq("user_id", uid)
                .eq("direction", "outbound")
                .gte(dateCol, startDate.toISOString().slice(0, 10))
                .lte(dateCol, alertDate.toISOString().slice(0, 10));

              const rows = (txRows ?? []) as { amount?: number | null; amount_usd?: number | null }[];
              spend30dUsd = rows.reduce((sum, tx) => sum + (tx.amount_usd ?? tx.amount ?? 0), 0);
            }

            if (!cancelled) {
              const income = (userRow ?? null) as
                | { annual_income_min_usd: number | null; annual_income_max_usd: number | null }
                | null;
              setKeyInfo({
                annualIncomeMinUsd: income?.annual_income_min_usd ?? null,
                annualIncomeMaxUsd: income?.annual_income_max_usd ?? null,
                spend30dUsd,
              });
            }
          } catch {
            if (!cancelled) setKeyInfo(null);
          }
        }
      } else {
        setOtherAlerts([]);
        setKeyInfo(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [alertId, reloadTick]);

  const ruleCode = ((alert as AlertWithRuleCode | null)?.rule_code ?? "").trim();
  const ruleName = ((alert as AlertWithRuleCode | null)?.rule_name ?? "").trim();
  const displayStatus = decision != null ? getStatus(decision) : (alert?.status ?? "Open");
  const declaredIncomeLabel =
    keyInfo?.annualIncomeMinUsd != null || keyInfo?.annualIncomeMaxUsd != null
      ? `${keyInfo?.annualIncomeMinUsd != null ? keyInfo.annualIncomeMinUsd.toLocaleString("en-US") : "—"} - ${
          keyInfo?.annualIncomeMaxUsd != null ? keyInfo.annualIncomeMaxUsd.toLocaleString("en-US") : "—"
        } USD`
      : "—";

  const differencePct =
    keyInfo?.annualIncomeMaxUsd != null &&
    keyInfo?.spend30dUsd != null &&
    keyInfo.annualIncomeMaxUsd > 0
      ? Math.round(((keyInfo.spend30dUsd - keyInfo.annualIncomeMaxUsd) / keyInfo.annualIncomeMaxUsd) * 100)
      : null;
  const differenceLabel = differencePct != null ? (differencePct >= 0 ? `+${differencePct}%` : `${differencePct}%`) : "—";

  if (loading) {
    return <AlertDetailSkeleton />;
  }

  if (error) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <QueryErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
          hint={
            <p className="text-xs text-rose-800/90">
              Check <code className="rounded bg-rose-100 px-1 font-mono">.env.local</code> and Supabase project access.
            </p>
          }
        />
      </section>
    );
  }

  if (!alert) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-slate-600">
          Alert not found. Run <code className="font-mono text-xs">supabase/schema.sql</code> or check the ID.
        </p>
        <Link href="/alerts" className="text-sm text-[#264B5A] hover:underline">
          Back to Alerts
        </Link>
      </section>
    );
  }

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#264B5A]">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/alerts" className="hover:text-[#264B5A]">
          Alerts
        </Link>{" "}
        / <span className="text-slate-700 font-mono">{alertId}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4 sm:p-5">
            <h2 className="heading-section mb-3">Alert Information</h2>
            <div className="space-y-3">
              <p className="font-mono text-sm text-slate-600">
                {alert.id} · {formatDateTime(alert.created_at)}
                {alert.user_id ? (
                  <>
                    {" · "}
                    <Link href={`/users/${alert.user_id}`} className="text-[#264B5A] hover:underline">
                      {alert.user_id}
                    </Link>
                  </>
                ) : null}
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                {formatRuleDisplay(ruleCode, ruleName)}
              </h3>

              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Status:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(displayStatus)}`}>
                    {formatStatusLabel(displayStatus)}
                  </span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Type:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(alert?.alert_type ?? alert?.type ?? null)}`}>
                    {formatStatusLabel(alert?.alert_type ?? alert?.type ?? "")}
                  </span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Severity:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(alert?.severity ?? null)}`}>
                    {formatSeverityLabel(alert?.severity)}
                  </span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm lg:flex-col lg:items-start lg:gap-x-0 lg:gap-y-1">
                  <span className="font-medium">Decision:</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${decisionBadgeClass(decision)}`}>
                    {getDecisionLabel(decision)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4">
            <h2 className="heading-section mb-3">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{alert.description ?? ""}</p>
          </div>

          {ruleCode === "AML_001" && (
            <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4">
              <h2 className="heading-section mb-3">Key Info</h2>
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm sm:flex-col sm:gap-0.5 sm:gap-x-0">
                  <span className="font-medium">Declared income:</span>
                  <span>{declaredIncomeLabel}</span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm sm:flex-col sm:gap-0.5 sm:gap-x-0">
                  <span className="font-medium">30d spend:</span>
                  <span>{formatUsd(keyInfo?.spend30dUsd ?? null, { fractionDigits: 2 })}</span>
                </p>
                <p className="flex flex-row flex-wrap items-baseline gap-x-1.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm sm:flex-col sm:gap-0.5 sm:gap-x-0">
                  <span className="font-medium">Difference:</span>
                  <span>{differenceLabel}</span>
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setDecision("info_requested")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                decision === "info_requested"
                  ? "border-slate-400 bg-slate-50 text-slate-800"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50/80"
              }`}
            >
              Info requested
            </button>
            <button
              type="button"
              onClick={() => setDecision("escalated")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                decision === "escalated"
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-amber-300 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50/80"
              }`}
            >
              Escalated
            </button>
            <button
              type="button"
              onClick={() => setDecision("false_positive")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                decision === "false_positive"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/80"
              }`}
            >
              False Positive
            </button>
            <button
              type="button"
              onClick={() => setDecision("true_positive")}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                decision === "true_positive"
                  ? "border-rose-400 bg-rose-50 text-rose-700"
                  : "border-rose-300 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50/80"
              }`}
            >
              True Positive
            </button>
            </div>
          </div>

          {otherAlerts.length > 0 ? (
            <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4">
              <h2 className="heading-section mb-3">Other Alerts</h2>
              <TableSwipeHint />
              <div className="scroll-x-touch">
                <table className="min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-300 bg-slate-200/95 text-left text-xs uppercase tracking-wide text-slate-600 backdrop-blur-sm">
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Alert</th>
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Type</th>
                      <th className={`pr-4 ${TABLE_PY_INNER}`}>Status</th>
                      <th className={`text-right tabular-nums ${TABLE_PY_INNER}`}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherAlerts.map((a, idx) => (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-200/50 ${
                          idx % 2 === 1 ? "bg-slate-50/70" : ""
                        }`}
                      >
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>
                          <Link
                            href={`/alerts/${a.id}`}
                            className="font-mono text-xs text-[#264B5A] hover:underline"
                          >
                            {a.id}
                          </Link>
                        </td>
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>
                          {formatStatusLabel(a.alert_type ?? a.type ?? "")}
                        </td>
                        <td className={`pr-4 ${TABLE_PY_INNER}`}>
                          {formatStatusLabel(a.status ?? "")}
                        </td>
                        <td className={`text-right tabular-nums ${TABLE_PY_INNER}`}>
                          {formatDate(a.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-6">
            {appUser?.role === "admin" ? (
              <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4">
                <h2 className="heading-section mb-3">Internal Notes</h2>
                <SimulatorCommentsPanel
                  userId={null}
                  alertId={alert.internal_id ?? null}
                  showTitle={false}
                  withTopBorder={false}
                  emptyMessage="No private notes yet."
                  adminModeOverride="private"
                />
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50/50 to-slate-100 p-4">
              <h2 className="heading-section mb-3">Analyst Notes</h2>
              <SimulatorCommentsPanel
                userId={null}
                alertId={alert.internal_id ?? null}
                showTitle={false}
                withTopBorder={false}
                emptyMessage="No notes yet."
                predefinedNotes={predefinedNotes}
                adminModeOverride={appUser?.role === "admin" ? "reply" : undefined}
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
