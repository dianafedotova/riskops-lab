import { describe, expect, it } from "vitest";
import {
  adminCasesStateFromSearchParams,
  parseAdminCaseContextParam,
  parseAdminCaseDateBasisParam,
  parseAdminCasePhaseParam,
  parseUtcDayEndExclusive,
  parseUtcDayStart,
  serializeAdminCasesUrlState,
} from "@/lib/admin-cases-url";

describe("parseAdminCasePhaseParam", () => {
  it("normalizes known phases", () => {
    expect(parseAdminCasePhaseParam("IN_REVIEW")).toBe("in_review");
    expect(parseAdminCasePhaseParam("done")).toBe("done");
    expect(parseAdminCasePhaseParam("not_draft")).toBe("not_draft");
  });

  it("falls back to all", () => {
    expect(parseAdminCasePhaseParam("nope")).toBe("all");
    expect(parseAdminCasePhaseParam(null)).toBe("all");
  });
});

describe("parseAdminCaseContextParam", () => {
  it("accepts alert and profile", () => {
    expect(parseAdminCaseContextParam("alert")).toBe("alert");
    expect(parseAdminCaseContextParam("PROFILE")).toBe("profile");
  });

  it("defaults to all", () => {
    expect(parseAdminCaseContextParam("x")).toBe("all");
  });
});

describe("parseAdminCaseDateBasisParam", () => {
  it("accepts thread_created", () => {
    expect(parseAdminCaseDateBasisParam("thread_created")).toBe("thread_created");
  });

  it("defaults to activity", () => {
    expect(parseAdminCaseDateBasisParam("")).toBe("activity");
  });
});

describe("parseUtcDayStart", () => {
  it("parses valid ISO date", () => {
    const d = parseUtcDayStart("2026-04-07");
    expect(d?.toISOString()).toBe("2026-04-07T00:00:00.000Z");
  });

  it("returns null for invalid", () => {
    expect(parseUtcDayStart("bad")).toBeNull();
  });
});

describe("parseUtcDayEndExclusive", () => {
  it("returns start of next day", () => {
    const d = parseUtcDayEndExclusive("2026-04-07");
    expect(d?.toISOString()).toBe("2026-04-08T00:00:00.000Z");
  });
});

describe("adminCasesStateFromSearchParams + serializeAdminCasesUrlState", () => {
  it("defaults page size to 10 when ps is absent (avoids Number(null) → 0 → 1 row per page)", () => {
    const state = adminCasesStateFromSearchParams(new URLSearchParams());
    expect(state.pageSize).toBe(10);
  });

  it("round-trips non-default fields", () => {
    const sp = new URLSearchParams();
    sp.set("q", "foo");
    sp.set("org", "00000000-0000-4000-8000-000000000001");
    sp.set("trainee", "00000000-0000-4000-8000-000000000002");
    sp.set("sim", "00000000-0000-4000-8000-000000000003");
    sp.set("alert", "ALT-1");
    sp.set("ctx", "profile");
    sp.set("phase", "draft");
    sp.set("basis", "thread_created");
    sp.set("df", "2026-01-01");
    sp.set("dt", "2026-01-31");
    sp.set("page", "3");
    sp.set("ps", "25");

    const state = adminCasesStateFromSearchParams(sp);
    expect(state.q).toBe("foo");
    expect(state.org).toBe("00000000-0000-4000-8000-000000000001");
    expect(state.trainee).toBe("00000000-0000-4000-8000-000000000002");
    expect(state.sim).toBe("00000000-0000-4000-8000-000000000003");
    expect(state.alert).toBe("ALT-1");
    expect(state.ctx).toBe("profile");
    expect(state.phase).toBe("draft");
    expect(state.basis).toBe("thread_created");
    expect(state.dateFrom).toBe("2026-01-01");
    expect(state.dateTo).toBe("2026-01-31");
    expect(state.page).toBe(3);
    expect(state.pageSize).toBe(25);

    const again = adminCasesStateFromSearchParams(serializeAdminCasesUrlState(state));
    expect(again).toEqual(state);
  });
});
