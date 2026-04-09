import { describe, expect, it } from "vitest";
import { adminCaseTargetSummary, buildAdminCaseWorkspaceHref } from "@/lib/admin-case-workspace-href";

describe("buildAdminCaseWorkspaceHref", () => {
  it("builds alert link with reviewThread", () => {
    expect(
      buildAdminCaseWorkspaceHref({
        threadId: "tid",
        contextType: "alert",
        alertId: "A-99",
        simulatorUserId: null,
      })
    ).toBe("/alerts/A-99?reviewThread=tid");
  });

  it("builds profile link with reviewThread", () => {
    expect(
      buildAdminCaseWorkspaceHref({
        threadId: "tid",
        contextType: "profile",
        alertId: null,
        simulatorUserId: "u1",
      })
    ).toBe("/users/u1?reviewThread=tid");
  });

  it("returns null without target", () => {
    expect(
      buildAdminCaseWorkspaceHref({
        threadId: "tid",
        contextType: "alert",
        alertId: null,
        simulatorUserId: null,
      })
    ).toBeNull();
  });
});

describe("adminCaseTargetSummary", () => {
  it("labels alert context", () => {
    const s = adminCaseTargetSummary({
      contextType: "alert",
      alertId: "X-1",
      simulatorUserId: null,
      simUserEmail: null,
      simUserFullName: null,
    });
    expect(s.label).toContain("X-1");
  });

  it("labels profile context", () => {
    const s = adminCaseTargetSummary({
      contextType: "profile",
      alertId: null,
      simulatorUserId: "uid",
      simUserEmail: "a@b.co",
      simUserFullName: "Ann",
    });
    expect(s.label).toContain("Ann");
  });
});
