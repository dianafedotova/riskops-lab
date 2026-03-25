import { fetchAppUserRow } from "@/lib/auth/fetch-app-user";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * OAuth PKCE must be exchanged using the same cookie jar as the incoming request.
 * A client-only exchange can fail under React Strict Mode (double effect) or when
 * redirect origin does not match where the verifier cookie was set.
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

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignore when cookie store cannot be mutated */
        }
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectSignIn({ oauth: "no_session" });
  }

  const { row: profile } = await fetchAppUserRow(supabase, user);
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return redirectSignIn({ reason: "inactive" });
  }

  const ok = request.nextUrl.clone();
  ok.pathname = nextPath;
  ok.search = "";
  return NextResponse.redirect(ok);
}
