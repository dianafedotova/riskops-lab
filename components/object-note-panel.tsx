"use client";

import { RichNoteContent } from "@/components/rich-note-content";
import { RichNoteEditor } from "@/components/rich-note-editor";
import { useCurrentUser } from "@/components/current-user-provider";
import { formatDateTime } from "@/lib/format";
import { useSimulatorComments } from "@/lib/hooks/use-simulator-comments";
import { canCreatePrivateNotes, canViewPrivateNotes } from "@/lib/permissions/checks";
import { createEmptyRichNoteValue, createRichNoteEditorValue, type RichNoteEditorValue } from "@/lib/rich-note";
import { useEffect, useMemo, useState } from "react";

type ObjectNotePanelProps = {
  title: string;
  mode?: "edit" | "read";
  alertInternalId?: string | null;
  simulatorUserId?: string | null;
  emptyMessage?: string;
  placeholder?: string;
  saveButtonLabel?: string;
};

const NOTICE_SUCCESS_CLASS =
  "inline-flex rounded-[0.9rem] border border-emerald-200 bg-emerald-50/95 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const NOTICE_ERROR_CLASS =
  "inline-flex rounded-[0.9rem] border border-rose-200 bg-rose-50/95 px-3.5 py-2 text-sm font-medium text-rose-800 shadow-[0_10px_22px_rgba(15,23,42,0.08)]";
const PANEL_CLASS =
  "space-y-4 rounded-[1.2rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(251,253,255,0.988),rgba(242,248,252,0.988))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_10px_24px_rgba(15,23,42,0.06)] sm:p-5";
const COMPOSER_CLASS =
  "content-panel border-[rgb(189_214_224_/_0.72)] bg-[linear-gradient(180deg,rgba(248,252,255,0.994),rgba(239,247,251,0.994))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(48,93,112,0.06)] sm:p-4.5";
const ENTRY_CLASS =
  "content-panel border-[rgb(189_214_224_/_0.6)] bg-[linear-gradient(180deg,rgba(255,255,255,0.992),rgba(246,250,253,0.992))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_6px_16px_rgba(15,23,42,0.04)]";
const ACTION_SECONDARY =
  "ui-btn ui-btn-secondary min-h-0 rounded-[0.95rem] px-3.5 py-1.5 text-[0.9rem] font-medium text-[var(--brand-700)] shadow-none";
const ACTION_PRIMARY =
  "ui-btn min-h-0 rounded-[1rem] border border-[rgb(164_198_210_/_0.9)] bg-[linear-gradient(180deg,rgba(222,238,246,0.98),rgba(197,221,232,0.98))] px-3.5 py-1.5 text-[0.92rem] font-semibold text-[rgb(42,82,97)] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_8px_16px_rgba(66,116,136,0.12)] hover:border-[rgb(140_183_199_/_0.96)] hover:bg-[linear-gradient(180deg,rgba(214,233,242,0.98),rgba(188,214,226,0.98))] hover:text-[rgb(34,69,82)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_18px_rgba(66,116,136,0.16)] disabled:cursor-not-allowed disabled:opacity-60";
const ACTION_DESTRUCTIVE =
  "ui-btn min-h-0 rounded-[0.95rem] border border-[rgb(149_52_63_/_0.26)] bg-white px-3.5 py-1.5 text-[0.9rem] font-medium text-[var(--brand-dot)] shadow-none hover:border-[rgb(149_52_63_/_0.44)] hover:bg-[rgb(149_52_63_/_0.06)] disabled:cursor-not-allowed disabled:opacity-60";

