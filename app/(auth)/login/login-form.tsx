"use client";

import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { recordAppUserActivity } from "@/lib/services/app-user-activity";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function toFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Incorrect email or password.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (lower.includes("network")) return "Network error. Please try again.";
  return message;
}

function getInitialOauthMessage(
  oauthFlag: string | null,
  oauthErrMessage: string | null
): string | null {
  if (oauthFlag === "pkce") {
    return "Google sign-in could not complete (session cookie mismatch). Try again in this same browser window, or clear site data for this site and retry. If you use a password manager or privacy mode, allow cookies for this origin.";
  }
  if (oauthFlag === "error" && oauthErrMessage) {
    return toFriendlyAuthError(oauthErrMessage);
  }
  if (oauthFlag === "config") {
    return "Sign-in is not configured (missing Supabase environment variables on the server).";
  }
  if (oauthFlag === "no_session" || oauthFlag === "missing_code") {
    return "Sign-in did not finish. Please try “Continue with Google” again.";
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";
  const inactiveReason = searchParams.get("reason") === "inactive";
  const oauthCode = searchParams.get("code");
  const authType = searchParams.get("type");
  const oauthFlag = searchParams.get("oauth");
  const oauthErrMessage = searchParams.get("message");
  const handledCodeRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(() =>
    getInitialOauthMessage(oauthFlag, oauthErrMessage)
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showConfirmEmailWindow, setShowConfirmEmailWindow] = useState(false);

  useEffect(() => {
    if (!oauthFlag) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("oauth");
    params.delete("message");
    router.replace(`/sign-in${params.toString() ? `?${params.toString()}` : ""}`);
  }, [oauthFlag, oauthErrMessage, router, searchParams]);

  useEffect(() => {
    if (!oauthCode || handledCodeRef.current) return;
    handledCodeRef.current = true;
    let cancelled = false;
    (async () => {
      setMessage(null);
      setOauthLoading(true);

      // Email confirmation / recovery links can arrive with query params
      // that are not OAuth PKCE callbacks. Keep UX smooth and avoid false errors.
      if (authType === "signup") {
        if (!cancelled) {
          setOauthLoading(false);
          setMessage("Email confirmed. You can now sign in.");
          const params = new URLSearchParams(searchParams.toString());
          params.delete("code");
          params.delete("type");
          router.replace(`/sign-in${params.toString() ? `?${params.toString()}` : ""}`);
        }
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(oauthCode);
      if (error) {
        if (!cancelled) {
          const lower = error.message.toLowerCase();
          if (lower.includes("pkce code verifier not found")) {
            setMessage("Email confirmed. Please sign in with your email and password.");
            const params = new URLSearchParams(searchParams.toString());
            params.delete("code");
            params.delete("type");
            router.replace(`/sign-in${params.toString() ? `?${params.toString()}` : ""}`);
          } else {
            setMessage(toFriendlyAuthError(error.message));
          }
          setOauthLoading(false);
        }
        return;
      }
      const firstCtx = await getCurrentAppUser(supabase);
      if (firstCtx.authUser) {
        let oauthProfile = firstCtx.appUser;
        let oauthProfErr = firstCtx.error;
        if (oauthProfErr) {
          await new Promise((r) => setTimeout(r, 250));
          const again = await getCurrentAppUser(supabase);
          oauthProfErr = again.error;
          oauthProfile = again.appUser;
        }
        if (oauthProfErr) {
          if (!cancelled) {
            setMessage(
              `Could not load your simulator profile (${oauthProfErr.message}). Check app_users / app_user_profiles and RLS.`
            );
            setOauthLoading(false);
          }
          return;
        }
        if (!oauthProfile) {
          await supabase.auth.signOut();
          if (!cancelled) {
            setMessage("Your account is not registered in the simulator yet.");
            router.replace("/signup?need_app_user=1");
            setOauthLoading(false);
          }
          return;
        }
        if (oauthProfile.is_active === false) {
          await supabase.auth.signOut();
          if (!cancelled) {
            setMessage("This account has been deactivated.");
            setOauthLoading(false);
          }
          return;
        }

        await recordAppUserActivity(supabase, {
          appUserId: oauthProfile.id,
          eventType: "user_logged_in",
          meta: {
            provider: oauthProfile.provider ?? undefined,
          },
        });
      }
      const dest =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/dashboard";
      router.replace(dest);
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [oauthCode, authType, nextPath, router, searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      const lower = signErr.message.toLowerCase();
      if (lower.includes("email not confirmed")) {
        setShowConfirmEmailWindow(true);
        setMessage(null);
      } else {
        setShowConfirmEmailWindow(false);
        setMessage(toFriendlyAuthError(signErr.message));
      }
      setLoading(false);
      return;
    }
    const firstCtx = await getCurrentAppUser(supabase);
    if (!firstCtx.authUser) {
      setMessage("Could not load session");
      setLoading(false);
      return;
    }
    let profileRow = firstCtx.appUser;
    let profileErr = firstCtx.error;
    if (profileErr) {
      await new Promise((r) => setTimeout(r, 250));
      const second = await getCurrentAppUser(supabase);
      profileErr = second.error;
      profileRow = second.appUser;
    }
    if (profileErr) {
      setMessage(
        `Could not load your simulator profile (${profileErr.message}). Check that app_users / app_user_profiles exist and RLS allows your user.`
      );
      setLoading(false);
      return;
    }
    if (!profileRow) {
      await supabase.auth.signOut();
      setMessage("Your account is not registered in the simulator yet.");
      router.push("/signup?need_app_user=1");
      setLoading(false);
      return;
    }
    if (profileRow.is_active === false) {
      await supabase.auth.signOut();
      setMessage("This account has been deactivated.");
      setLoading(false);
      return;
    }

    await recordAppUserActivity(supabase, {
      appUserId: profileRow.id,
      eventType: "user_logged_in",
      meta: {
        provider: profileRow.provider ?? undefined,
      },
    });

    const dest =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/dashboard";
    router.push(dest);
    router.refresh();
    setLoading(false);
  };

  if (showConfirmEmailWindow) {
    return (
      <section className="mx-auto max-w-md space-y-4 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
        <h1 className="text-lg font-semibold">Confirm your email</h1>
        <p className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Please confirm your email before signing in.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[var(--app-shell-bg)] py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--brand-600)] active:translate-y-[1px] active:bg-[var(--background)]"
          onClick={() => {
            setShowConfirmEmailWindow(false);
            setMessage(null);
          }}
        >
          Back to sign in
        </Link>
      </section>
    );
  }

  const onGoogleSignIn = async () => {
    setMessage(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const redirectTo = getAuthRedirectUrl("/auth/callback");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) {
      setMessage(toFriendlyAuthError(error.message));
      setGoogleLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
      {inactiveReason ? (
        <p className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--accent-stone-500)]">
          This account has been deactivated. You cannot sign in anymore.
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold">Login</h1>
        <p className="pt-0.5 text-xs text-[var(--accent-stone-500)]">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-[var(--app-shell-bg)] underline">
            Create one
          </Link>
        </p>
      </div>
      {message && message !== "Incorrect email or password." ? (
        <p className="text-sm text-rose-600">{message}</p>
      ) : null}
      {oauthLoading ? <p className="text-sm text-[var(--accent-stone-500)]">Completing Google sign-in...</p> : null}
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={googleLoading || loading || oauthLoading}
        className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-[0.8rem] border border-[rgb(201_213_231_/_0.98)] bg-white px-4 text-[0.95rem] font-semibold text-[rgb(24_42_59_/_0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_4px_12px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow,color] duration-150 hover:border-[rgb(174_190_216_/_0.98)] hover:bg-[rgb(236_243_253_/_1)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_6px_14px_rgba(29,44,77,0.08)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(201_213_231_/_0.98)] bg-white text-[0.95rem] font-bold text-[rgb(24_42_59_/_0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.94)]">
          G
        </span>
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 text-xs text-[var(--accent-stone-400)]">
        <span className="h-px flex-1 bg-[var(--surface-muted)]" />
        <span>or</span>
        <span className="h-px flex-1 bg-[var(--surface-muted)]" />
      </div>
      {message === "Incorrect email or password." ? (
        <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-sm font-medium text-rose-800">Incorrect email or password.</p>
          <p className="mt-0.5 text-xs text-rose-700">Check your credentials and try again.</p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="dark-input mt-1 h-10 w-full px-3 text-sm"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="dark-input mt-1 h-10 w-full px-3 text-sm"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading || oauthLoading}
          className="inline-flex h-10 w-full items-center justify-center rounded-[0.65rem] border border-[rgb(35_47_69_/_0.96)] bg-[rgb(35_46_69_/_0.98)] px-5 text-[0.98rem] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(18,31,46,0.12)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[rgb(57_78_116_/_0.98)] hover:bg-[rgb(57_78_116_/_0.98)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_20px_rgba(42,63,106,0.18)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-[var(--accent-stone-500)]">
        <Link href="/forgot-password" className="block text-center text-xs underline">
          Forgot password?
        </Link>
      </p>
    </section>
  );
}

