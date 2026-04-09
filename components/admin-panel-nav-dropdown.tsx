"use client";

import { useReviewWorkspaceActor } from "@/lib/hooks/use-review-workspace-actor";
import { isSuperAdmin } from "@/lib/app-user-role";
import { navBarLinkBase, navBarLinkActive } from "@/lib/nav-bar-link-classes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_MIN_WIDTH_PX = 15 * 16;
const GAP_PX = 8;
const PAD_PX = 8;

function adminPeopleNavLabel(role: string | null | undefined): string {
  if (role == null) return "People";
  return isSuperAdmin(role) ? "People" : "Trainee list";
}

function adminSectionActive(pathname: string): boolean {
  if (pathname === "/admin") return true;
  if (!pathname.startsWith("/admin")) return false;
  return true;
}

export function AdminPanelNavDropdown() {
  const { appUser } = useReviewWorkspaceActor();
  const pathname = usePathname() ?? "";
  const menuItems = useMemo(
    () => [
      { href: "/admin/review", label: "Review queue" },
      { href: "/admin/drafts", label: "Trainee drafts" },
      { href: "/admin/people", label: adminPeopleNavLabel(appUser?.role) },
    ],
    [appUser?.role]
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const active = adminSectionActive(pathname);

  const close = useCallback(() => {
    setOpen(false);
    setCoords(null);
  }, []);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    let left = r.left;
    left = Math.max(PAD_PX, Math.min(left, window.innerWidth - MENU_MIN_WIDTH_PX - PAD_PX));
    setCoords({ top: r.bottom + GAP_PX, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const buttonClass = active ? `${navBarLinkBase} ${navBarLinkActive}` : navBarLinkBase;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClass} gap-1`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setCoords(null);
          setOpen(true);
        }}
      >
        <span>Admin Panel</span>
        <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3 shrink-0 opacity-70" fill="none">
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[200] min-w-[15rem] rounded-[0.85rem] border border-slate-200/95 bg-white py-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
              style={{ top: coords.top, left: coords.left, minWidth: MENU_MIN_WIDTH_PX }}
              role="menu"
            >
              {menuItems.map((item) => {
                const itemActive = itemMatch(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className={`block px-3.5 py-2.5 text-sm font-semibold transition hover:bg-slate-100 ${
                      itemActive ? "bg-[#6f9fb0]/15 text-slate-900" : "text-slate-700"
                    }`}
                    onClick={() => close()}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function itemMatch(href: string, pathname: string): boolean {
  if (href === "/admin/review") {
    return pathname === "/admin/review" || pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
