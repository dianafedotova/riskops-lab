"use client";

import { canDeactivateOwnAccount } from "@/lib/permissions/checks";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

type ProfileDeactivateAccountProps = {
  appUser: AppUserRow | null;
};

export function ProfileDeactivateAccount({ appUser }: ProfileDeactivateAccountProps) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setError(null);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!appUser) return null;
  if (!canDeactivateOwnAccount(appUser.role)) return null;
  const currentAppUser = appUser;

  async function deactivate() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const authUserId = currentAppUser.auth_user_id?.trim();
      if (!authUserId) throw new Error("Profile auth identity is missing");

      const { error: upErr } = await supabase
        .from("app_users")
        .update({ is_active: false })
        .eq("auth_user_id", authUserId);

      if (upErr) throw upErr;

      await supabase.auth.signOut();
      router.replace("/sign-in?reason=inactive");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not deactivate account");
      setBusy(false);
    }
  }

  return (
    <div className="mt-16 w-full max-w-[480px] rounded-[1.2rem] border border-red-200 bg-red-50/40 px-4 py-4 text-left sm:px-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-red-700">Danger zone</p>
      <h2 className="mt-2 text-base font-semibold text-slate-900">Deactivate account</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        You will be signed out and will not be able to use this workspace again with this login.
      </p>
      <div className="mt-4 flex w-full justify-start">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="w-fit shrink-0 rounded-[var(--radius-control)] bg-[var(--brand-dot)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-dot-hover)]"
        >
          Deactivate account
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.2)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 id={titleId} className="text-lg font-semibold text-slate-900">
              Deactivate account?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your access will end immediately after you confirm. Profile and activity in this app will no longer be
              available to you. This action is meant to be permanent for your login. You will be signed out and can only
              return if an administrator restores your access.
            </p>
            {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-[1.2rem] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deactivate()}
                className="rounded-[1.2rem] bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? "Working…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
