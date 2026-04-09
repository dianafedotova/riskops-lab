"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import {
  buildRichNoteStorageFields,
  createRichNoteEditorExtensions,
  createRichNoteEditorValue,
  type RichNoteEditorValue,
  type RichNoteStorageValue,
} from "@/lib/rich-note";

type Props = {
  value: RichNoteStorageValue;
  onChange: (nextValue: RichNoteEditorValue) => void;
  placeholder: string;
  onSubmitShortcut?: (() => void) | null;
  size?: "default" | "compact";
  className?: string;
  disabled?: boolean;
};

type ToolbarAction = {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarIcon({
  children,
  className = "",
  viewBox = "0 0 16 16",
}: {
  children: ReactNode;
  className?: string;
  viewBox?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      className={`h-[0.82rem] w-[0.82rem] shrink-0 stroke-current ${className}`}
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function ToolbarButton({
  action,
  size,
  disabled = false,
}: {
  action: ToolbarAction;
  size: "default" | "compact";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || action.disabled}
      onClick={action.onClick}
      title={action.label}
      aria-label={action.label}
      className={[
        "inline-flex items-center justify-center rounded-[1rem] border transition",
        size === "compact" ? "h-6.5 min-w-6.5 px-1.5" : "h-8 min-w-8 px-1.75",
        action.active
          ? "border-[rgba(23,77,82,0.22)] bg-[rgb(232_242_241)] text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
        "disabled:cursor-not-allowed disabled:opacity-45",
      ].join(" ")}
    >
      {action.icon}
    </button>
  );
}

export function RichNoteEditor({
  value,
  onChange,
  placeholder,
  onSubmitShortcut = null,
  size = "default",
  className = "",
  disabled = false,
}: Props) {
  const initialValue = useMemo(() => createRichNoteEditorValue(value), [value]);
  const extensions = useMemo(() => createRichNoteEditorExtensions(placeholder), [placeholder]);
  const submitShortcutRef = useRef(onSubmitShortcut);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    submitShortcutRef.current = onSubmitShortcut;
  }, [onSubmitShortcut]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !disabled,
      extensions,
      content: initialValue.bodyJson,
      editorProps: {
        attributes: {
          class: [
            "rich-note-editor-root focus:outline-none focus-visible:outline-none focus-visible:shadow-none text-slate-900",
            size === "compact" ? "min-h-[3.2rem] px-3.5 py-3 text-sm leading-6" : "min-h-[4.8rem] px-5 py-4 text-[15px] leading-7",
            "[&_.is-editor-empty:first-child]:before:pointer-events-none",
            "[&_.is-editor-empty:first-child]:before:float-left",
            "[&_.is-editor-empty:first-child]:before:h-0",
            "[&_.is-editor-empty:first-child]:before:text-slate-400",
            "[&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
            "[&_a]:pointer-events-none [&_a]:cursor-text [&_a]:text-inherit [&_a]:no-underline",
            "[&_p]:my-0 [&_p+ul]:mt-2 [&_p+ol]:mt-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600",
          ].join(" "),
        },
        handleDOMEvents: {
          mousedown: (view, event) => {
            if (!(event.target instanceof HTMLElement) || !event.target.closest("a")) {
              return false;
            }

            event.preventDefault();
            view.focus();
            return true;
          },
          click: (view, event) => {
            if (!(event.target instanceof HTMLElement) || !event.target.closest("a")) {
              return false;
            }

            event.preventDefault();
            view.focus();
            return true;
          },
        },
        handleKeyDown: (_view, event) => {
          if (event.isComposing) return false;
          if (onSubmitShortcut && (event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            submitShortcutRef.current?.();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: nextEditor }) => {
        const bodyJson = nextEditor.getJSON();
        const nextFields = buildRichNoteStorageFields({
          body: "",
          bodyJson,
          bodyFormat: "tiptap_json",
        });

        onChangeRef.current({
          body: nextFields.body,
          bodyJson: nextFields.body_json ?? bodyJson,
          bodyFormat: "tiptap_json",
        });
      },
    },
    [disabled, extensions, size]
  );

  useEffect(() => {
    if (!editor) return;

    const currentJson = JSON.stringify(editor.getJSON());
    const nextJson = JSON.stringify(initialValue.bodyJson);

    if (currentJson !== nextJson) {
      editor.commands.setContent(initialValue.bodyJson, { emitUpdate: false });
    }
  }, [editor, initialValue.bodyJson]);

  const toolbarState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        if (!currentEditor) {
          return {
            canUndo: false,
            canRedo: false,
            isBold: false,
            isItalic: false,
            isBulletList: false,
            isOrderedList: false,
            isBlockquote: false,
          };
        }

        return {
          canUndo: currentEditor.can().chain().focus().undo().run(),
          canRedo: currentEditor.can().chain().focus().redo().run(),
          isBold: currentEditor.isActive("bold"),
          isItalic: currentEditor.isActive("italic"),
          isBulletList: currentEditor.isActive("bulletList"),
          isOrderedList: currentEditor.isActive("orderedList"),
          isBlockquote: currentEditor.isActive("blockquote"),
        };
      },
    }) ?? {
      canUndo: false,
      canRedo: false,
      isBold: false,
      isItalic: false,
      isBulletList: false,
      isOrderedList: false,
      isBlockquote: false,
    };

  const undoAction: ToolbarAction | null = editor
    ? {
        label: "Undo",
        icon: (
          <ToolbarIcon>
            <path d="M6 4 3.5 6.5 6 9" />
            <path d="M4 6.5h5a3 3 0 1 1 0 6H7.5" />
          </ToolbarIcon>
        ),
        disabled: !toolbarState.canUndo,
        onClick: () => editor.chain().focus().undo().run(),
      }
    : null;

  const redoAction: ToolbarAction | null = editor
    ? {
        label: "Redo",
        icon: (
          <ToolbarIcon>
            <path d="m10 4 2.5 2.5L10 9" />
            <path d="M12 6.5H7a3 3 0 1 0 0 6h1.5" />
          </ToolbarIcon>
        ),
        disabled: !toolbarState.canRedo,
        onClick: () => editor.chain().focus().redo().run(),
      }
    : null;

  const boldAction: ToolbarAction | null = editor
    ? {
        label: "Bold",
        icon: (
          <ToolbarIcon className="fill-none">
            <path d="M5 3.5h3.5a2.2 2.2 0 0 1 0 4.4H5z" />
            <path d="M5 7.9h4a2.3 2.3 0 0 1 0 4.6H5z" />
          </ToolbarIcon>
        ),
        active: toolbarState.isBold,
        onClick: () => editor.chain().focus().toggleBold().run(),
      }
    : null;

  const italicAction: ToolbarAction | null = editor
    ? {
        label: "Italic",
        icon: (
          <ToolbarIcon>
            <path d="M9.75 3.5h-3.5" />
            <path d="M9.75 12.5h-3.5" />
            <path d="M8.5 3.5 6.5 12.5" />
          </ToolbarIcon>
        ),
        active: toolbarState.isItalic,
        onClick: () => editor.chain().focus().toggleItalic().run(),
      }
    : null;

  const bulletListAction: ToolbarAction | null = editor
    ? {
        label: "Bullet list",
        icon: (
          <ToolbarIcon>
            <circle cx="3" cy="4.5" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="3" cy="8" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="3" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
            <path d="M5.5 4.5H13" />
            <path d="M5.5 8H13" />
            <path d="M5.5 11.5H13" />
          </ToolbarIcon>
        ),
        active: toolbarState.isBulletList,
        onClick: () => editor.chain().focus().toggleBulletList().run(),
      }
    : null;

  const orderedListAction: ToolbarAction | null = editor
    ? {
        label: "Numbered list",
        icon: (
          <ToolbarIcon>
            <path d="M2.2 4.2h1.2v3" />
            <path d="M1.9 7.2h1.8" />
            <path d="M2 9.4c.2-.3.5-.4.9-.4.6 0 1 .3 1 .8 0 .4-.2.7-.7 1L2 11.7h2" />
            <path d="M5.8 4.5H13" />
            <path d="M5.8 8H13" />
            <path d="M5.8 11.5H13" />
          </ToolbarIcon>
        ),
        active: toolbarState.isOrderedList,
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
      }
    : null;

  const blockquoteAction: ToolbarAction | null = editor
    ? {
        label: "Quote",
        icon: (
          <ToolbarIcon>
            <path d="M4.8 5.2H3.5A1.5 1.5 0 0 0 2 6.7v1.8A1.5 1.5 0 0 0 3.5 10h1.3V8.2H3.7" />
            <path d="M12.5 5.2h-1.3a1.5 1.5 0 0 0-1.5 1.5v1.8A1.5 1.5 0 0 0 11.2 10h1.3V8.2h-1.1" />
          </ToolbarIcon>
        ),
        active: toolbarState.isBlockquote,
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
      }
    : null;

  return (
    <div className={`rich-note-shell overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-white/96 ${className}`}>
      <div
        className={`rich-note-toolbar flex flex-wrap items-center gap-2 border-b border-slate-200/85 ${
          size === "compact" ? "px-3 py-2" : "px-4 py-2.5"
        }`}
      >
        {undoAction ? <ToolbarButton action={undoAction} size={size} disabled={disabled} /> : null}
        {redoAction ? <ToolbarButton action={redoAction} size={size} disabled={disabled} /> : null}
        {boldAction ? <ToolbarButton action={boldAction} size={size} disabled={disabled} /> : null}
        {italicAction ? <ToolbarButton action={italicAction} size={size} disabled={disabled} /> : null}
        {bulletListAction ? <ToolbarButton action={bulletListAction} size={size} disabled={disabled} /> : null}
        {orderedListAction ? <ToolbarButton action={orderedListAction} size={size} disabled={disabled} /> : null}
        {blockquoteAction ? <ToolbarButton action={blockquoteAction} size={size} disabled={disabled} /> : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
