import { generateHTML } from "@tiptap/html";

import {
  resolveRichNoteDocument,
  richNoteRenderExtensions,
  type RichNoteStorageValue,
} from "@/lib/rich-note";

type Props = RichNoteStorageValue & {
  className?: string;
};

export function RichNoteContent({
  body,
  bodyJson,
  bodyFormat,
  className = "",
}: Props) {
  let html = "";

  try {
    html = generateHTML(
      resolveRichNoteDocument({
        body,
        bodyJson,
        bodyFormat,
      }),
      richNoteRenderExtensions
    );
  } catch {
    return <div className={`whitespace-pre-wrap text-slate-900 ${className}`}>{body}</div>;
  }

  return (
    <div
      className={[
        "space-y-2 text-slate-900",
        "[&_p]:leading-6",
        "[&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1",
        "[&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600",
        "[&_a]:font-medium [&_a]:text-[var(--brand-700)] [&_a]:underline [&_a]:decoration-[color:rgba(23,77,82,0.28)] [&_a]:underline-offset-3",
        "[&_strong]:font-semibold",
        className,
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
