import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { MetadataRoute } from "next";

export const KNOWLEDGE_BASE_PATH = "/knowledge-base";

export const KNOWLEDGE_BASE_CATEGORIES = [
  {
    slug: "aml-basics",
    label: "AML Basics",
    description:
      "Foundational concepts for suspicious activity review, transaction monitoring, and beginner AML workflows.",
  },
  {
    slug: "fraud-basics",
    label: "Fraud Basics",
    description:
      "Practical starting points for identifying suspicious behavior, misuse signals, and investigation next steps.",
  },
  {
    slug: "career",
    label: "Career",
    description:
      "Role comparisons, skill expectations, and beginner-facing guidance for entering fraud or AML operations.",
  },
  {
    slug: "glossary",
    label: "Glossary",
    description:
      "Short, beginner-friendly explanations of common AML and fraud terms you will keep seeing in investigations.",
  },
  {
    slug: "product-guides",
    label: "Product Guides",
    description:
      "How to use RiskOps Lab, follow the simulator workflow, and turn practice cases into structured learning.",
  },
] as const;

type KnowledgeBaseCategoryMeta = (typeof KNOWLEDGE_BASE_CATEGORIES)[number];

export type KnowledgeBaseCategorySlug = KnowledgeBaseCategoryMeta["slug"];

type KnowledgeBaseFrontmatter = {
  title: string;
  description: string;
  slug: string;
  category: KnowledgeBaseCategorySlug;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  author: string;
  draft: boolean;
  featured: boolean;
  related: string[];
};

export type KnowledgeBaseBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "quote"; text: string };

export type KnowledgeBaseArticle = KnowledgeBaseFrontmatter & {
  body: string;
  blocks: KnowledgeBaseBlock[];
  readingTimeMinutes: number;
  categoryMeta: KnowledgeBaseCategoryMeta;
  href: string;
};

export type KnowledgeBaseArticleSummary = Omit<KnowledgeBaseArticle, "body" | "blocks">;

type ParsedFrontmatter = Record<string, string | boolean | string[]>;

const CONTENT_DIRECTORY = path.join(process.cwd(), "content", "knowledge-base");

function isKnowledgeBaseCategorySlug(value: string): value is KnowledgeBaseCategorySlug {
  return KNOWLEDGE_BASE_CATEGORIES.some((category) => category.slug === value);
}

function parseScalarValue(rawValue: string): string | boolean {
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function parseFrontmatter(rawSource: string): {
  frontmatter: ParsedFrontmatter;
  body: string;
} {
  const source = rawSource.replace(/\r\n/g, "\n");
  const lines = source.split("\n");

  if (lines[0]?.trim() !== "---") {
    throw new Error("Knowledge base article is missing frontmatter.");
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) {
    throw new Error("Knowledge base article frontmatter is not closed.");
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join("\n").trim();
  const frontmatter: ParsedFrontmatter = {};

  let currentArrayKey: string | null = null;

  for (const rawLine of frontmatterLines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("- ")) {
      if (!currentArrayKey) {
        throw new Error("Knowledge base frontmatter array item is missing a key.");
      }

      const existingValue = frontmatter[currentArrayKey];
      if (!Array.isArray(existingValue)) {
        throw new Error(`Knowledge base frontmatter key "${currentArrayKey}" is not an array.`);
      }

      existingValue.push(String(parseScalarValue(trimmedLine.slice(2).trim())));
      continue;
    }

    const separatorIndex = rawLine.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Knowledge base frontmatter line "${rawLine}" is invalid.`);
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex + 1).trim();

    if (!key) {
      throw new Error("Knowledge base frontmatter key is empty.");
    }

    if (!value) {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }

    frontmatter[key] = parseScalarValue(value);
    currentArrayKey = null;
  }

  return { frontmatter, body };
}

function isBlockBoundary(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("## ") ||
    trimmed.startsWith("### ") ||
    trimmed.startsWith("> ") ||
    trimmed.startsWith("- ") ||
    /^\d+\.\s+/.test(trimmed)
  );
}

function parseMarkdownBlocks(body: string): KnowledgeBaseBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: KnowledgeBaseBlock[] = [];

  for (let index = 0; index < lines.length; ) {
    const rawLine = lines[index];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith("### ")) {
      blocks.push({
        type: "heading",
        level: 3,
        text: trimmedLine.slice(4).trim(),
      });
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      blocks.push({
        type: "heading",
        level: 2,
        text: trimmedLine.slice(3).trim(),
      });
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().slice(2).trim());
        index += 1;
      }

      blocks.push({
        type: "quote",
        text: quoteLines.join(" ").trim(),
      });
      continue;
    }

    if (trimmedLine.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }

      blocks.push({
        type: "unordered-list",
        items,
      });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, "").trim());
        index += 1;
      }

      blocks.push({
        type: "ordered-list",
        items,
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index];
      if (!candidate.trim()) break;
      if (candidate !== rawLine && isBlockBoundary(candidate)) break;
      paragraphLines.push(candidate.trim());
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" ").trim(),
    });
  }

  return blocks;
}

function estimateReadingTimeMinutes(body: string): number {
  const wordCount = body
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / 180));
}

function assertString(value: string | boolean | string[] | undefined, key: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Knowledge base frontmatter key "${key}" must be a non-empty string.`);
  }
  return value.trim();
}

