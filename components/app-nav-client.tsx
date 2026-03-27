"use client";

import { UserAccountMenu } from "@/components/user-account-menu";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { canSeeAdminNavLink } from "@/lib/permissions/checks";
import type { AppUserRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";

const publicNavLinks = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

const privateNavLinksBase = [
  { href: "/dashboard", label: "Dashboard", match: (p: string) => p === "/dashboard" },
  { href: "/users", label: "Users", match: (p: string) => p === "/users" || p.startsWith("/users/") },
  { href: "/alerts", label: "Alerts", match: (p: string) => p === "/alerts" || p.startsWith("/alerts/") },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

const adminPanelLink = {
  href: "/admin",
  label: "Admin Panel",
  match: (p: string) => p === "/admin" || p.startsWith("/admin/"),
} as const;

export type AppNavInitialSession = {
  authUser: User | null;
  appUser: AppUserRow | null;
};

type AppNavClientProps = {
  initialSession: AppNavInitialSession;
};

export function AppNavClient({ initialSession }: AppNavClientProps) {
  const pathname = usePathname() ?? "";
  const { authUser, appUser, loading: authLoading } = useCurrentUser(initialSession);
  const showAdminPanel = !authLoading && canSeeAdminNavLink(appUser?.role);
  const privateNavLinks = showAdminPanel
    ? [privateNavLinksBase[0], adminPanelLink, ...privateNavLinksBase.slice(1)]
    : privateNavLinksBase;
  const navLinks = (authUser ? privateNavLinks : publicNavLinks).filter(
    (link) => !(link.href === "/" && pathname === "/" && !authUser)
  );

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
                ? "bg-[#6f9fb0]/35 text-slate-800 shadow-sm"
                : "text-slate-700 hover:bg-[#6f9fb0]/18 hover:text-slate-900"
            } `}
          >
            {link.label}
          </Link>
        );
      })}
      {!authLoading && authUser ? (
        <UserAccountMenu authUser={authUser} appUser={appUser} />
      ) : !authLoading ? (
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#5e8d9c]/80 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4f7e8d]/85 sm:min-h-0 sm:py-2"
        >
          Sign in
        </Link>
      ) : null}
    </nav>
  );
}
