"use client";

import { RichNoteContent } from "@/components/rich-note-content";
import { RichNoteEditor } from "@/components/rich-note-editor";
import { useCurrentUser } from "@/components/current-user-provider";
import { formatDateTime } from "@/lib/format";
import { createEmptyRichNoteValue, createRichNoteEditorValue, type RichNoteEditorValue } from "@/lib/rich-note";
import {
  deleteReviewThreadInternalNote,
  getReviewThreadInternalNote,
  saveReviewThreadInternalNote,
} from "@/lib/services/review-thread-internal-notes";
import { createClient } from "@/lib/supabase";
import type { ReviewThreadInternalNoteRow } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  threadId?: string | null;
  title?: string;
  noThreadMessage?: string;
  variant?: "drafts" | "review";
};

const NOTICE_SUCCESS_CLASS =
  "inline-flex rounded-[0.9rem] border border-emerald-200 bg-emerald-50/95 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const NOTICE_ERROR_CLASS =
  "inline-flex rounded-[0.9rem] border border-rose-200 bg-rose-50/95 px-3.5 py-2 text-sm font-medium text-rose-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const ACTION_BASE =
  "ui-btn min-h-0 rounded-[0.95rem] px-3.5 py-1.5 text-[0.9rem] font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const ACTION_SECONDARY = `${ACTION_BASE} ui-btn-secondary text-[var(--brand-700)] shadow-none`;
const ACTION_DESTRUCTIVE = `${ACTION_BASE} border border-[rgb(149_52_63_/_0.26)] bg-white text-[var(--brand-dot)] shadow-none hover:border-[rgb(149_52_63_/_0.44)] hover:bg-[rgb(149_52_63_/_0.06)]`;
const ACTION_SAVE_DRAFT =
  "ui-btn min-h-0 rounded-[1rem] border border-[rgb(217_173_93_/_0.88)] bg-[linear-gradient(180deg,rgba(249,231,185,0.98),rgba(238,205,137,0.98))] px-3.5 py-1.5 text-[0.92rem] font-semibold text-[rgb(112,74,25)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_16px_rgba(171,128,55,0.16)] hover:border-[rgb(197_154_79_/_0.92)] hover:bg-[linear-gradient(180deg,rgba(244,223,170,0.98),rgba(231,195,122,0.98))] hover:text-[rgb(96,63,19)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_10px_18px_rgba(171,128,55,0.2)] disabled:cursor-not-allowed disabled:opacity-60";
const REVIEW_PANEL_CLASS =
  "rounded-[1.1rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(251,246,233,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_20px_rgba(185,133,77,0.06)]";
const REVIEW_INNER_CLASS =
  "rounded-[1rem] border border-amber-200/95 bg-[linear-gradient(180deg,rgba(252,246,229,0.96),rgba(247,237,208,0.94))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_14px_rgba(185,133,77,0.08)]";
const TIMESTAMP_CLASS = "text-[0.76rem] leading-none tabular-nums text-slate-400";
const INTERNAL_BADGE_CLASS =
  "ui-badge border-[rgb(226_196_136_/_0.98)] bg-[linear-gradient(180deg,rgba(248,241,221,0.96),rgba(244,234,206,0.96))] px-3 py-1 text-[0.78rem] font-medium text-[rgb(163,117,56)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]";

