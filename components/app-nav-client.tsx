"use client";

import { AdminPanelNavDropdown } from "@/components/admin-panel-nav-dropdown";
import { useCurrentUser } from "@/components/current-user-provider";
import { UserAccountMenu } from "@/components/user-account-menu";
import {
  navBarLinkClassName,
  navBarOuterClass,
  navBarScrollRowClass,
  navBarSignInClass,
} from "@/lib/nav-bar-link-classes";
import { canSeeAdminNavLink, canSeeTraineeWorkspace } from "@/lib/permissions/checks";
import Link from "next/link";
import { usePathname } from "next/navigation";

const publicNavLinks = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/knowledge-base", label: "Knowledge Base", match: (p: string) => p === "/knowledge-base" || p.startsWith("/knowledge-base/") },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

const privateNavLinksBase = [
  { href: "/dashboard", label: "Dashboard", match: (p: string) => p === "/dashboard" },
  { href: "/users", label: "Users", match: (p: string) => p === "/users" || p.startsWith("/users/") },
  { href: "/alerts", label: "Alerts", match: (p: string) => p === "/alerts" || p.startsWith("/alerts/") },
  { href: "/knowledge-base", label: "Knowledge Base", match: (p: string) => p === "/knowledge-base" || p.startsWith("/knowledge-base/") },
  { href: "/guide", label: "Guide", match: (p: string) => p === "/guide" },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
] as const;

export function AppNavClient() {
  const pathname = usePathname() ?? "";
  const { authUser, appUser, loading: authLoading } = useCurrentUser();
  const showAdminPanel = !authLoading && canSeeAdminNavLink(appUser?.role);
  const showMyCases = !authLoading && canSeeTraineeWorkspace(appUser?.role);
  const myCasesNavLink = {
    href: "/my-cases",
    label: "My Cases",
    match: (p: string) => p === "/my-cases" || p === "/workspace",
  } as const;
  const withTraineeLink = showMyCases
    ? [privateNavLinksBase[0], myCasesNavLink, ...privateNavLinksBase.slice(1)]
    : [...privateNavLinksBase];

  return (
    <nav className={navBarOuterClass} aria-label="Main">
      <div className={navBarScrollRowClass}>
        {authUser ? (
          <>
            <Link
              key={withTraineeLink[0].href}
              href={withTraineeLink[0].href}
              aria-current={withTraineeLink[0].match(pathname) ? "page" : undefined}
              className={navBarLinkClassName(withTraineeLink[0].match(pathname))}
            >
              {withTraineeLink[0].label}
            </Link>
            {showAdminPanel ? <AdminPanelNavDropdown /> : null}
            {withTraineeLink.slice(1).map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={navBarLinkClassName(active)}
                >
                  {link.label}
                </Link>
              );
            })}
          </>
        ) : (
          publicNavLinks
            .filter((link) => !(link.href === "/" && pathname === "/" && !authUser))
            .map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={navBarLinkClassName(active)}
                >
                  {link.label}
                </Link>
              );
            })
        )}
      </div>
      {!authLoading && authUser ? (
        <UserAccountMenu authUser={authUser} appUser={appUser} />
      ) : !authLoading ? (
        <Link href="/sign-in" className={navBarSignInClass}>
          Sign in
        </Link>
      ) : null}
    </nav>
  );
}
