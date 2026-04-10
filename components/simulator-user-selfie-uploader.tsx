"use client";

import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useEffect, useId, useState } from "react";

type SimulatorUserSelfieUploaderProps = {
  canEdit: boolean;
  displayName: string;
  selfiePath: string | null | undefined;
  selfieUrl: string | null;
  userId: string;
  onUpdated: (nextPath: string) => void;
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

export function SimulatorUserSelfieUploader({
  canEdit,
  displayName,
  selfiePath: _selfiePath,
  selfieUrl,
  userId,
  onUpdated,
}: SimulatorUserSelfieUploaderProps) {
  void _selfiePath;
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [selfieUrl]);

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

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = getSafeImageExt(selectedFile.name, selectedFile.type);
      const filePath = `sim-users/${userId}/selfie.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("selfie")
        .upload(filePath, selectedFile, {
          upsert: true,
          contentType: selectedFile.type || `image/${ext}`,
        });

      if (uploadErr) {
        const uploadMessage = uploadErr.message.includes("row-level security")
          ? "Storage upload failed: selfie bucket staff-write policy is missing in the current database. Apply the latest Supabase migrations and try again."
          : `Storage upload failed: ${uploadErr.message}`;
        throw new Error(uploadMessage);
      }

      const { error: updateErr } = await supabase
        .from("users")
        .update({ selfie_path: filePath })
        .eq("id", userId);

      if (updateErr) throw new Error(`Profile row update failed: ${updateErr.message}`);

      resetSelection();
      onUpdated(filePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Selfie upload failed");
    } finally {
      setBusy(false);
    }
  }

  const canPick = canEdit && !busy;
  const currentVisual = previewUrl ?? (imageLoadFailed ? null : selfieUrl);

  return (
    <div className="shrink-0 sm:self-center">
      <div className="flex flex-col items-center gap-2 sm:items-start">
        {canPick ? (
          <label
            htmlFor={inputId}
            className="group relative block h-12 w-12 cursor-pointer overflow-hidden rounded-[1.2rem] border border-slate-300 bg-slate-200 shadow-sm sm:h-[7.5rem] sm:w-[7.5rem]"
          >
            {currentVisual ? (
              <Image
                src={currentVisual}
                alt=""
                unoptimized
                fill
                sizes="120px"
                role="presentation"
                onError={() => setImageLoadFailed(true)}
                className="object-cover"
              />
            ) : (
              <Image
                src="/user-maya-chen-placeholder.svg"
                alt={`${displayName} profile photo`}
                fill
                sizes="120px"
                className="object-cover"
              />
            )}
            <span
              className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent pb-1 text-[9px] font-bold uppercase tracking-wide text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:pb-2.5 sm:text-[11px]"
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
              onChange={(event) => {
                setError(null);
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                if (!file) {
                  resetSelection();
                  return;
                }
                setSelectedFile(file);
                setPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return URL.createObjectURL(file);
                });
              }}
            />
          </label>
        ) : (
          <div className="relative h-12 w-12 overflow-hidden rounded-[1.2rem] border border-slate-300 bg-slate-200 shadow-sm sm:h-[7.5rem] sm:w-[7.5rem]">
            {currentVisual ? (
              <Image
                src={currentVisual}
                alt=""
                unoptimized
                fill
                sizes="120px"
                role="presentation"
                onError={() => setImageLoadFailed(true)}
                className="object-cover"
              />
            ) : (
              <Image
                src="/user-maya-chen-placeholder.svg"
                alt={`${displayName} profile photo`}
                fill
                sizes="120px"
                className="object-cover"
              />
            )}
          </div>
        )}

        {selectedFile ? (
          <div className="flex flex-nowrap items-center gap-2">
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
        ) : null}

        {error ? (
          <p className="max-w-[9rem] text-center text-[10px] font-medium leading-tight text-rose-700 sm:max-w-[7.5rem] sm:text-left">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