function assertStringArray(value: string | boolean | string[] | undefined, key: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Knowledge base frontmatter key "${key}" must be an array.`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function assertBoolean(value: string | boolean | string[] | undefined, key: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Knowledge base frontmatter key "${key}" must be a boolean.`);
  }
  return value;
}

function parseKnowledgeBaseFile(filePath: string): KnowledgeBaseArticle {
  const source = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(source);

  const category = assertString(frontmatter.category, "category");
  if (!isKnowledgeBaseCategorySlug(category)) {
    throw new Error(`Knowledge base category "${category}" is not supported.`);
  }

  const categoryMeta =
    KNOWLEDGE_BASE_CATEGORIES.find((item) => item.slug === category) ?? KNOWLEDGE_BASE_CATEGORIES[0];

  const article: KnowledgeBaseArticle = {
    title: assertString(frontmatter.title, "title"),
    description: assertString(frontmatter.description, "description"),
    slug: assertString(frontmatter.slug, "slug"),
    category,
    tags: assertStringArray(frontmatter.tags, "tags"),
    publishedAt: assertString(frontmatter.publishedAt, "publishedAt"),
    updatedAt: assertString(frontmatter.updatedAt, "updatedAt"),
    author: assertString(frontmatter.author, "author"),
    draft: assertBoolean(frontmatter.draft, "draft"),
    featured: assertBoolean(frontmatter.featured, "featured"),
    related: assertStringArray(frontmatter.related, "related"),
    body,
    blocks: parseMarkdownBlocks(body),
    readingTimeMinutes: estimateReadingTimeMinutes(body),
    categoryMeta,
    href: `${KNOWLEDGE_BASE_PATH}/${assertString(frontmatter.slug, "slug")}`,
  };

  return article;
}

export const getKnowledgeBaseArticles = cache((): KnowledgeBaseArticle[] => {
  if (!fs.existsSync(CONTENT_DIRECTORY)) {
    return [];
  }

  const files = fs
    .readdirSync(CONTENT_DIRECTORY)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => path.join(CONTENT_DIRECTORY, fileName));

  return files
    .map(parseKnowledgeBaseFile)
    .filter((article) => !article.draft)
    .sort((left, right) => {
      if (left.featured !== right.featured) {
        return left.featured ? -1 : 1;
      }

      return right.publishedAt.localeCompare(left.publishedAt);
    });
});

export function getKnowledgeBaseArticleSummaries(): KnowledgeBaseArticleSummary[] {
  return getKnowledgeBaseArticles().map(({ body, blocks, ...summary }) => summary);
}

export function getKnowledgeBaseArticleBySlug(slug: string): KnowledgeBaseArticle | null {
  return getKnowledgeBaseArticles().find((article) => article.slug === slug) ?? null;
}

export function getKnowledgeBaseCategory(slug: string): KnowledgeBaseCategoryMeta | null {
  return KNOWLEDGE_BASE_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getKnowledgeBaseArticlesByCategory(
  category: KnowledgeBaseCategorySlug
): KnowledgeBaseArticle[] {
  return getKnowledgeBaseArticles().filter((article) => article.category === category);
}

export function getKnowledgeBaseCategorySummaries() {
  const articles = getKnowledgeBaseArticles();

  return KNOWLEDGE_BASE_CATEGORIES.map((category) => ({
    ...category,
    articleCount: articles.filter((article) => article.category === category.slug).length,
    href: `${KNOWLEDGE_BASE_PATH}/category/${category.slug}`,
  }));
}

export function getFeaturedKnowledgeBaseArticle(): KnowledgeBaseArticle | null {
  return getKnowledgeBaseArticles().find((article) => article.featured) ?? getKnowledgeBaseArticles()[0] ?? null;
}

export function getRelatedKnowledgeBaseArticles(
  article: KnowledgeBaseArticle,
  limit: number = 3
): KnowledgeBaseArticleSummary[] {
  const allArticles = getKnowledgeBaseArticles();
  const explicitMatches = article.related
    .map((slug) => allArticles.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is KnowledgeBaseArticle => Boolean(candidate))
    .filter((candidate) => candidate.slug !== article.slug);

  const fallbackMatches = allArticles.filter(
    (candidate) =>
      candidate.slug !== article.slug &&
      candidate.category === article.category &&
      !explicitMatches.some((item) => item.slug === candidate.slug)
  );

  return [...explicitMatches, ...fallbackMatches]
    .slice(0, limit)
    .map(({ body, blocks, ...summary }) => summary);
}

export function getKnowledgeBaseArticleStaticParams() {
  return getKnowledgeBaseArticleSummaries().map((article) => ({
    slug: article.slug,
  }));
}

export function getKnowledgeBaseCategoryStaticParams() {
  return KNOWLEDGE_BASE_CATEGORIES.map((category) => ({
    category: category.slug,
  }));
}

export function getKnowledgeBaseSitemapEntries(origin: string): MetadataRoute.Sitemap {
  const base = origin.replace(/\/+$/, "");

  const categoryEntries = getKnowledgeBaseCategorySummaries().map((category) => ({
    url: `${base}${category.href}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.72,
  }));

  const articleEntries = getKnowledgeBaseArticles().map((article) => ({
    url: `${base}${article.href}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.74,
  }));

  return [
    {
      url: `${base}${KNOWLEDGE_BASE_PATH}`,
      lastModified: articleEntries[0]?.lastModified ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...categoryEntries,
    ...articleEntries,
  ];
}
