import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security-headers";

const vercelHost = process.env.VERCEL_URL?.trim();
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_URL:
      vercelHost && vercelHost.length > 0 ? `https://${vercelHost.replace(/^\/+/, "")}` : "",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          isProduction: process.env.NODE_ENV === "production",
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
          silktideCssUrl: process.env.NEXT_PUBLIC_SILKTIDE_CSS_URL,
          silktideJsUrl: process.env.NEXT_PUBLIC_SILKTIDE_JS_URL,
        }),
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  silent: !process.env.CI,
});
