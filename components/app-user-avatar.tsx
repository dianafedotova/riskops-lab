"use client";

import { avatarsObjectPathFromDbValue, AVATARS_BUCKET } from "@/lib/storage/avatars-path";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

type AppUserAvatarProps = {
  /** `avatar_url` from DB: storage path and/or legacy full public URL */
  avatarField: string | null | undefined;
  initials: string;
  /** Classes for the initials fallback (e.g. `text-lg` vs `text-xs`) */
  fallbackClassName?: string;
  imgClassName?: string;
};

export function AppUserAvatar({ avatarField, initials, fallbackClassName, imgClassName }: AppUserAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setShowFallback(false);
    const raw = avatarField?.trim();
    if (!raw) {
      setSrc(null);
      return;
    }

    const objectPath = avatarsObjectPathFromDbValue(raw);
    if (!objectPath) {
      setSrc(raw);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data, error } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(objectPath, 3600);
      if (cancelled) return;
      if (!error && data?.signedUrl) {
        setSrc(data.signedUrl);
        return;
      }
      setSrc(supabase.storage.from(AVATARS_BUCKET).getPublicUrl(objectPath).data.publicUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarField]);

  const shell = "block h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[inherit]";

  if (!src || showFallback) {
    return (
      <span className={shell}>
        <span
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5e8d9c]/40 via-[#5e8d9c]/20 to-slate-300/35 font-bold text-slate-800 ${fallbackClassName ?? ""}`}
          aria-hidden
        >
          {initials}
        </span>
      </span>
    );
  }

  return (
    <span className={shell}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed / external URLs */}
      <img
        src={src}
        alt=""
        className={imgClassName ?? "h-full w-full object-cover"}
        onError={() => setShowFallback(true)}
      />
    </span>
  );
}
