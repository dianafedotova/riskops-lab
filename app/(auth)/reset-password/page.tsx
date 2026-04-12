"use client";

import { PublicBetaNote } from "@/components/public-beta-note";
import { getAmplitudeEventSpec } from "@/lib/amplitude";
import { captureSentryMessage } from "@/lib/sentry-capture";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  void getAmplitudeEventSpec;
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSuccess(null);

    if (!newPassword) {
      setMessage("New password is required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(error.message);
      captureSentryMessage("Password update failed", {
        level: "warning",
        type: "reset_password_failed",
        pathname: "/reset-password",
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

    setSuccess("Password updated successfully. Redirecting to sign in...");
    setLoading(false);
    window.setTimeout(() => {
      router.replace("/sign-in");
      router.refresh();
    }, 1200);
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded border border-[var(--border-app)] bg-[var(--surface-workspace)] p-6 text-[var(--app-shell-bg)]">
      <h1 className="text-lg font-semibold">Reset password</h1>
      <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
        Choose a new password for your public beta account, then sign back in
        to continue your training workspace.
      </p>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            data-amp-mask=""
            className="dark-input mt-1 h-10 w-full px-3 text-sm"
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--accent-stone-500)]">Confirm new password</span>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[1.2rem] bg-[var(--app-shell-bg)] py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--brand-600)] active:translate-y-[1px] active:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
      <PublicBetaNote compact />
    </section>
  );
}
