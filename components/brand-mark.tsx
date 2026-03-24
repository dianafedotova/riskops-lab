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
          RiskOps Lab<span className="text-[#E15747]">.</span>
        </span>
        <span className="hidden truncate pt-1 text-[11px] font-medium text-slate-600 sm:block">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
