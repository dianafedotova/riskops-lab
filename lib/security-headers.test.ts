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

  it("adds the exact Sentry ingest origin from the configured DSN", () => {
    const headers = buildSecurityHeaders({
      sentryDsn:
        "https://70d5a96c26be9415640af01dcbecd7cd@o4511194737082368.ingest.de.sentry.io/4511194753663056",
    });
    const cspHeader = headers.find((header) => header.key === "Content-Security-Policy-Report-Only");

    expect(cspHeader?.value).toContain("https://o4511194737082368.ingest.de.sentry.io");
  });

  it("allows the public marketing stack and injected Silktide origins", () => {
    const headers = buildSecurityHeaders({
      silktideCssUrl: "https://cdn.silktide.com/cookie-manager/banner.css",
      silktideJsUrl: "https://cdn.silktide.com/cookie-manager/banner.js",
    });
    const cspHeader = headers.find((header) => header.key === "Content-Security-Policy-Report-Only");

    expect(cspHeader?.value).toContain("https://www.googletagmanager.com");
    expect(cspHeader?.value).toContain("https://www.google-analytics.com");
    expect(cspHeader?.value).toContain("https://www.facebook.com");
    expect(cspHeader?.value).toContain("https://px.ads.linkedin.com");
    expect(cspHeader?.value).toContain("https://cdn.silktide.com");
  });
});
