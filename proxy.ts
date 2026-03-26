import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function applyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  const isStaticAsset = /\.[a-zA-Z0-9]+$/.test(path);
  const isAuthPath =
    path === "/login" ||
    path === "/sign-in" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/auth/callback";
  const isProtectedPath =
    path === "/dashboard" ||
    path === "/users" ||
    path.startsWith("/users/") ||
    path === "/alerts" ||
    path.startsWith("/alerts/") ||
    path === "/profile" ||
    path.startsWith("/profile/") ||
    path === "/admin" ||
    path.startsWith("/admin/");
  const isAlwaysPublicPath = path.startsWith("/_next/") || path === "/favicon.ico" || isStaticAsset;

  if (isAlwaysPublicPath) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
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

  if (isAuthPath) {
    if (!user || path === "/forgot-password" || path === "/reset-password" || path === "/auth/callback") {
      return supabaseResponse;
    }

    if (path === "/login" || path === "/sign-in" || path === "/signup") {
      const { row: authAppUser, error: authFetchErr } = await fetchAppUserRow(supabase, user);
      if (authFetchErr) {
        return supabaseResponse;
      }
      if (!authAppUser) {
        if (path === "/signup") {
          return supabaseResponse;
        }
        const signupUrl = new URL("/signup", request.url);
        signupUrl.searchParams.set("need_app_user", "1");
        const redirectRes = NextResponse.redirect(signupUrl);
        applyCookies(supabaseResponse, redirectRes);
        return redirectRes;
      }
      if (authAppUser.is_active === false) {
        await supabase.auth.signOut();
        const inactiveUrl = new URL("/sign-in", request.url);
        inactiveUrl.searchParams.set("reason", "inactive");
        const redirectRes = NextResponse.redirect(inactiveUrl);
        applyCookies(supabaseResponse, redirectRes);
        return redirectRes;
      }
      const nextPath = request.nextUrl.searchParams.get("next");
      const destination =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/dashboard";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return supabaseResponse;
  }

  if (!isProtectedPath) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const { row: appUser, error: protectedFetchErr } = await fetchAppUserRow(supabase, user);

  if (protectedFetchErr) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    url.searchParams.set("oauth", "error");
    url.searchParams.set("message", protectedFetchErr.message.slice(0, 200));
    const redirectRes = NextResponse.redirect(url);
    applyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (!appUser) {
    const signupUrl = new URL("/signup", request.url);
    signupUrl.searchParams.set("need_app_user", "1");
    const redirectRes = NextResponse.redirect(signupUrl);
    applyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (appUser.is_active === false) {
    await supabase.auth.signOut();
    const inactiveUrl = new URL("/sign-in", request.url);
    inactiveUrl.searchParams.set("reason", "inactive");
    const redirectRes = NextResponse.redirect(inactiveUrl);
    applyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (path.startsWith("/admin") && appUser?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