export function ObjectNotePanel({
  title,
  mode = "edit",
  alertInternalId = null,
  simulatorUserId = null,
  emptyMessage = "No note yet.",
  placeholder,
  saveButtonLabel = "Save note",
}: ObjectNotePanelProps) {
  const { appUser, loading: sessionLoading } = useCurrentUser();
  const [draft, setDraft] = useState<RichNoteEditorValue>(() => createEmptyRichNoteValue());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [okVisible, setOkVisible] = useState(false);

  const canView = canViewPrivateNotes(appUser?.role);
  const canEdit = mode === "edit" && canCreatePrivateNotes(appUser?.role);
  const scopeLabel = alertInternalId ? "alert" : simulatorUserId ? "profile" : "record";

  const {
    privateNotes,
    authorLabels,
    loading,
    error,
    addAdminPrivateComment,
    updateAdminPrivateComment,
    deleteAdminPrivateComment,
  } = useSimulatorComments({
    viewerAppUserId: appUser?.id ?? null,
    viewerRole: appUser?.role ?? null,
    includeAdminPrivate: canView,
    privateAlertInternalId: alertInternalId,
    privateSimulatorUserId: simulatorUserId,
  });

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

  const latestNote = useMemo(() => privateNotes[0] ?? null, [privateNotes]);
  const hasTarget = Boolean(alertInternalId || simulatorUserId);
  const defaultPlaceholder = `Add a personal note for this ${scopeLabel}...`;
  const showEditor = canEdit && (editing || !latestNote);
  const busy = loading || saving || deleting;

  async function onSave() {
    if (!appUser?.id || !draft.body.trim()) return;

    setSaving(true);
    setActionError(null);
    setOk(null);

    try {
      if (latestNote && editing) {
        await updateAdminPrivateComment(latestNote.id, draft, appUser.id);
      } else {
        await addAdminPrivateComment(draft, appUser.id);
      }
      setDraft(createEmptyRichNoteValue());
      setEditing(false);
      setOk(`${title} saved.`);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : `Could not save ${scopeLabel} note.`);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!appUser?.id || !latestNote) return;

    setDeleting(true);
    setActionError(null);
    setOk(null);

    try {
      await deleteAdminPrivateComment(latestNote.id, appUser.id);
      setDraft(createEmptyRichNoteValue());
      setEditing(false);
      setOk(`${title} deleted.`);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : `Could not delete ${scopeLabel} note.`);
    } finally {
      setDeleting(false);
    }
  }

  function startEdit() {
    if (!latestNote) return;
    setActionError(null);
    setOk(null);
    setDraft(
      createRichNoteEditorValue({
        body: latestNote.body,
        bodyJson: latestNote.body_json ?? null,
        bodyFormat: latestNote.body_format ?? null,
      })
    );
    setEditing(true);
  }

  return (
    <div className={PANEL_CLASS}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--app-shell-bg)]">
          {title}
        </h3>
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

      {actionError ? (
        <div className={NOTICE_ERROR_CLASS} role="alert">
          {actionError}
        </div>
      ) : null}

      {error ? (
        <div className={NOTICE_ERROR_CLASS} role="alert">
          {error}
        </div>
      ) : null}

      {!hasTarget ? (
        <div className="empty-state text-left">Note target is missing.</div>
      ) : sessionLoading ? (
        <div className="empty-state text-left">Loading session…</div>
      ) : !appUser ? (
        <div className="empty-state text-left">Sign in to view this note.</div>
      ) : !canView ? (
        <div className="empty-state text-left">This note is available only to staff.</div>
      ) : (
        <>
          {showEditor ? (
            <div className={COMPOSER_CLASS}>
              <RichNoteEditor
                value={draft}
                onChange={setDraft}
                placeholder={placeholder ?? defaultPlaceholder}
                onSubmitShortcut={() => {
                  void onSave();
                }}
                size="default"
                disabled={busy}
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 pt-1">
                {latestNote ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDraft(createEmptyRichNoteValue());
                      setEditing(false);
                      setActionError(null);
                      setOk(null);
                    }}
                    className={ACTION_SECONDARY}
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy || !draft.body.trim()}
                  onClick={() => {
                    void onSave();
                  }}
                  className={ACTION_PRIMARY}
                >
                  {saving ? "Saving..." : saveButtonLabel}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : latestNote ? (
            <div className={ENTRY_CLASS}>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-[0.82rem] text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Saved {formatDateTime(latestNote.updated_at ?? latestNote.created_at)}</span>
                  {latestNote.author_app_user_id !== appUser.id && authorLabels[latestNote.author_app_user_id] ? (
                    <span>by {authorLabels[latestNote.author_app_user_id]}</span>
                  ) : null}
                </div>
                {canEdit && !showEditor ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={startEdit} className={ACTION_SECONDARY}>
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void onDelete();
                      }}
                      className={ACTION_DESTRUCTIVE}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </div>
              <RichNoteContent
                body={latestNote.body}
                bodyJson={latestNote.body_json}
                bodyFormat={latestNote.body_format}
                className="pt-1 text-[0.95rem] leading-7 text-slate-900"
              />
            </div>
          ) : showEditor ? null : (
            <div className="empty-state text-left">{emptyMessage}</div>
          )}
        </>
      )}
    </div>
  );
}
