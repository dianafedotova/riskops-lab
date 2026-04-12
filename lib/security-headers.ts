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

function pushOrigin(target: string[], value: string) {
  if (!value || target.includes(value)) return;
  target.push(value);
}

export function buildSecurityHeaders(options?: {
  isProduction?: boolean;
  supabaseUrl?: string | null;
  sentryDsn?: string | null;
  silktideCssUrl?: string | null;
  silktideJsUrl?: string | null;
}): SecurityHeader[] {
  const isProduction = options?.isProduction ?? false;
  const supabaseUrl = options?.supabaseUrl?.trim() ?? "";
  const sentryDsn = options?.sentryDsn?.trim() ?? "";
  const silktideCssUrl = options?.silktideCssUrl?.trim() ?? "";
  const silktideJsUrl = options?.silktideJsUrl?.trim() ?? "";
  const supabaseOrigin = getOrigin(supabaseUrl);
  const sentryOrigin = getOrigin(sentryDsn);
  const silktideCssOrigin = getOrigin(silktideCssUrl);
  const silktideJsOrigin = getOrigin(silktideJsUrl);

  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://vitals.vercel-insights.com",
    "https://*.ingest.sentry.io",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://stats.g.doubleclick.net",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://px.ads.linkedin.com",
    "https://snap.licdn.com",
  ];
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://challenges.cloudflare.com",
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://snap.licdn.com",
  ];
  const styleSources = ["'self'", "'unsafe-inline'"];
  const fontSources = ["'self'", "data:"];
  const frameSources = [
    "https://challenges.cloudflare.com",
    "https://www.googletagmanager.com",
  ];

  if (sentryOrigin) {
    pushOrigin(connectSources, sentryOrigin);
  }

  if (supabaseOrigin) {
    pushOrigin(connectSources, supabaseOrigin);
    if (supabaseOrigin.startsWith("https://")) {
      pushOrigin(connectSources, `wss://${supabaseOrigin.slice("https://".length)}`);
    }
  }

  pushOrigin(styleSources, silktideCssOrigin);
  pushOrigin(fontSources, silktideCssOrigin);
  pushOrigin(connectSources, silktideCssOrigin);
  pushOrigin(scriptSources, silktideJsOrigin);
  pushOrigin(styleSources, silktideJsOrigin);
  pushOrigin(fontSources, silktideJsOrigin);
  pushOrigin(connectSources, silktideJsOrigin);

  const cspReportOnly = compactHeaderValue(`
    default-src 'self';
    base-uri 'self';
    form-action 'self' https://accounts.google.com https://*.supabase.co;
    frame-ancestors 'none';
    img-src 'self' data: blob: https:;
    style-src ${styleSources.join(" ")};
    font-src ${fontSources.join(" ")};
    script-src ${scriptSources.join(" ")};
    frame-src ${frameSources.join(" ")};
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
