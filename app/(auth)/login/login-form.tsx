"use client";

import { getCurrentAppUser } from "@/lib/auth/current-app-user";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { loadAmplitudeOrganizationMeta, trackTraineeIdentityEvent } from "@/lib/amplitude";
import { captureSentryMessage } from "@/lib/sentry-capture";
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
    return "Sign-in did not finish. Please try Continue with Google again.";
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";
  const authReason = searchParams.get("reason");
  const inactiveReason = authReason === "inactive";
  const provisioningReason = authReason === "provisioning";
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
  }, [oauthFlag, router, searchParams]);

  useEffect(() => {
    if (!oauthCode || handledCodeRef.current) return;
    handledCodeRef.current = true;
    let cancelled = false;

    (async () => {
      setMessage(null);
      setOauthLoading(true);

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
            captureSentryMessage("Client OAuth code exchange failed", {
              level: "warning",
              type: "oauth_exchange_failed",
              pathname: "/sign-in",
              tags: {
                source: "client",
              },
              extra: {
                detail: error.message,
              },
            });
          }
          setOauthLoading(false);
        }
        return;
      }

      const firstCtx = await getCurrentAppUser(supabase);
      if (!firstCtx.authUser) {
        if (!cancelled) {
          setMessage("Could not load your beta session. Please try signing in again.");
          captureSentryMessage("OAuth sign-in finished without a resolved session", {
            level: "warning",
            type: "oauth_session_missing_after_exchange",
            pathname: "/sign-in",
            tags: {
              source: "client",
            },
          });
          setOauthLoading(false);
        }
        return;
      }

      let oauthProfile = firstCtx.appUser;
      let oauthProfErr = firstCtx.error;
      if (oauthProfErr) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const again = await getCurrentAppUser(supabase);
        oauthProfErr = again.error;
        oauthProfile = again.appUser;
      }

      if (oauthProfErr) {
        if (!cancelled) {
          setMessage("We could not finish loading your beta workspace. Please try again.");
          captureSentryMessage("OAuth sign-in could not load app_users profile", {
            level: "error",
            type: "oauth_profile_lookup_failed",
            pathname: "/sign-in",
            tags: {
              source: "client",
            },
            extra: {
              detail: oauthProfErr.message,
            },
          });
          setOauthLoading(false);
        }
        return;
      }

      if (!oauthProfile) {
        await supabase.auth.signOut();
        if (!cancelled) {
          setMessage(
            "Your beta workspace is still provisioning. Try signing in again in a moment or contact support."
          );
          captureSentryMessage("OAuth sign-in finished without app_users profile", {
            level: "warning",
            type: "oauth_profile_missing",
            pathname: "/sign-in",
            tags: {
              source: "client",
            },
          });
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
      const oauthOrgMeta = await loadAmplitudeOrganizationMeta(supabase, oauthProfile.organization_id);
      trackTraineeIdentityEvent("login_completed", oauthProfile.provider ?? "google", oauthOrgMeta ?? {
        organizationId: oauthProfile.organization_id,
      });

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
  }, [authType, nextPath, oauthCode, router, searchParams]);

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
      if (!lower.includes("invalid login credentials")) {
        captureSentryMessage("Password sign-in failed", {
          level: "warning",
          type: "password_signin_failed",
          pathname: "/sign-in",
          tags: {
            source: "client",
          },
          extra: {
            detail: signErr.message,
          },
        });
      }
      setLoading(false);
      return;
    }

    const firstCtx = await getCurrentAppUser(supabase);
    if (!firstCtx.authUser) {
      setMessage("Could not load session.");
      setLoading(false);
      return;
    }

    let profileRow = firstCtx.appUser;
    let profileErr = firstCtx.error;
    if (profileErr) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const second = await getCurrentAppUser(supabase);
      profileErr = second.error;
      profileRow = second.appUser;
    }

    if (profileErr) {
      setMessage("We could not finish loading your beta workspace. Please try again.");
      captureSentryMessage("Password sign-in could not load app_users profile", {
        level: "error",
        type: "password_profile_lookup_failed",
        pathname: "/sign-in",
        tags: {
          source: "client",
        },
        extra: {
          detail: profileErr.message,
        },
      });
      setLoading(false);
      return;
    }

    if (!profileRow) {
      await supabase.auth.signOut();
      setMessage(
        "Your beta workspace is still provisioning. Try signing in again in a moment or contact support."
      );
      captureSentryMessage("Password sign-in finished without app_users profile", {
        level: "warning",
        type: "password_profile_missing",
        pathname: "/sign-in",
        tags: {
          source: "client",
        },
      });
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
    const orgMeta = await loadAmplitudeOrganizationMeta(supabase, profileRow.organization_id);
    trackTraineeIdentityEvent("login_completed", profileRow.provider ?? "password", orgMeta ?? {
      organizationId: profileRow.organization_id,
    });

    const dest =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/dashboard";
    router.push(dest);
    router.refresh();
    setLoading(false);
  };

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
      captureSentryMessage("Google sign-in redirect failed", {
        level: "warning",
        type: "signin_google_failed",
        pathname: "/sign-in",
        tags: {
          source: "client",
        },
        extra: {
          detail: error.message,
        },
      });
      setGoogleLoading(false);
    }
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

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
      {inactiveReason ? (
        <p className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--accent-stone-500)]">
          This account has been deactivated. You cannot sign in anymore.
        </p>
      ) : null}
      {provisioningReason ? (
        <p className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--accent-stone-500)]">
          Your account exists, but the beta workspace profile is still
          provisioning. Try signing in again in a moment.
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
      {oauthLoading ? (
        <p className="text-sm text-[var(--accent-stone-500)]">Completing Google sign-in...</p>
      ) : null}
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
            data-amp-mask=""
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
            data-amp-mask=""
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
