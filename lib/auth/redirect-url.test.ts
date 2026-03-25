import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthRedirectUrl } from "./redirect-url";

describe("getAuthRedirectUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("builds URL from NEXT_PUBLIC_SITE_URL when window is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    expect(getAuthRedirectUrl("/auth/callback")).toBe("https://app.example.com/auth/callback");
  });

  it("prefers NEXT_PUBLIC_APP_URL over VERCEL url", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://alpha.example.com");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "https://ignored.vercel.app");
    expect(getAuthRedirectUrl("/x")).toBe("https://alpha.example.com/x");
  });

  it("returns undefined when base is not a valid URL origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-base");
    expect(getAuthRedirectUrl("/cb")).toBeUndefined();
  });
});
