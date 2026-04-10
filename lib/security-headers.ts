export type SecurityHeader = {
  key: string;
  value: string;
};

function compactHeaderValue(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}

function getOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function buildSecurityHeaders(options?: {
  isProduction?: boolean;
  supabaseUrl?: string | null;
  sentryDsn?: string | null;
}): SecurityHeader[] {
  const isProduction = options?.isProduction ?? false;
  const supabaseUrl = options?.supabaseUrl?.trim() ?? "";
  const sentryDsn = options?.sentryDsn?.trim() ?? "";
  const supabaseOrigin = getOrigin(supabaseUrl);
  const sentryOrigin = getOrigin(sentryDsn);

  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://vitals.vercel-insights.com",
    "https://*.ingest.sentry.io",
  ];

  if (sentryOrigin) {
    connectSources.push(sentryOrigin);
  }

  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin);
    if (supabaseOrigin.startsWith("https://")) {
      connectSources.push(`wss://${supabaseOrigin.slice("https://".length)}`);
    }
  }

  const cspReportOnly = compactHeaderValue(`
    default-src 'self';
    base-uri 'self';
    form-action 'self' https://accounts.google.com https://*.supabase.co;
    frame-ancestors 'none';
    img-src 'self' data: blob: https:;
    style-src 'self' 'unsafe-inline';
    font-src 'self' data:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;
    frame-src https://challenges.cloudflare.com;
    worker-src 'self' blob:;
    connect-src ${connectSources.join(" ")};
    object-src 'none';
    report-uri /api/monitoring/csp;
  `);

  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
