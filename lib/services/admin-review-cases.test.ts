import { describe, expect, it } from "vitest";
import { clampAdminCasePage, clampAdminCasePageSize, escapeIlikePattern } from "@/lib/services/admin-review-cases";

describe("escapeIlikePattern", () => {
  it("escapes ilike metacharacters", () => {
    expect(escapeIlikePattern("100%")).toBe("100\\%");
    expect(escapeIlikePattern("a_b")).toBe("a\\_b");
  });
});

describe("clampAdminCasePageSize", () => {
  it("defaults and clamps", () => {
    expect(clampAdminCasePageSize(undefined)).toBe(10);
    expect(clampAdminCasePageSize(0)).toBe(10);
    expect(clampAdminCasePageSize(999)).toBe(50);
    expect(clampAdminCasePageSize(25)).toBe(25);
  });
});

describe("clampAdminCasePage", () => {
  it("defaults and floors at 1", () => {
    expect(clampAdminCasePage(undefined)).toBe(1);
    expect(clampAdminCasePage(0)).toBe(1);
    expect(clampAdminCasePage(12)).toBe(12);
  });
});
