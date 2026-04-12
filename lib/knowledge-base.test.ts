import {
  getFeaturedKnowledgeBaseArticle,
  getKnowledgeBaseArticleBySlug,
  getKnowledgeBaseArticleSummaries,
  getKnowledgeBaseCategorySummaries,
  getKnowledgeBaseSitemapEntries,
} from "@/lib/knowledge-base";
import { describe, expect, it } from "vitest";

describe("knowledge base content", () => {
  it("loads the published seed articles", () => {
    const articles = getKnowledgeBaseArticleSummaries();

    expect(articles).toHaveLength(6);
    expect(articles.some((article) => article.slug === "how-alert-review-works-in-riskops-lab")).toBe(
      true
    );
    expect(articles.every((article) => article.href.startsWith("/knowledge-base/"))).toBe(true);
  });

  it("computes category summaries and featured article", () => {
    const categories = getKnowledgeBaseCategorySummaries();
    const featuredArticle = getFeaturedKnowledgeBaseArticle();

    expect(categories).toHaveLength(5);
    expect(categories.find((category) => category.slug === "career")?.articleCount).toBe(2);
    expect(featuredArticle?.slug).toBe("how-alert-review-works-in-riskops-lab");
  });

  it("parses markdown blocks for article content", () => {
    const article = getKnowledgeBaseArticleBySlug("beginner-fraud-investigation-checklist");

    expect(article).not.toBeNull();
    expect(article?.blocks.some((block) => block.type === "ordered-list")).toBe(true);
    expect(article?.blocks.some((block) => block.type === "heading")).toBe(true);
  });

  it("builds sitemap entries for index, categories, and articles", () => {
    const entries = getKnowledgeBaseSitemapEntries("https://riskopslab.com");

    expect(entries.some((entry) => entry.url === "https://riskopslab.com/knowledge-base")).toBe(true);
    expect(
      entries.some(
        (entry) => entry.url === "https://riskopslab.com/knowledge-base/category/product-guides"
      )
    ).toBe(true);
    expect(
      entries.some(
        (entry) => entry.url === "https://riskopslab.com/knowledge-base/what-is-transaction-monitoring"
      )
    ).toBe(true);
  });
});
