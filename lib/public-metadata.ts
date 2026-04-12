import type { MetadataRoute } from "next";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/guide",
  "/privacy",
  "/terms",
] as const;

export function buildPublicSitemap(origin: string): MetadataRoute.Sitemap {
  const base = origin.replace(/\/+$/, "");
  const now = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}

export function buildPublicRobots(origin: string): MetadataRoute.Robots {
  const base = origin.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/guide",
          "/knowledge-base",
          "/privacy",
          "/terms",
          "/sign-in",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/indexnow-key.txt",
        ],
        disallow: ["/admin", "/alerts", "/api", "/dashboard", "/my-cases", "/profile", "/users", "/workspace"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
