import { getSupportEmail, getSupportMailtoHref, SYNTHETIC_ONLY_MESSAGE } from "@/lib/public-config";
import Link from "next/link";

type PublicBetaNoteProps = {
  className?: string;
  title?: string;
  compact?: boolean;
};

export function PublicBetaNote({
  className = "",
  title = "Public beta notice",
  compact = false,
}: PublicBetaNoteProps) {
  const supportEmail = getSupportEmail();
  const toneClass = compact
    ? "border border-[var(--border-app)] bg-[var(--surface-muted)] text-[var(--accent-stone-500)]"
    : "border border-[var(--border-app)] bg-[var(--surface-main)] text-[var(--accent-stone-500)] shadow-sm";

  return (
    <div className={`rounded-[1.2rem] p-4 text-sm leading-6 ${toneClass} ${className}`}>
      <p className="font-semibold text-[var(--app-shell-bg)]">{title}</p>
      <p className="mt-1">{SYNTHETIC_ONLY_MESSAGE}</p>
      <p className="mt-2">
        Need help or want to report a beta issue?{" "}
        <Link href={getSupportMailtoHref("RiskOps Lab public beta support")} className="font-medium underline">
          {supportEmail}
        </Link>
      </p>
    </div>
  );
}
