"use client";

import { AppUserAvatar } from "@/components/app-user-avatar";
import { appUserDisplayName, appUserInitials } from "@/lib/auth/app-user-display";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type UserAccountMenuProps = {
  authUser: User;
  appUser: AppUserRow | null;
};

export function UserAccountMenu({ authUser, appUser }: UserAccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = appUserDisplayName(appUser, authUser.email);
  const initials = appUserInitials(displayName);
  const open = openPathname === pathname;
  const onLogout = async () => {
    setSigningOut(true);
    setOpenPathname(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.warn(error);
      router.replace("/sign-in");
    } catch (e) {
      console.warn(e);
      setSigningOut(false);
      router.replace("/sign-in");
    }
  };

  const close = useCallback(() => setOpenPathname(null), []);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      {typeof document !== "undefined" && signingOut
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <p className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-lg">
                Signing out…
              </p>
            </div>,
            document.body
          )
        : null}
      <button
        type="button"
        disabled={signingOut}
        className="inline-flex max-w-[min(100%,14rem)] items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#6f9fb0]/18 disabled:cursor-not-allowed disabled:opacity-60 sm:py-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-busy={signingOut}
        onClick={() => {
          if (signingOut) return;
          setOpenPathname((current) => (current === pathname ? null : pathname));
        }}
      >
        <span className="min-w-0 truncate">{displayName}</span>
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[#5e8d9c]/25 ring-1 ring-slate-300/80">
          <AppUserAvatar
            avatarField={appUser?.avatar_url}
            initials={initials}
            fallbackClassName="text-xs"
            imgClassName="h-full w-full object-cover"
          />
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden
        >
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-1 min-w-[11.5rem] overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
        >
          <Link
            href="/profile"
            role="menuitem"
            aria-disabled={signingOut}
            className={`block px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#5e8d9c] hover:text-white ${
              signingOut ? "pointer-events-none opacity-50" : ""
            }`}
            onClick={signingOut ? (e) => e.preventDefault() : close}
          >
            My profile
          </Link>
          <div className="h-px w-full bg-slate-200" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            className="w-full px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[var(--brand-dot)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-busy={signingOut}
            onClick={() => void onLogout()}
          >
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
