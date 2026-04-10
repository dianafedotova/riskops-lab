import { captureSentryMessage } from "@/lib/sentry-capture";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let parsedBody: unknown = rawBody;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // Keep the raw payload when the browser posts a non-JSON CSP report.
  }

  captureSentryMessage("Content-Security-Policy report received", {
    level: "warning",
    type: "ContentSecurityPolicyReport",
    pathname: request.nextUrl.pathname,
    tags: {
      source: "csp",
    },
    extra: {
      report: parsedBody,
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  });

  return new NextResponse(null, { status: 204 });
}
