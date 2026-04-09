import { AppNav } from "@/components/app-nav";
import { BrandMark } from "@/components/brand-mark";
import { LegalFooter } from "@/components/legal-footer";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen min-w-0 max-w-7xl flex-col px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
      <header className="shell-card surface-lift mb-6 rounded-[1.2rem] px-4 py-3 backdrop-blur sm:mb-8 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
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
