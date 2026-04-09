import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import type { Extensions, JSONContent } from "@tiptap/core";
import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import type { RichNoteFormat } from "@/lib/types";

export type RichNoteStorageValue = {
  body: string;
  bodyJson?: JSONContent | null;
  bodyFormat?: RichNoteFormat | null;
};

export type RichNoteEditorValue = {
  body: string;
  bodyJson: JSONContent;
  bodyFormat: "tiptap_json";
};

const SAFE_LINK_PROTOCOLS = ["http", "https", "mailto"] as const;

function createBaseRichNoteExtensions(): Extensions {
  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      strike: false,
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
      protocols: [...SAFE_LINK_PROTOCOLS],
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer",
        class: "rich-note-link",
      },
      isAllowedUri: (url, ctx) => {
        const trimmed = url.trim().toLowerCase();
        if (trimmed.startsWith("mailto:")) return true;
        return ctx.defaultValidate(url) && (trimmed.startsWith("http://") || trimmed.startsWith("https://"));
      },
    }),
  ];
}

export const richNoteRenderExtensions = createBaseRichNoteExtensions();

export function createRichNoteEditorExtensions(placeholder?: string): Extensions {
  return placeholder
    ? [...createBaseRichNoteExtensions(), Placeholder.configure({ placeholder })]
    : createBaseRichNoteExtensions();
}

export function isSafeRichNoteHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:");
}

export function createEmptyRichNoteDocument(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export function createRichNoteDocumentFromText(text: string): JSONContent {
  const normalizedText = text.replace(/\r/g, "");
  const trimmed = normalizedText.trim();

  if (!trimmed) {
    return createEmptyRichNoteDocument();
  }

  const paragraphs = normalizedText.split(/\n\s*\n/);

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => {
      const lines = paragraph.split("\n");
      const content: JSONContent[] = [];

      lines.forEach((line, index) => {
        if (line) {
          content.push({
            type: "text",
            text: line,
          });
        }

        if (index < lines.length - 1) {
          content.push({ type: "hardBreak" });
        }
      });

      return content.length
        ? { type: "paragraph", content }
        : { type: "paragraph" };
    }),
  };
}

export function getPlainTextFromRichNote(document: JSONContent): string {
  return generateText(document, richNoteRenderExtensions, {
    blockSeparator: "\n\n",
  });
}

function isJsonContent(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && "type" in value;
}

export function resolveRichNoteDocument(value: RichNoteStorageValue): JSONContent {
  if ((value.bodyFormat === "tiptap_json" || value.bodyJson) && isJsonContent(value.bodyJson)) {
    return value.bodyJson;
  }

  return createRichNoteDocumentFromText(value.body);
}

export function createEmptyRichNoteValue(): RichNoteEditorValue {
  const bodyJson = createEmptyRichNoteDocument();

  return {
    body: "",
    bodyJson,
    bodyFormat: "tiptap_json",
  };
}

export function createRichNoteEditorValue(value: RichNoteStorageValue): RichNoteEditorValue {
  const bodyJson = resolveRichNoteDocument(value);

  return {
    body: getPlainTextFromRichNote(bodyJson),
    bodyJson,
    bodyFormat: "tiptap_json",
  };
}

export function buildRichNoteStorageFields(value: RichNoteStorageValue): {
  body: string;
  body_json: JSONContent | null;
  body_format: RichNoteFormat;
} {
  if (value.bodyFormat === "tiptap_json" || value.bodyJson) {
    const bodyJson = resolveRichNoteDocument(value);

    return {
      body: getPlainTextFromRichNote(bodyJson),
      body_json: bodyJson,
      body_format: "tiptap_json",
    };
  }

  return {
    body: value.body,
    body_json: null,
    body_format: "plain_text",
  };
}
