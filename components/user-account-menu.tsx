"use client";

import { AppUserAvatar } from "@/components/app-user-avatar";
import { appUserDisplayName, appUserInitials } from "@/lib/auth/app-user-display";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type UserAccountMenuProps = {
  authUser: User;
  appUser: AppUserRow | null;
};

export function UserAccountMenu({ authUser, appUser }: UserAccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = appUserDisplayName(appUser, authUser.email);
  const initials = appUserInitials(displayName);
  const onLogout = async () => {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

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
      <button
        type="button"
        className="inline-flex max-w-[min(100%,14rem)] items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#6f9fb0]/18 sm:py-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
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
            className="block px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#5e8d9c] hover:text-white"
            onClick={close}
          >
            My profile
          </Link>
          <div className="h-px w-full bg-slate-200" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[var(--brand-dot)] hover:text-white"
            onClick={() => void onLogout()}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
