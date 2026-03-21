import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/users", label: "Users" },
    { href: "/alerts", label: "Alerts" },
    { href: "/guide", label: "Guide" },
    { href: "/about", label: "About" },
  ];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0F172A] text-slate-200">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8 rounded-xl border border-[#345868]/80 bg-[#264B5A]/55 px-5 py-4 shadow-[0_2px_6px_rgba(2,6,23,0.16)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#264B5A] text-sm font-bold text-slate-100">
                  RL
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-50">
                  RiskOps Lab
                </span>
              </Link>
              <nav className="flex flex-wrap items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-[#315E70]/45 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 pb-8">{children}</main>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4 text-xs text-slate-400">
            <p>RiskOps Lab simulator - training UI for fraud and AML reviews.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-[#7EA6B7] hover:underline">
                Terms &amp; Conditions
              </Link>
              <Link href="/privacy" className="hover:text-[#7EA6B7] hover:underline">
                Privacy
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
