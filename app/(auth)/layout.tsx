import { BrandMark } from "@/components/brand-mark";
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
          <div className="shell-card px-4 py-3 transition-shadow duration-150 hover:shadow-[0_16px_32px_rgba(23,77,82,0.12)]">
            <BrandMark
              subtitle="Fraud & AML Investigation Simulator"
              className="justify-center"
            />
          </div>
          {children}
        </div>
      </main>
      <LegalFooter className="mt-4" />
    </div>
  );
}
