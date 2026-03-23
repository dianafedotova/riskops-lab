import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RiskOps Lab",
  description: "Fraud and AML risk review simulator",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0f172a",
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
        <div className="mx-auto flex min-h-screen min-w-0 max-w-7xl flex-col px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
          <header className="surface-lift mb-6 rounded-xl border border-[#345868]/80 bg-gradient-to-tl from-[#264B5A]/45 to-[#264B5A]/65 px-4 py-3 shadow-[0_2px_6px_rgba(2,6,23,0.16)] backdrop-blur sm:mb-8 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg transition-opacity duration-150 hover:opacity-95"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#264B5A] text-sm font-bold text-slate-100">
                  RL
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-50">
                  RiskOps Lab
                </span>
              </Link>
              <AppNav />
            </div>
          </header>

          <main className="min-w-0 flex-1 pb-6 sm:pb-8">
            <div className="main-content-shell p-3 sm:p-5 md:p-6">{children}</div>
          </main>
          <footer className="flex flex-col gap-3 border-t border-slate-700 pt-4 text-xs text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p>RiskOps Lab simulator - training UI for fraud and AML reviews.</p>
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="rounded transition-colors duration-150 hover:text-[#7EA6B7] hover:underline"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/privacy"
                className="rounded transition-colors duration-150 hover:text-[#7EA6B7] hover:underline"
              >
                Privacy
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
