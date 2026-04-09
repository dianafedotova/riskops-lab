import { describe, expect, it } from "vitest";
import {
  alertRowStatusBadgeClass,
  simulatorUserStatusBadgeClass,
  traineeCasePhaseBadgeClass,
} from "@/lib/trainee-case-badges";

describe("traineeCasePhaseBadgeClass", () => {
  it("maps phases to semantic badge classes", () => {
    expect(traineeCasePhaseBadgeClass("draft")).toBe("ui-badge-neutral");
    expect(traineeCasePhaseBadgeClass("submitted")).toBe("ui-badge-blue");
    expect(traineeCasePhaseBadgeClass("in_review")).toBe("ui-badge-teal");
    expect(traineeCasePhaseBadgeClass("changes_requested")).toBe("ui-badge-rose");
    expect(traineeCasePhaseBadgeClass("approved")).toBe("ui-badge-emerald");
    expect(traineeCasePhaseBadgeClass("closed")).toBe("ui-badge-neutral");
  });
});

describe("alertRowStatusBadgeClass", () => {
  it("maps common alert statuses", () => {
    expect(alertRowStatusBadgeClass("Open")).toBe("ui-badge-blue");
    expect(alertRowStatusBadgeClass("Monitoring")).toBe("ui-badge-amber");
    expect(alertRowStatusBadgeClass("Escalated")).toBe("ui-badge-violet");
    expect(alertRowStatusBadgeClass("Closed")).toBe("ui-badge-neutral");
  });
});

describe("simulatorUserStatusBadgeClass", () => {
  it("maps simulator user statuses", () => {
    expect(simulatorUserStatusBadgeClass("active")).toBe("ui-badge-emerald");
    expect(simulatorUserStatusBadgeClass("restricted")).toBe("ui-badge-amber");
    expect(simulatorUserStatusBadgeClass("not_active")).toBe("ui-badge-neutral");
  });
});
