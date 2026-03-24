"use client";

import { createClient } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createClient();
    const redirectTo = getAuthRedirectUrl("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      redirectTo ? { redirectTo } : undefined
    );
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setSuccess("Password reset link sent. Check your email.");
    setLoading(false);
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded border border-slate-300 bg-white p-6 text-slate-900">
      <h1 className="text-lg font-semibold">Forgot password</h1>
      <p className="text-sm text-slate-600">Enter your email and we will send a reset link.</p>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-slate-600">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="email"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-800 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-slate-700 active:translate-y-[1px] active:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
