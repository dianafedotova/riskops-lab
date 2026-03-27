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
  const [signedSrc, setSignedSrc] = useState<{ objectPath: string; url: string } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const raw = avatarField?.trim() ?? "";
  const objectPath = raw ? avatarsObjectPathFromDbValue(raw) : null;

  useEffect(() => {
    if (!objectPath) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data, error } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(objectPath, 3600);
      if (cancelled) return;
      if (!error && data?.signedUrl) {
        setSignedSrc({ objectPath, url: data.signedUrl });
        return;
      }
      setSignedSrc({
        objectPath,
        url: supabase.storage.from(AVATARS_BUCKET).getPublicUrl(objectPath).data.publicUrl,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [objectPath]);

  const shell = "block h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[inherit]";
  const src = objectPath ? (signedSrc?.objectPath === objectPath ? signedSrc.url : null) : raw || null;
  const shouldShowFallback = !src || failedSrc === src;

  if (shouldShowFallback) {
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
        onError={() => setFailedSrc(src)}
      />
    </span>
  );
}
