"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/users", label: "Users", match: (p: string) => p === "/users" || p.startsWith("/users/") },
  { href: "/alerts", label: "Alerts", match: (p: string) => p === "/alerts" || p.startsWith("/alerts/") },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

export function AppNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="-mx-1 flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0"
      aria-label="Main"
    >
      {navLinks.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ease-out sm:min-h-0 sm:py-2 ${
              active
                ? "bg-[#315E70]/55 text-white shadow-sm"
                : "text-slate-100 hover:bg-[#315E70]/45 hover:text-white"
            } `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