export function ReviewThreadInternalNotePanel({
  threadId = null,
  title = "Case Note",
  noThreadMessage = "Open a review case to view or edit the shared case note.",
  variant = "drafts",
}: Props) {
  const { appUser, loading: sessionLoading } = useCurrentUser();
  const [internalNote, setInternalNote] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [savedInternalNote, setSavedInternalNote] = useState<ReviewThreadInternalNoteRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [okVisible, setOkVisible] = useState(false);

  useEffect(() => {
    if (!ok) {
      setOkVisible(false);
      return;
    }

    setOkVisible(true);
    const hideTimer = window.setTimeout(() => setOkVisible(false), 2200);
    const clearTimer = window.setTimeout(() => setOk(null), 2550);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [ok]);

  useEffect(() => {
    if (!threadId) {
      setSavedInternalNote(null);
      setInternalNote(createEmptyRichNoteValue());
      setEditing(false);
      setLoading(false);
      setError(null);
      return;
    }

    const id = threadId;
    let cancelled = false;

    async function loadInternalNote() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const result = await getReviewThreadInternalNote(supabase, id);
      if (cancelled) return;

      if (result.error) {
        setSavedInternalNote(null);
        setInternalNote(createEmptyRichNoteValue());
        setEditing(true);
        setError(result.error);
        setLoading(false);
        return;
      }

      setSavedInternalNote(result.note);
      if (variant === "drafts") {
        setInternalNote(createEmptyRichNoteValue());
        setEditing(false);
      } else {
        setInternalNote(
          createRichNoteEditorValue({
            body: result.note?.body ?? "",
            bodyJson: result.note?.body_json ?? null,
            bodyFormat: result.note?.body_format ?? null,
          })
        );
        setEditing(!result.note?.body.trim());
      }
      setLoading(false);
    }

    void loadInternalNote();

    return () => {
      cancelled = true;
    };
  }, [threadId, variant]);

  const saveInternalNote = useCallback(async () => {
    if (!threadId || !appUser?.id || !internalNote.body.trim()) return;

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const supabase = createClient();
      const result = await saveReviewThreadInternalNote(supabase, {
        threadId,
        appUserId: appUser.id,
        body: internalNote.body,
        bodyJson: internalNote.bodyJson ?? null,
        bodyFormat: internalNote.bodyFormat ?? null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedInternalNote(result.note);
      if (variant === "drafts") {
        setInternalNote(createEmptyRichNoteValue());
      } else {
        setInternalNote(
          createRichNoteEditorValue({
            body: result.note?.body ?? "",
            bodyJson: result.note?.body_json ?? null,
            bodyFormat: result.note?.body_format ?? null,
          })
        );
      }
      setEditing(false);
      setOk("Case note saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save internal note.");
    } finally {
      setSaving(false);
    }
  }, [appUser?.id, internalNote, threadId, variant]);

  const deleteInternalNote = useCallback(async () => {
    if (!threadId) return;

    setDeleting(true);
    setError(null);
    setOk(null);

    try {
      const supabase = createClient();
      const result = await deleteReviewThreadInternalNote(supabase, threadId);
      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedInternalNote(null);
      setInternalNote(createEmptyRichNoteValue());
      setEditing(true);
      setOk("Case note deleted.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete internal note.");
    } finally {
      setDeleting(false);
    }
  }, [threadId]);

  const panelClass = REVIEW_PANEL_CLASS;
  const innerClass = useMemo(() => {
    if (variant === "review") return REVIEW_INNER_CLASS;
    return "content-panel bg-[linear-gradient(180deg,rgba(255,255,255,0.976),rgba(248,251,254,0.988))] p-3.5 sm:p-4.5";
  }, [variant]);
  const draftComposerClass =
    "content-panel border-[rgb(226_196_136_/_0.72)] bg-[linear-gradient(180deg,rgba(255,253,246,0.992),rgba(251,245,228,0.992))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(185,133,77,0.08)] sm:p-4.5";
  const draftSavedClass =
    "content-panel border-[rgb(226_196_136_/_0.58)] bg-[linear-gradient(180deg,rgba(255,254,250,0.988),rgba(250,247,238,0.99))] p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_7px_16px_rgba(185,133,77,0.06)]";
  const saveButtonClass = variant === "review" ? ACTION_SECONDARY : ACTION_SAVE_DRAFT;
  const disabled = sessionLoading || !appUser?.id || loading || saving || deleting;
  const draftHeadingClass = "text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]";
  const hasSavedNote = Boolean(savedInternalNote?.body.trim());

  if (variant === "drafts") {
    return (
      <div className="space-y-4 rounded-[1.2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,252,245,0.985),rgba(250,244,229,0.985))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_20px_rgba(185,133,77,0.08)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className={draftHeadingClass}>{title}</h3>
          {ok ? (
            <div
              className={`pointer-events-none transition-all duration-300 ease-out ${
                okVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
            >
              <div className={NOTICE_SUCCESS_CLASS} role="status" aria-live="polite">
                {ok}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className={NOTICE_ERROR_CLASS} role="alert">
            {error}
          </div>
        ) : null}

        {!threadId ? (
          <div className="empty-state text-left">{noThreadMessage}</div>
        ) : sessionLoading ? (
          <div className="empty-state text-left">Loading session…</div>
        ) : !appUser ? (
          <div className="empty-state text-left">Sign in to edit this note.</div>
        ) : (
          <>
            <div className={draftComposerClass}>
              <RichNoteEditor
                value={internalNote}
                onChange={setInternalNote}
                placeholder="Add a note for this review case..."
                onSubmitShortcut={() => {
                  void saveInternalNote();
                }}
                size="default"
                disabled={disabled}
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 pt-1">
                {editing && hasSavedNote ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setError(null);
                      setOk(null);
                      setInternalNote(createEmptyRichNoteValue());
                      setEditing(false);
                    }}
                    className={ACTION_SECONDARY}
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={disabled || !internalNote.body.trim()}
                  onClick={() => {
                    void saveInternalNote();
                  }}
                  className={saveButtonClass}
                >
                  {saving ? "Saving..." : "Save case note"}
                </button>
              </div>
            </div>

            {hasSavedNote ? (
                <div className={draftSavedClass}>
                <div className="p-4 sm:p-4.5">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2.5 text-[0.9rem] text-slate-500">
                      <span className={INTERNAL_BADGE_CLASS}>Case</span>
                      <span className="text-[0.82rem] text-slate-500">Saved {formatDateTime(savedInternalNote!.updated_at)}</span>
                    </div>
                  <RichNoteContent
                    body={savedInternalNote!.body}
                    bodyJson={savedInternalNote!.body_json}
                    bodyFormat={savedInternalNote!.body_format}
                    className="pt-1 text-[0.95rem] leading-7 text-slate-900"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200/80 px-4 py-3 sm:px-4.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setError(null);
                      setOk(null);
                      setInternalNote(
                        createRichNoteEditorValue({
                          body: savedInternalNote!.body,
                          bodyJson: savedInternalNote!.body_json ?? null,
                          bodyFormat: savedInternalNote!.body_format ?? null,
                        })
                      );
                      setEditing(true);
                    }}
                    className={ACTION_SECONDARY}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      void deleteInternalNote();
                    }}
                    className={ACTION_DESTRUCTIVE}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">No notes yet.</div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variant === "review" ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="heading-section flex-1 border-b-0 border-transparent pb-0 pr-2">{title}</h2>
            <div className="flex min-h-[2rem] items-start justify-end">
              {ok ? (
                <div
                  className={`pointer-events-none transition-all duration-300 ease-out ${
                    okVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                  }`}
                >
                  <div className={NOTICE_SUCCESS_CLASS} role="status" aria-live="polite">
                    {ok}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 border-b border-[var(--border-subtle)]" aria-hidden />
        </div>
      ) : null}
      <div className={panelClass}>
        <div className="space-y-3">
          {error ? (
            <div className={NOTICE_ERROR_CLASS} role="alert">
              {error}
            </div>
          ) : null}

          {!threadId ? (
            <div className="empty-state text-left">{noThreadMessage}</div>
          ) : sessionLoading ? (
            <div className="empty-state text-left">Loading session…</div>
          ) : !appUser ? (
            <div className="empty-state text-left">Sign in to edit this note.</div>
          ) : (
            <>
              {loading ? <p className="text-xs text-slate-400">Loading…</p> : null}

              {savedInternalNote?.body.trim() && !editing ? (
                <>
                  <div className={innerClass}>
                    <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                      <span>Last saved</span>
                      <span className={TIMESTAMP_CLASS}>{formatDateTime(savedInternalNote.updated_at)}</span>
                    </div>
                    <RichNoteContent
                      body={savedInternalNote.body}
                      bodyJson={savedInternalNote.body_json}
                      bodyFormat={savedInternalNote.body_format}
                      className="text-[0.95rem] leading-6 text-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setError(null);
                        setOk(null);
                        setInternalNote(
                          createRichNoteEditorValue({
                            body: savedInternalNote.body,
                            bodyJson: savedInternalNote.body_json ?? null,
                            bodyFormat: savedInternalNote.body_format ?? null,
                          })
                        );
                        setEditing(true);
                      }}
                      className={ACTION_SECONDARY}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        void deleteInternalNote();
                      }}
                      className={ACTION_DESTRUCTIVE}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              ) : null}

              {(editing || !savedInternalNote?.body.trim()) && !loading ? (
                <>
                  <div className={innerClass}>
                    <RichNoteEditor
                      value={internalNote}
                      onChange={setInternalNote}
                      placeholder="Add a private reminder for this review case..."
                      onSubmitShortcut={() => {
                        void saveInternalNote();
                      }}
                      size="default"
                      disabled={disabled}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {savedInternalNote?.body.trim() ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setError(null);
                          setOk(null);
                          setInternalNote(
                            createRichNoteEditorValue({
                              body: savedInternalNote.body,
                              bodyJson: savedInternalNote.body_json ?? null,
                              bodyFormat: savedInternalNote.body_format ?? null,
                            })
                          );
                          setEditing(false);
                        }}
                        className={ACTION_SECONDARY}
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={disabled || !internalNote.body.trim()}
                      onClick={() => {
                        void saveInternalNote();
                      }}
                      className={saveButtonClass}
                    >
                      {saving ? "Saving..." : "Save case note"}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
