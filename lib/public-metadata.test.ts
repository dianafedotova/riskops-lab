import { buildPublicRobots, buildPublicSitemap } from "@/lib/public-metadata";
import { describe, expect, it } from "vitest";

describe("public metadata builders", () => {
  it("builds a sitemap with core public routes", () => {
    const sitemap = buildPublicSitemap("https://riskopslab.com");

    expect(sitemap.some((entry) => entry.url === "https://riskopslab.com/")).toBe(true);
    expect(sitemap.some((entry) => entry.url === "https://riskopslab.com/guide")).toBe(true);
    expect(sitemap.some((entry) => entry.url === "https://riskopslab.com/signup")).toBe(false);
  });

  it("disallows protected routes in robots", () => {
    const robots = buildPublicRobots("https://riskopslab.com");
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const defaultRule = rules[0];

    expect(defaultRule.disallow).toContain("/dashboard");
    expect(defaultRule.disallow).toContain("/api");
    expect(defaultRule.allow).toContain("/knowledge-base");
    expect(defaultRule.allow).toContain("/sign-in");
    expect(defaultRule.allow).toContain("/indexnow-key.txt");
    expect(robots.sitemap).toBe("https://riskopslab.com/sitemap.xml");
  });
});
