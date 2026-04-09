"use client";

import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  subtitle?: string;
  className?: string;
};

export function BrandMark({
  href = "/",
  subtitle = "Fraud & AML Investigation Simulator",
  className = "",
}: BrandMarkProps) {
  return (
    <Link href={href} className={`group inline-flex min-w-0 items-center ${className}`}>
      <span className="min-w-0">
        <span className="block truncate text-xl font-black leading-none tracking-[-0.02em] text-slate-900 sm:text-2xl">
          RiskOps Lab<span className="text-[var(--brand-dot)]">.</span>
        </span>
        <span className="block max-w-full truncate pt-1 text-[11px] font-medium leading-tight text-slate-600 sm:text-xs">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
