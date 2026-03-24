import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isStaticAsset = /\.[a-zA-Z0-9]+$/.test(path);
  const isAuthPath = path === "/login" || path === "/signup" || path === "/forgot-password";
  const isProtectedPath =
    path === "/" ||
    path === "/users" ||
    path.startsWith("/users/") ||
    path === "/alerts" ||
    path.startsWith("/alerts/") ||
    path === "/profile" ||
    path === "/admin" ||
    path.startsWith("/admin/");
  const isAlwaysPublicPath = path.startsWith("/_next/") || path === "/favicon.ico" || isStaticAsset;

  if (isAlwaysPublicPath) {
    return supabaseResponse;
  }

  if (isAuthPath) {
    if (!user || path === "/forgot-password") {
      return supabaseResponse;
    }

    if (path === "/login" || path === "/signup") {
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!appUser) return supabaseResponse;

      const nextPath = request.nextUrl.searchParams.get("next");
      const destination =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return supabaseResponse;
  }

  if (!isProtectedPath) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!appUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_registered");
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin") && appUser.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
