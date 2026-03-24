import { LegalFooter } from "@/components/legal-footer";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8">
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center">
        <div className="w-full space-y-5">
          <div className="flex items-center justify-center gap-3 rounded-xl border border-[#345868]/80 bg-gradient-to-tl from-[#264B5A]/45 to-[#264B5A]/65 px-4 py-3 shadow-[0_2px_6px_rgba(2,6,23,0.16)]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#264B5A] text-sm font-bold text-slate-100">
              RL
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-[19px] font-semibold tracking-tight text-slate-50">RiskOps Lab</p>
              <p className="truncate text-xs text-slate-200/90">Transaction Monitoring simulator</p>
            </div>
          </div>
          {children}
        </div>
      </main>
      <LegalFooter className="mt-4" />
    </div>
  );
}
