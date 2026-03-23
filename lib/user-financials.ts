import type { UserFinancialsRow } from "@/lib/types";

/** Supabase / DB may use different column names for the same fields. */
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a row from `user_financials` (or compatible shape) for the UI. */
export function normalizeFinancialsRow(raw: unknown): UserFinancialsRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const userId = r.user_id != null ? String(r.user_id) : "";
  const current =
    num(r.current_balance) ??
    num(r.current_balance_usd) ??
    num(r.balance_usd) ??
    num(r.balance);
  const turnover =
    num(r.total_turnover) ??
    num(r.total_turnover_usd) ??
    num(r.turnover_usd) ??
    num(r.turnover);
  if (!userId && current == null && turnover == null) return null;
  return {
    user_id: userId || "—",
    current_balance: current,
    total_turnover: turnover,
  };
}
