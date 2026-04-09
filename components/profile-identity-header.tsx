"use client";

import { AppUserAvatar } from "@/components/app-user-avatar";
import { appUserInitials } from "@/lib/auth/app-user-display";
import { createClient } from "@/lib/supabase";
import type { AppUserRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

type ProfileIdentityHeaderProps = {
  appUser: AppUserRow | null;
  displayName: string;
  subtitle: string;
};

function getSafeImageExt(fileName: string, mimeType: string | undefined | null): string {
  const raw = fileName.split(".").pop()?.toLowerCase();
  if (raw && ["png", "jpg", "jpeg", "webp", "gif"].includes(raw)) return raw;
  const mt = (mimeType ?? "").toLowerCase();
  if (mt.includes("png")) return "png";
  if (mt.includes("jpeg") || mt.includes("jpg")) return "jpg";
  if (mt.includes("webp")) return "webp";
  if (mt.includes("gif")) return "gif";
  return "png";
}

export function ProfileIdentityHeader({ appUser, displayName, subtitle }: ProfileIdentityHeaderProps) {
  const router = useRouter();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const canPick = Boolean(appUser) && !busy;
  const initials = appUserInitials(displayName);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetSelection() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    setError(null);
  }

  async function onSavePhoto() {
    setError(null);
    if (!selectedFile) return;
    if (!appUser) {
      setError("Profile data not found. Avatar upload is unavailable for this account.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const authUserId = appUser.auth_user_id?.trim();
      if (!authUserId) throw new Error("Profile auth identity is missing");

      const ext = getSafeImageExt(selectedFile.name, selectedFile.type);
      const filePath = `${authUserId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, {
          upsert: true,
          contentType: selectedFile.type || `image/${ext}`,
        });

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      const { error: updateErr } = await supabase
        .from("app_users")
        .update({ avatar_url: filePath })
        .eq("auth_user_id", authUserId);

      if (updateErr) throw new Error(`Profile row update failed: ${updateErr.message}`);

      resetSelection();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setBusy(false);
    }
  }

  const avatarBox = canPick ? (
    <label
      htmlFor={inputId}
      className="group relative mx-auto block h-32 w-32 shrink-0 cursor-pointer overflow-hidden rounded-[1.2rem] ring-1 ring-slate-300/80 transition-shadow hover:ring-[var(--brand-400)]/50 sm:mx-0"
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-full w-full rounded-[inherit] object-cover"
        />
      ) : (
        <AppUserAvatar
          avatarField={appUser?.avatar_url}
          initials={initials}
          fallbackClassName="text-2xl"
          imgClassName="h-full w-full object-cover"
        />
      )}
      <span
        className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent pb-2.5 text-[11px] font-bold uppercase tracking-wide text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:pb-3 sm:text-xs"
        aria-hidden
      >
        Change
      </span>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          setError(null);
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (!f) {
            resetSelection();
            return;
          }
          setSelectedFile(f);
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(f);
          });
        }}
      />
    </label>
  ) : (
    <div className="relative mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-[1.2rem] ring-1 ring-slate-300/80 sm:mx-0">
      <AppUserAvatar
        avatarField={appUser?.avatar_url}
        initials={initials}
        fallbackClassName="text-2xl"
        imgClassName="h-full w-full object-cover"
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 border-b border-slate-200/90 pb-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-8 sm:gap-y-2">
      {/* Row 1: avatar + name; both vertically centered in the row (tallest cell sets height) */}
      <div className="mx-auto shrink-0 justify-self-center sm:mx-0 sm:col-start-1 sm:row-start-1 sm:justify-self-start sm:self-center">
        {avatarBox}
      </div>
      <div className="min-w-0 pt-1 text-center sm:col-start-2 sm:row-start-1 sm:self-center sm:pt-2 sm:text-left">
        <h1 className="text-balance font-semibold tracking-tight text-slate-900 [font-size:clamp(1.5rem,1.25rem+0.85vw,1.875rem)] [line-height:1.2]">
          {displayName}
        </h1>
        <p className="mt-1 text-base leading-snug text-slate-600 sm:text-[1.0625rem]">{subtitle}</p>
      </div>

      {/* Hint / upload actions: column 1 only, below avatar */}
      <div className="mx-auto flex w-full max-w-[11rem] flex-col items-center gap-1.5 justify-self-center sm:col-start-1 sm:row-start-2 sm:mx-0 sm:w-32 sm:max-w-none sm:items-stretch sm:justify-self-start">
        {selectedFile ? (
          <div className="flex flex-nowrap items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSavePhoto()}
              className="inline-flex shrink-0 items-center justify-center rounded-[1.2rem] bg-[var(--brand-700)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={resetSelection}
              className="shrink-0 rounded-[1.2rem] px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-center text-[10px] leading-tight text-slate-500 sm:text-left">
            {appUser
              ? "Click your photo to choose a new image."
              : "Avatar upload is unavailable until your profile is linked."}
          </p>
        )}
        {error ? (
          <p className="text-center text-[10px] font-medium leading-tight text-rose-700 sm:text-left">{error}</p>
        ) : null}
      </div>
    </div>
  );
}

