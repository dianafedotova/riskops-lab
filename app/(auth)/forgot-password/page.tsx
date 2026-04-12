"use client";

import { PublicBetaNote } from "@/components/public-beta-note";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { getAmplitudeEventSpec } from "@/lib/amplitude";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { captureSentryMessage } from "@/lib/sentry-capture";
import { getTurnstileSiteKey, isTurnstileEnabled } from "@/lib/public-config";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  void getAmplitudeEventSpec;
  const turnstileSiteKey = getTurnstileSiteKey();
  const turnstileEnabled = isTurnstileEnabled();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSuccess(null);

    if (turnstileEnabled && !captchaToken) {
      setMessage("Complete the captcha before requesting a reset link.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const redirectTo = getAuthRedirectUrl("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
      ...(captchaToken ? { captchaToken } : {}),
    });

    if (error) {
      setMessage(error.message);
      captureSentryMessage("Password reset request failed", {
        level: "warning",
        type: "forgot_password_failed",
        pathname: "/forgot-password",
        tags: {
          source: "client",
        },
        extra: {
          detail: error.message,
        },
      });
      setLoading(false);
      return;
    }

    setSuccess("Password reset link sent. Check your email.");
    setLoading(false);
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
      <h1 className="text-lg font-semibold">Forgot password</h1>
      <p className="text-sm text-[var(--accent-stone-500)]">
        Enter your email and we will send a reset link for your public beta
        account.
      </p>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
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
        {turnstileEnabled ? (
          <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} />
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[1.2rem] bg-[var(--app-shell-bg)] py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--brand-600)] active:translate-y-[1px] active:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <PublicBetaNote compact />
      <p className="text-sm text-[var(--accent-stone-500)]">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
