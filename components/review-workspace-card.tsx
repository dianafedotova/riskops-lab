"use client";

import type { ReactNode } from "react";

type ReviewWorkspaceCardProps = {
  subtitle: string;
  children: ReactNode;
};

export function ReviewWorkspaceCard({ subtitle, children }: ReviewWorkspaceCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <h2 className="heading-section mb-2">Review workspace</h2>
      <p className="mb-3 text-xs text-slate-600">{subtitle}</p>
      {children}
    </div>
  );
}
