"use client";

import { AppUserAvatar } from "@/components/app-user-avatar";
import { NavLoadingOverlay } from "@/components/nav-loading-overlay";
import { appUserDisplayName, appUserInitials } from "@/lib/auth/app-user-display";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_MIN_WIDTH_PX = 11.5 * 16;
const MENU_GAP_PX = 8;
const VIEWPORT_PAD_PX = 8;

type UserAccountMenuProps = {
  authUser: User;
  appUser: AppUserRow | null;
};

export function UserAccountMenu({ authUser, appUser }: UserAccountMenuProps) {
  const pathname = usePathname() ?? "";
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const displayName = appUserDisplayName(appUser, authUser.email);
  const initials = appUserInitials(displayName);
  const open = openPathname === pathname;

  const close = useCallback(() => {
    setOpenPathname(null);
    setMenuCoords(null);
  }, []);

  const onLogout = async () => {
    setSigningOut(true);
    close();
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.warn(error);
    } catch (e) {
      console.warn(e);
    }
    window.location.replace("/sign-in");
  };

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    let left = r.right - MENU_MIN_WIDTH_PX;
    left = Math.max(
      VIEWPORT_PAD_PX,
      Math.min(left, window.innerWidth - MENU_MIN_WIDTH_PX - VIEWPORT_PAD_PX)
    );
    setMenuCoords({ top: r.bottom + MENU_GAP_PX, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current;
      const menu = menuRef.current;
      const t = e.target as Node;
      if (root?.contains(t) || menu?.contains(t)) return;
      close();
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
      <NavLoadingOverlay open={signingOut} message="Signing out…" />
      <button
        ref={buttonRef}
        type="button"
        disabled={signingOut}
        className="inline-flex max-w-[min(100%,18rem)] shrink-0 items-center gap-2.5 rounded-[0.9rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(228,236,242,0.98)_0%,rgba(212,224,232,0.96)_100%)] px-2.5 py-1.5 text-left text-sm font-semibold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_3px_10px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow,border-color] duration-150 hover:border-[#afc4cf] hover:bg-[linear-gradient(180deg,rgba(223,232,238,1)_0%,rgba(207,220,228,0.98)_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_14px_rgba(15,23,42,0.10)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-busy={signingOut}
        onClick={() => {
          if (signingOut) return;
          if (open) {
            close();
            return;
          }
          setMenuCoords(null);
          setOpenPathname(pathname);
        }}
      >
        <span className="min-w-0 truncate text-[0.92rem] font-semibold tracking-[-0.01em] text-slate-900">{displayName}</span>
        <span
          className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.75rem] border border-white/75 bg-[#c7d7de]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] ${
            open ? "border-[#a9c0ca] bg-[#bfd2da]" : ""
          }`}
        >
          <AppUserAvatar
            avatarField={appUser?.avatar_url}
            initials={initials}
            fallbackClassName="text-xs font-bold"
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

      {open && menuCoords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Account"
              className="fixed z-[10000] min-w-[11.5rem] overflow-hidden rounded-[0.9rem] border border-slate-200/95 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
              style={{ top: menuCoords.top, left: menuCoords.left }}
            >
              <Link
                href="/profile"
                role="menuitem"
                aria-disabled={signingOut}
                className={`block px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#5e8d9c] hover:text-white focus-visible:bg-[#5e8d9c] focus-visible:text-white focus-visible:outline-none ${
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
                className="w-full px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-[var(--brand-dot)] hover:text-white focus-visible:bg-[var(--brand-dot)] focus-visible:text-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                aria-busy={signingOut}
                onClick={() => void onLogout()}
              >
                {signingOut ? "Signing out..." : "Log out"}
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
