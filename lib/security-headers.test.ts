import { buildSecurityHeaders } from "@/lib/security-headers";
import { describe, expect, it } from "vitest";

describe("buildSecurityHeaders", () => {
  it("returns the baseline security headers", () => {
    const headers = buildSecurityHeaders();
    const keys = headers.map((header) => header.key);

    expect(keys).toContain("Content-Security-Policy-Report-Only");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("X-Frame-Options");
  });

  it("adds HSTS only in production", () => {
    const productionKeys = buildSecurityHeaders({ isProduction: true }).map((header) => header.key);
    const developmentKeys = buildSecurityHeaders({ isProduction: false }).map((header) => header.key);

    expect(productionKeys).toContain("Strict-Transport-Security");
    expect(developmentKeys).not.toContain("Strict-Transport-Security");
  });
});
