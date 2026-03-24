"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
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
    <section className="mx-auto max-w-md space-y-4 rounded border border-slate-300 bg-white p-6 text-slate-900">
      <h1 className="text-lg font-semibold">Reset password</h1>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-slate-600">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-800 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-slate-700 active:translate-y-[1px] active:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </section>
  );
}
