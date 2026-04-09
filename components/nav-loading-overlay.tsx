"use client";

import { BrandMark } from "@/components/brand-mark";
import {
  navBarLinkActive,
  navBarLinkBase,
  navBarOuterClass,
  navBarScrollRowClass,
} from "@/lib/nav-bar-link-classes";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type NavLoadingOverlayProps = {
  open: boolean;
  message: string;
  children?: ReactNode;
};

/** Full-screen dimmer; header mirrors classic teal nav (#6f9fb0) in AppNavClient. */
export function NavLoadingOverlay({ open, message, children }: NavLoadingOverlayProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-[rgb(18_32_46/0.45)] backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{message}</span>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 sm:px-6 sm:pt-6 sm:pb-6 lg:px-8">
        <header className="shell-card surface-lift pointer-events-none select-none rounded-[1.2rem] px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div aria-hidden className="min-w-0">
              <BrandMark />
            </div>

            <nav className={navBarOuterClass} aria-hidden>
              <div className={navBarScrollRowClass}>
                <span className={navBarLinkBase}>Dashboard</span>
                <span className={navBarLinkBase}>Users</span>
                <span className={`${navBarLinkBase} ${navBarLinkActive}`}>Alerts</span>
                <span className={navBarLinkBase}>Guide</span>
                <span className={`${navBarLinkBase} bg-[#6f9fb0]/18 text-slate-900`}>About</span>
                <span className="max-w-[min(100%,14rem)] shrink-0 truncate px-1 text-xs font-semibold text-slate-500">
                  {message}
                </span>
              </div>
              <div className="relative inline-flex shrink-0 items-center gap-2.5 rounded-[0.9rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(228,236,242,0.98)_0%,rgba(212,224,232,0.96)_100%)] px-2.5 py-1.5 text-sm font-semibold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_3px_10px_rgba(15,23,42,0.08)]">
                <span className="max-w-[min(100%,9.5rem)] truncate text-[0.92rem] font-semibold tracking-[-0.01em] text-slate-600">…</span>
                <span
                  className="relative inline-flex h-10 w-10 shrink-0 animate-pulse items-center justify-center overflow-hidden rounded-[0.75rem] border border-white/75 bg-[#c7d7de]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]"
                  aria-hidden
                />
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-slate-500"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M6 8L1 3h10L6 8z" />
                </svg>
              </div>
            </nav>
          </div>
          {children}
        </header>
      </div>
    </div>,
    document.body
  );
}
