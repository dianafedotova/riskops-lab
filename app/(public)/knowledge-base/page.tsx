import { KnowledgeBaseArticleCard } from "@/components/knowledge-base-article-card";
import { PublicTrackedLink } from "@/components/public-tracked-link";
import {
  getFeaturedKnowledgeBaseArticle,
  getKnowledgeBaseArticleSummaries,
  getKnowledgeBaseCategorySummaries,
  KNOWLEDGE_BASE_PATH,
} from "@/lib/knowledge-base";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildPublicPageMetadata,
  serializeJsonLd,
} from "@/lib/public-seo";

export const metadata = buildPublicPageMetadata({
  title: "Knowledge Base",
  description:
    "Beginner-friendly AML, fraud, career, glossary, and product guide content built to support practical investigation learning.",
  path: KNOWLEDGE_BASE_PATH,
  keywords: [
    "aml knowledge base",
    "fraud investigation guide",
    "aml glossary",
    "fraud analyst career",
    "transaction monitoring basics",
  ],
});

export default function KnowledgeBasePage() {
  const categories = getKnowledgeBaseCategorySummaries();
  const articles = getKnowledgeBaseArticleSummaries();
  const featuredArticle = getFeaturedKnowledgeBaseArticle();
  const recentArticles = articles.filter((article) => article.slug !== featuredArticle?.slug);
  const knowledgeBaseJsonLd = [
    buildCollectionPageJsonLd({
      name: "RiskOps Lab Knowledge Base",
      path: KNOWLEDGE_BASE_PATH,
      description:
        "A public knowledge base of beginner-friendly AML, fraud, glossary, and product guide content.",
    }),
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Knowledge Base", path: KNOWLEDGE_BASE_PATH },
    ]),
  ];

  return (
    <div className="space-y-8 md:space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(knowledgeBaseJsonLd) }}
      />

      <section className="shell-card relative overflow-hidden p-6 sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl"
        />
        <div className="relative max-w-4xl space-y-5">
          <p className="field-label">Knowledge Base</p>
          <div className="space-y-3">
            <h1 className="text-[clamp(2rem,1.45rem+2.2vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--app-shell-bg)]">
              Practical reading for beginner fraud and AML analysts.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[1rem]">
              Explore role explainers, workflow guides, and glossary content that connects theory to
              the real shape of alert review and case reasoning.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--accent-stone-500)]">
            <span>{articles.length} articles</span>
            <span>{categories.length} categories</span>
            <span>Synthetic-training focused</span>
          </div>
        </div>
      </section>

      {featuredArticle ? (
        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="shell-card p-6 sm:p-8">
            <div className="space-y-3">
              <p className="field-label">Featured Guide</p>
              <h2 className="text-[1.6rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[1.85rem]">
                {featuredArticle.title}
              </h2>
              <p className="text-sm leading-7 text-[var(--accent-stone-500)]">
                {featuredArticle.description}
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
                <span>{featuredArticle.categoryMeta.label}</span>
                <span>{featuredArticle.readingTimeMinutes} min read</span>
              </div>
              <PublicTrackedLink
                href={featuredArticle.href}
                eventName="cta_clicked"
                eventProps={{
                  cta_name: "open_featured_article",
                  cta_location: "knowledge_base_featured",
                  page_type: "knowledge_base_index",
                  route_group: "public",
                  content_category: featuredArticle.category,
                  content_slug: featuredArticle.slug,
                }}
                className="ui-btn ui-btn-primary"
              >
                Read featured article
              </PublicTrackedLink>
            </div>
          </article>
          <article className="shell-card p-6 sm:p-8">
            <div className="space-y-4">
              <p className="field-label">Category Map</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((category) => (
                  <PublicTrackedLink
                    key={category.slug}
                    href={category.href}
                    eventName="cta_clicked"
                    eventProps={{
                      cta_name: "open_category",
                      cta_location: "knowledge_base_category_map",
                      page_type: "knowledge_base_index",
                      route_group: "public",
                      content_category: category.slug,
                    }}
                    className="rounded-[1.2rem] border border-[var(--border-subtle)] bg-white/80 p-4 shadow-[0_10px_20px_rgba(17,33,46,0.05)] transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent-stone-500)]">
                          {category.label}
                        </h3>
                        <span className="text-xs font-semibold text-[var(--app-shell-bg)]">
                          {category.articleCount}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
                        {category.description}
                      </p>
                    </div>
                  </PublicTrackedLink>
                ))}
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="max-w-2xl space-y-2">
          <p className="field-label">Latest Articles</p>
          <h2 className="text-[1.6rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[1.85rem]">
            Start with the cornerstone pieces.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {recentArticles.map((article) => (
            <KnowledgeBaseArticleCard
              key={article.slug}
              article={article}
              pageType="knowledge_base_index"
              ctaLocation="knowledge_base_index_grid"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
