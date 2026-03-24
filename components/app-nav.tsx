"use client";

import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const publicNavLinks = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

const privateNavLinks = [
  { href: "/dashboard", label: "Dashboard", match: (p: string) => p === "/dashboard" },
  { href: "/users", label: "Users", match: (p: string) => p === "/users" || p.startsWith("/users/") },
  { href: "/alerts", label: "Alerts", match: (p: string) => p === "/alerts" || p.startsWith("/alerts/") },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

export function AppNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { authUser, appUser, loading: authLoading } = useCurrentUser();
  const navLinks = (authUser ? privateNavLinks : publicNavLinks).filter(
    (link) => !(link.href === "/" && pathname === "/" && !authUser)
  );

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

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
                : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            } `}
          >
            {link.label}
          </Link>
        );
      })}
      {!authLoading && appUser?.role === "admin" ? (
        <Link
          href="/admin"
          aria-current={pathname === "/admin" || pathname.startsWith("/admin/") ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ease-out sm:min-h-0 sm:py-2 ${
            pathname === "/admin" || pathname.startsWith("/admin/")
              ? "bg-[#315E70]/55 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
          } `}
        >
          Admin Panel
        </Link>
      ) : null}
      {!authLoading && authUser ? (
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 sm:min-h-0 sm:py-2"
        >
          Logout
        </button>
      ) : !authLoading ? (
        <>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#315E70]/55 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#315E70]/70 sm:min-h-0 sm:py-2"
          >
            Sign in
          </Link>
        </>
      ) : null}
    </nav>
  );
}
