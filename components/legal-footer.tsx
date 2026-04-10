import Link from "next/link";
import { getSupportEmail, getSupportMailtoHref } from "@/lib/public-config";

type Props = {
  className?: string;
};

export function LegalFooter({ className = "" }: Props) {
  const supportEmail = getSupportEmail();

  return (
    <footer
      className={`border-t border-white/15 pt-4 text-xs text-slate-200 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-slate-100">RiskOps Lab (beta)</span>
          <span className="text-slate-300">AML &amp; Anti-Fraud training</span>
          <p className="mt-0.5 max-w-prose text-[11px] leading-relaxed text-slate-400">
            All data is synthetic. For training purposes only.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
          <Link
            href={getSupportMailtoHref("RiskOps Lab support")}
            className="w-fit rounded text-slate-300 transition-colors duration-150 hover:text-[var(--brand-400)] hover:underline"
          >
            {supportEmail}
          </Link>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-300">
            <Link
              href="/terms"
              className="rounded transition-colors duration-150 hover:text-[var(--brand-400)] hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <span className="text-slate-500" aria-hidden="true">
              |
            </span>
            <Link
              href="/privacy"
              className="rounded transition-colors duration-150 hover:text-[var(--brand-400)] hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-slate-500">© 2026 RiskOps Lab</p>
    </footer>
  );
}
