import type { Metadata, Viewport } from "next";
import { getSiteOrigin } from "@/lib/site-url";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  title: "RiskOps Lab",
  description: "Fraud and AML risk review simulator",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0b1430",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full min-w-0 bg-app-shell text-slate-200">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
