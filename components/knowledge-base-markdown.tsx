import type { KnowledgeBaseBlock } from "@/lib/knowledge-base";
import Link from "next/link";
import type { ReactNode } from "react";

type InlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string };

const INLINE_TOKEN_PATTERN =
  /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    if (match[2] && match[3]) {
      tokens.push({
        type: "link",
        value: match[2],
        href: match[3],
      });
    } else if (match[4]) {
      tokens.push({
        type: "strong",
        value: match[4],
      });
    } else if (match[5]) {
      tokens.push({
        type: "code",
        value: match[5],
      });
    } else if (match[6]) {
      tokens.push({
        type: "em",
        value: match[6],
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

function renderInline(text: string): ReactNode[] {
  return parseInlineTokens(text).map((token, index) => {
    const key = `${token.type}-${index}`;

    switch (token.type) {
      case "strong":
        return (
          <strong key={key} className="font-semibold text-[var(--app-shell-bg)]">
            {token.value}
          </strong>
        );
      case "em":
        return (
          <em key={key} className="italic">
            {token.value}
          </em>
        );
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-[var(--surface-main)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--app-shell-bg)]"
          >
            {token.value}
          </code>
        );
      case "link":
        if (token.href.startsWith("/")) {
          return (
            <Link key={key} href={token.href} className="font-medium text-[var(--brand-700)] underline">
              {token.value}
            </Link>
          );
        }

        return (
          <a
            key={key}
            href={token.href}
            className="font-medium text-[var(--brand-700)] underline"
            target="_blank"
            rel="noreferrer"
          >
            {token.value}
          </a>
        );
      case "text":
      default:
        return token.value;
    }
  });
}

type KnowledgeBaseMarkdownProps = {
  blocks: KnowledgeBaseBlock[];
};

export function KnowledgeBaseMarkdown({ blocks }: KnowledgeBaseMarkdownProps) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2
                key={`heading-${index}`}
                className="pt-3 text-[1.45rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[1.7rem]"
              >
                {renderInline(block.text)}
              </h2>
            ) : (
              <h3
                key={`heading-${index}`}
                className="pt-2 text-[1.12rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[1.2rem]"
              >
                {renderInline(block.text)}
              </h3>
            );
          case "unordered-list":
            return (
              <ul
                key={`unordered-list-${index}`}
                className="space-y-3 pl-5 text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[0.98rem]"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`unordered-list-item-${itemIndex}`} className="list-disc">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          case "ordered-list":
            return (
              <ol
                key={`ordered-list-${index}`}
                className="space-y-3 pl-5 text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[0.98rem]"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`ordered-list-item-${itemIndex}`} className="list-decimal">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={`quote-${index}`}
                className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-main)] px-4 py-3 text-sm leading-7 text-[var(--app-shell-bg)] shadow-sm"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case "paragraph":
          default:
            return (
              <p
                key={`paragraph-${index}`}
                className="text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[0.98rem]"
              >
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
