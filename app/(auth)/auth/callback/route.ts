import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * OAuth PKCE must be exchanged using the same cookie jar as the incoming request.
 * A client-only exchange can fail under React Strict Mode (double effect) or when
 * redirect origin does not match where the verifier cookie was set.
 *
 * Important: session cookies must be set on the same {@link NextResponse} that is
 * returned. Using `cookies()` from `next/headers` + a fresh `NextResponse.redirect()`
 * can drop Set-Cookie headers in the App Router, which surfaces as `oauth=no_session`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const redirectSignIn = (params: Record<string, string>) => {
    const u = request.nextUrl.clone();
    u.pathname = "/sign-in";
    u.search = "";
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
    return NextResponse.redirect(u);
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectSignIn({ oauth: "config" });
  }

  if (!code) {
    return redirectSignIn({ oauth: "missing_code" });
  }

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = nextPath;
  successUrl.search = "";
  const response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("pkce")) {
      return redirectSignIn({ oauth: "pkce" });
    }
    return redirectSignIn({
      oauth: "error",
      message: error.message.slice(0, 200),
    });
  }

  const { authUser, appUser: appUserRow, error: appUserErr } = await getCurrentAppUser(supabase);

  if (!authUser) {
    return redirectSignIn({ oauth: "no_session" });
  }

  if (appUserErr) {
    await supabase.auth.signOut();
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    signInUrl.searchParams.set("oauth", "error");
    signInUrl.searchParams.set("message", appUserErr.message.slice(0, 200));
    const errRes = NextResponse.redirect(signInUrl);
    for (const c of response.headers.getSetCookie()) {
      errRes.headers.append("Set-Cookie", c);
    }
    return errRes;
  }

  if (!appUserRow) {
    await supabase.auth.signOut();
    const signupUrl = request.nextUrl.clone();
    signupUrl.pathname = "/signup";
    signupUrl.search = "";
    signupUrl.searchParams.set("need_app_user", "1");
    const signupResponse = NextResponse.redirect(signupUrl);
    for (const c of response.headers.getSetCookie()) {
      signupResponse.headers.append("Set-Cookie", c);
    }
    return signupResponse;
  }

  if (appUserRow.is_active === false) {
    await supabase.auth.signOut();
    const inactiveUrl = request.nextUrl.clone();
    inactiveUrl.pathname = "/sign-in";
    inactiveUrl.search = "";
    inactiveUrl.searchParams.set("reason", "inactive");
    const inactiveResponse = NextResponse.redirect(inactiveUrl);
    const forwarded = response.headers.getSetCookie();
    for (const c of forwarded) {
      inactiveResponse.headers.append("Set-Cookie", c);
    }
    return inactiveResponse;
  }

  return response;
}
