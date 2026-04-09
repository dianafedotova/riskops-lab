import { describe, expect, it } from "vitest";
import { comparePhoneDialLabels, getDialCodeForCountryIso, labelForPhoneDialCode } from "@/lib/phone-dial-codes";

describe("phone-dial-codes", () => {
  it("labels a single-country dial code", () => {
    expect(labelForPhoneDialCode("+380")).toMatch(/^Ukraine \(\+380\)$/);
  });

  it("labels shared codes with multiple countries", () => {
    const label = labelForPhoneDialCode("+1");
    expect(label).toContain("(+1)");
    expect(label).toContain(" · ");
  });

  it("returns raw dial when unknown", () => {
    expect(labelForPhoneDialCode("+99999")).toBe("+99999");
  });

  it("getDialCodeForCountryIso maps ISO to dial", () => {
    expect(getDialCodeForCountryIso("UA")).toBe("+380");
    expect(getDialCodeForCountryIso("")).toBe("");
  });

  it("comparePhoneDialLabels sorts by label", () => {
    expect(comparePhoneDialLabels("Albania (+355)", "Zimbabwe (+263)")).toBeLessThan(0);
  });
});
