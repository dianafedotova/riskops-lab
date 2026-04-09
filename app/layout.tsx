import type { Metadata, Viewport } from "next";
import { CurrentUserProvider } from "@/components/current-user-provider";
import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getSiteOrigin } from "@/lib/site-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SUSE, SUSE_Mono } from "next/font/google";
import "./globals.css";

const suseSans = SUSE({
  variable: "--font-suse-sans",
  subsets: ["latin"],
});

const suseMono = SUSE_Mono({
  variable: "--font-suse-mono",
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
  themeColor: "#12202E",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const { authUser, appUser } = await getCurrentAppUser(supabase);

  return (
    <html
      lang="en"
      className={`${suseSans.variable} ${suseMono.variable} h-full antialiased`}
    >
      <body className="min-h-full min-w-0 bg-app-shell text-slate-200">
        <CurrentUserProvider initialSession={{ authUser, appUser }}>{children}</CurrentUserProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
