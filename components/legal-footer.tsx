import Link from "next/link";

type Props = {
  className?: string;
};

export function LegalFooter({ className = "" }: Props) {
  return (
    <footer
      className={`flex flex-col gap-3 border-t border-[var(--border-app)] pt-4 text-xs text-[var(--accent-stone-400)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <p>RiskOps Lab simulator - training UI for fraud and AML reviews.</p>
      <div className="flex items-center gap-4">
        <Link
          href="/terms"
          className="rounded transition-colors duration-150 hover:text-[var(--brand-400)] hover:underline"
        >
          Terms &amp; Conditions
        </Link>
        <Link
          href="/privacy"
          className="rounded transition-colors duration-150 hover:text-[var(--brand-400)] hover:underline"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}


