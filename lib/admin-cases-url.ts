import type { AdminCaseCatalogPhaseFilter, AdminCaseDateBasis } from "@/lib/services/admin-review-cases";
import type { ReviewThreadContextType } from "@/lib/types";
import { clampAdminCasePage, clampAdminCasePageSize } from "@/lib/services/admin-review-cases";

const PHASES = new Set<string>([
  "all",
  "not_draft",
  "draft",
  "submitted",
  "in_review",
  "changes_requested",
  "approved",
  "closed",
  "done",
]);

export function parseAdminCasePhaseParam(raw: string | null | undefined): AdminCaseCatalogPhaseFilter {
  const v = (raw ?? "all").trim().toLowerCase();
  return (PHASES.has(v) ? v : "all") as AdminCaseCatalogPhaseFilter;
}

export function parseAdminCaseContextParam(raw: string | null | undefined): "all" | ReviewThreadContextType {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "alert" || v === "profile") return v;
  return "all";
}

export function parseAdminCaseDateBasisParam(raw: string | null | undefined): AdminCaseDateBasis {
  const v = (raw ?? "activity").trim().toLowerCase();
  if (v === "thread_created") return "thread_created";
  return "activity";
}

/** `YYYY-MM-DD` at 00:00:00.000 UTC, or null if invalid. */
export function parseUtcDayStart(isoDate: string | null | undefined): Date | null {
  if (!isoDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Exclusive end: user-selected end date (inclusive) → start of next UTC day. */
export function parseUtcDayEndExclusive(isoDate: string | null | undefined): Date | null {
  const start = parseUtcDayStart(isoDate);
  if (!start) return null;
  return new Date(start.getTime() + 86400000);
}

export type AdminCasesUrlState = {
  q: string;
  org: string | null;
  trainee: string | null;
  sim: string | null;
  alert: string | null;
  ctx: "all" | ReviewThreadContextType;
  phase: AdminCaseCatalogPhaseFilter;
  basis: AdminCaseDateBasis;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
};

export function adminCasesStateFromSearchParams(searchParams: URLSearchParams): AdminCasesUrlState {
  return {
    q: (searchParams.get("q") ?? "").trim(),
    org: searchParams.get("org")?.trim() || null,
    trainee: searchParams.get("trainee")?.trim() || null,
    sim: searchParams.get("sim")?.trim() || null,
    alert: searchParams.get("alert")?.trim() || null,
    ctx: parseAdminCaseContextParam(searchParams.get("ctx")),
    phase: parseAdminCasePhaseParam(searchParams.get("phase")),
    basis: parseAdminCaseDateBasisParam(searchParams.get("basis")),
    dateFrom: searchParams.get("df")?.trim() || null,
    dateTo: searchParams.get("dt")?.trim() || null,
    page: clampAdminCasePage(Number(searchParams.get("page"))),
    pageSize: clampAdminCasePageSize(Number(searchParams.get("ps"))),
  };
}

export function serializeAdminCasesUrlState(state: AdminCasesUrlState): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.q) sp.set("q", state.q);
  if (state.org) sp.set("org", state.org);
  if (state.trainee) sp.set("trainee", state.trainee);
  if (state.sim) sp.set("sim", state.sim);
  if (state.alert) sp.set("alert", state.alert);
  if (state.ctx !== "all") sp.set("ctx", state.ctx);
  if (state.phase !== "all") sp.set("phase", state.phase);
  if (state.basis !== "activity") sp.set("basis", state.basis);
  if (state.dateFrom) sp.set("df", state.dateFrom);
  if (state.dateTo) sp.set("dt", state.dateTo);
  if (state.page > 1) sp.set("page", String(state.page));
  if (state.pageSize !== 10) sp.set("ps", String(state.pageSize));
  return sp;
}
