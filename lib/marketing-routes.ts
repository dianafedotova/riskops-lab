export const MARKETING_SURFACE_SESSION_KEY = "rol:marketing-surface-active";

const AUTH_MARKETING_PATHS = new Set([
  "/sign-in",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const PUBLIC_MARKETING_PATHS = new Set([
  "/",
  "/about",
  "/guide",
  "/knowledge-base",
  "/privacy",
  "/terms",
]);

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

export function isAuthMarketingPath(pathname: string | null | undefined): boolean {
  return AUTH_MARKETING_PATHS.has(normalizePathname(pathname));
}

export function isPublicMarketingPath(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname);
  return normalized.startsWith("/knowledge-base/") || PUBLIC_MARKETING_PATHS.has(normalized);
}

export function isMarketingSurfacePath(pathname: string | null | undefined): boolean {
  return isAuthMarketingPath(pathname) || isPublicMarketingPath(pathname);
}

export function isProtectedAppPath(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname);

  return (
    normalized === "/dashboard" ||
    normalized === "/my-cases" ||
    normalized === "/workspace" ||
    normalized === "/users" ||
    normalized.startsWith("/users/") ||
    normalized === "/alerts" ||
    normalized.startsWith("/alerts/") ||
    normalized === "/profile" ||
    normalized.startsWith("/profile/") ||
    normalized === "/admin" ||
    normalized.startsWith("/admin/")
  );
}

export function getMarketingRouteGroup(pathname: string | null | undefined): "auth" | "public" | null {
  if (isAuthMarketingPath(pathname)) return "auth";
  if (isPublicMarketingPath(pathname)) return "public";
  return null;
}

export function getMarketingPageType(pathname: string | null | undefined): string | null {
  const normalized = normalizePathname(pathname);

  if (normalized === "/knowledge-base") {
    return "knowledge_base_index";
  }

  if (normalized.startsWith("/knowledge-base/category/")) {
    return "knowledge_base_category";
  }

  if (normalized.startsWith("/knowledge-base/")) {
    return "knowledge_base_article";
  }

  switch (normalized) {
    case "/":
      return "landing";
    case "/about":
      return "about";
    case "/guide":
      return "guide";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    case "/sign-in":
      return "sign_in";
    case "/signup":
      return "signup";
    case "/forgot-password":
      return "forgot_password";
    case "/reset-password":
      return "reset_password";
    default:
      return null;
  }
}

export function getKnowledgeBaseRouteContext(pathname: string | null | undefined): {
  category: string | null;
  slug: string | null;
} {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split("/").filter(Boolean);

  if (segments[0] !== "knowledge-base") {
    return {
      category: null,
      slug: null,
    };
  }

  if (segments[1] === "category") {
    return {
      category: segments[2] ?? null,
      slug: null,
    };
  }

  return {
    category: null,
    slug: segments[1] ?? null,
  };
}
