"use client";

import { FilterSelect } from "@/components/filter-select";
import { PublicBetaNote } from "@/components/public-beta-note";
import { TurnstileWidget } from "@/components/turnstile-widget";
import {
  clearMarketingSurfaceSessionFlag,
  pushPublicDataLayerEvent,
} from "@/lib/public-data-layer";
import { getAmplitudeEventSpec, trackTraineeIdentityEvent } from "@/lib/amplitude";
import { COUNTRY_OPTIONS } from "@/lib/auth/countries";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { captureSentryMessage } from "@/lib/sentry-capture";
import {
  getSupportEmail,
  getSupportMailtoHref,
  getTurnstileSiteKey,
  isTurnstileEnabled,
} from "@/lib/public-config";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function NeedAppUserBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("need_app_user") !== "1") return null;
  return (
    <p className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--accent-stone-500)]">
      Legacy account detected. Start a fresh beta signup below or contact
      support if you expected an existing workspace profile.
    </p>
  );
}

void getAmplitudeEventSpec;

export function SignupPageClient() {
  const supportEmail = getSupportEmail();
  const turnstileSiteKey = getTurnstileSiteKey();
  const turnstileEnabled = isTurnstileEnabled();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const countrySelectOptions = useMemo(
    () => [
      { value: "", label: "Select country" },
      ...COUNTRY_OPTIONS.map((country) => ({ value: country.code, label: country.name })),
    ],
    []
  );

  const countryName = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.name ?? "",
    [countryCode]
  );

  const onGoogle = async () => {
    setMessage(null);
    setSuccessMessage(null);

    if (turnstileEnabled && !captchaToken) {
      setMessage("Complete the captcha before continuing with Google.");
      return;
    }

    pushPublicDataLayerEvent("cta_clicked", {
      cta_name: "continue_with_google",
      cta_location: "signup_page",
      page_type: "signup",
      route_group: "auth",
    });

    setGoogleLoading(true);
    const supabase = createClient();
    const redirectTo = getAuthRedirectUrl("/auth/callback");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        ...(redirectTo ? { redirectTo } : {}),
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) {
      setMessage(error.message);
      captureSentryMessage("Google signup redirect failed", {
        level: "warning",
        type: "signup_google_failed",
        pathname: "/signup",
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setMessage("First name and last name are required.");
      return;
    }
    if (!countryCode || !countryName) {
      setMessage("Country is required.");
      return;
    }
    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }
    if (!password) {
      setMessage("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (turnstileEnabled && !captchaToken) {
      setMessage("Complete the captcha before creating a beta account.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          country_code: countryCode,
          country_name: countryName,
        },
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) {
      setMessage(error.message);
      captureSentryMessage("Public beta signup failed", {
        level: "warning",
        type: "signup_failed",
        pathname: "/signup",
        tags: {
          source: "client",
        },
        extra: {
          detail: error.message,
          countryCode,
        },
      });
      setLoading(false);
      return;
    }

    trackTraineeIdentityEvent("signup_completed", "password", {
      organizationName: "RiskOps Lab",
      organizationSlug: "riskops-lab",
    });
    pushPublicDataLayerEvent("signup_completed", {
      method: "password",
      page_type: "signup",
      route_group: "auth",
    });

    if (data.session) {
      clearMarketingSurfaceSessionFlag();
      window.location.assign("/dashboard");
      return;
    }

    setSuccessMessage("Account created. Please check your email to confirm your account.");
    setLoading(false);
  };

  if (successMessage) {
    return (
      <section className="mx-auto max-w-md space-y-4 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="rounded-[1.2rem] border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {successMessage}
        </p>
        <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
          We provision every confirmed account as a trainee in the default
          RiskOps Lab workspace after auth completes.
        </p>
        <PublicBetaNote compact />
        <div className="space-y-2">
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[var(--app-shell-bg)] py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--brand-600)] active:translate-y-[1px] active:bg-[var(--background)]"
          >
            Go to sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold">Sign up</h1>
        <p className="pt-0.5 text-xs text-[var(--accent-stone-500)]">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-[var(--app-shell-bg)] underline">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
        Open signup is enabled for the public beta. New accounts join the
        default trainee workspace and must use synthetic data only.
      </p>

      <Suspense fallback={null}>
        <NeedAppUserBanner />
      </Suspense>

      {message ? <p className="text-sm text-rose-600">{message}</p> : null}

      <button
        type="button"
        onClick={() => void onGoogle()}
        disabled={googleLoading || loading}
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

      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            data-amp-mask=""
            className="dark-input mt-1 h-10 w-full px-3 text-sm"
            autoComplete="given-name"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            data-amp-mask=""
            className="dark-input mt-1 h-10 w-full px-3 text-sm"
            autoComplete="family-name"
          />
        </label>
        <div className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">Country</span>
          <div className="mt-1">
            <FilterSelect
              ariaLabel="Country"
              value={countryCode}
              onChange={setCountryCode}
              options={countrySelectOptions}
              className="h-10 w-full px-3 text-sm"
            />
          </div>
        </div>
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
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            data-amp-mask=""
            className="dark-input mt-1 h-10 w-full px-3 text-sm"
            autoComplete="new-password"
          />
        </label>
        {turnstileEnabled ? (
          <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} />
        ) : null}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="inline-flex h-10 w-full items-center justify-center rounded-[0.65rem] border border-[rgb(35_47_69_/_0.96)] bg-[rgb(35_46_69_/_0.98)] px-5 text-[0.98rem] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(18,31,46,0.12)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[rgb(57_78_116_/_0.98)] hover:bg-[rgb(57_78_116_/_0.98)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_20px_rgba(42,63,106,0.18)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <PublicBetaNote compact />
      <p className="text-xs leading-5 text-[var(--accent-stone-500)]">
        Need help with signup, confirmation, or provisioning? Contact{" "}
        <Link
          href={getSupportMailtoHref("RiskOps Lab public beta signup help")}
          className="font-medium underline"
        >
          {supportEmail}
        </Link>
        .
      </p>
    </section>
  );
}
