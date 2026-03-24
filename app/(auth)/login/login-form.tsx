"use client";

import { createClient } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/auth/redirect-url";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function toFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Incorrect email or password.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (lower.includes("network")) return "Network error. Please try again.";
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      setMessage(toFriendlyAuthError(signErr.message));
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Could not load session");
      setLoading(false);
      return;
    }
    const { error: appErr } = await supabase
      .from("app_users")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (appErr) {
      setMessage("Signed in, but profile check failed. Please reload in a moment.");
    }
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
      setGoogleLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded border border-slate-300 bg-white p-6 text-slate-900">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold">Login</h1>
        <p className="pt-0.5 text-xs text-slate-600">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-slate-800 underline">
            Create one
          </Link>
        </p>
      </div>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={googleLoading || loading}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold">
          G
        </span>
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
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
        <label className="block text-sm">
          <span className="text-slate-600">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-800 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-slate-700 active:translate-y-[1px] active:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        <Link href="/forgot-password" className="block text-center text-xs underline">
          Forgot password?
        </Link>
      </p>
    </section>
  );
}
