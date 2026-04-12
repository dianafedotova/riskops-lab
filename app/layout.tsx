import type { Metadata, Viewport } from "next";
import { AmplitudeProvider } from "@/components/amplitude-provider";
import { PUBLIC_BETA_DESCRIPTION, PUBLIC_BETA_NAME } from "@/lib/public-config";
import { getSiteOrigin } from "@/lib/site-url";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";

const suseSans = localFont({
  src: "./fonts/suse-latin-wght-normal.woff2",
  variable: "--font-suse-sans",
  display: "swap",
  weight: "100 900",
});

const suseMono = localFont({
  src: "./fonts/suse-mono-latin-wght-normal.woff2",
  variable: "--font-suse-mono",
  display: "swap",
  weight: "100 800",
});

const metadataBase = (() => {
  try {
    return new URL(getSiteOrigin());
  } catch {
    return new URL("https://riskopslab.com");
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: PUBLIC_BETA_NAME,
    template: `%s | ${PUBLIC_BETA_NAME}`,
  },
  description: PUBLIC_BETA_DESCRIPTION,
  applicationName: PUBLIC_BETA_NAME,
  openGraph: {
    type: "website",
    title: PUBLIC_BETA_NAME,
    description: PUBLIC_BETA_DESCRIPTION,
    siteName: PUBLIC_BETA_NAME,
    url: metadataBase,
  },
  twitter: {
    card: "summary_large_image",
    title: PUBLIC_BETA_NAME,
    description: PUBLIC_BETA_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#12202E",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${suseSans.variable} ${suseMono.variable} h-full antialiased`}
    >
      <body className="min-h-full min-w-0 bg-app-shell text-slate-200">
        {children}
        <Suspense fallback={null}>
          <AmplitudeProvider />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
