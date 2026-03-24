import { AppNav } from "@/components/app-nav";
import { BrandMark } from "@/components/brand-mark";
import { LegalFooter } from "@/components/legal-footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen min-w-0 max-w-7xl flex-col px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
      <header className="surface-lift mb-6 rounded-2xl bg-slate-100/95 px-4 py-3 shadow-[0_10px_20px_rgba(15,23,42,0.10)] backdrop-blur sm:mb-8 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <BrandMark />
          <AppNav />
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-6 sm:pb-8">
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}
