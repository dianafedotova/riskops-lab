import { KnowledgeBaseArticleCard } from "@/components/knowledge-base-article-card";
import { KnowledgeBaseMarkdown } from "@/components/knowledge-base-markdown";
import { PublicTrackedLink } from "@/components/public-tracked-link";
import {
  getKnowledgeBaseArticleBySlug,
  getKnowledgeBaseArticleStaticParams,
  getRelatedKnowledgeBaseArticles,
  KNOWLEDGE_BASE_PATH,
} from "@/lib/knowledge-base";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildPublicPageMetadata,
  serializeJsonLd,
} from "@/lib/public-seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamicParams = false;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function generateStaticParams() {
  return getKnowledgeBaseArticleStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getKnowledgeBaseArticleBySlug(slug);

  if (!article) {
    return buildPublicPageMetadata({
      title: "Knowledge Base Article",
      description: "Knowledge Base article.",
      path: KNOWLEDGE_BASE_PATH,
    });
  }

  return buildPublicPageMetadata({
    title: article.title,
    description: article.description,
    path: article.href,
    type: "article",
    keywords: article.tags,
  });
}

export default async function KnowledgeBaseArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getKnowledgeBaseArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedKnowledgeBaseArticles(article);
  const articleJsonLd = [
    buildArticleJsonLd({
      title: article.title,
      description: article.description,
      path: article.href,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      author: article.author,
      section: article.categoryMeta.label,
      tags: article.tags,
    }),
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Knowledge Base", path: KNOWLEDGE_BASE_PATH },
      {
        name: article.categoryMeta.label,
        path: `${KNOWLEDGE_BASE_PATH}/category/${article.categoryMeta.slug}`,
      },
      { name: article.title, path: article.href },
    ]),
  ];

  return (
    <div className="space-y-8 md:space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />

      <article className="shell-card overflow-hidden">
        <header className="border-b border-[var(--border-subtle)] px-5 py-6 sm:px-8 sm:py-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
              <PublicTrackedLink
                href={`${KNOWLEDGE_BASE_PATH}/category/${article.categoryMeta.slug}`}
                eventName="cta_clicked"
                eventProps={{
                  cta_name: "open_category",
                  cta_location: "knowledge_base_article_header",
                  page_type: "knowledge_base_article",
                  route_group: "public",
                  content_category: article.category,
                }}
                className="transition-colors duration-150 hover:text-[var(--brand-700)]"
              >
                {article.categoryMeta.label}
              </PublicTrackedLink>
              <span>{formatDate(article.updatedAt)}</span>
              <span>{article.readingTimeMinutes} min read</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-[clamp(2rem,1.45rem+2vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--app-shell-bg)]">
                {article.title}
              </h1>
              <p className="text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[1rem]">
                {article.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border-app)] bg-[var(--surface-main)] px-2.5 py-1 text-[0.72rem] font-medium text-[var(--app-shell-bg)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <KnowledgeBaseMarkdown blocks={article.blocks} />
            </div>

            <aside className="space-y-5">
              <section className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-main)] p-4 shadow-sm">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
                    Next Step
                  </p>
                  <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
                    Use the guide and your first synthetic case together. Reading gets much more useful
                    when you can immediately apply the workflow.
                  </p>
                  <div className="flex flex-col gap-2">
                    <PublicTrackedLink
                      href="/guide"
                      eventName="cta_clicked"
                      eventProps={{
                        cta_name: "open_guide",
                        cta_location: "knowledge_base_article_sidebar",
                        page_type: "knowledge_base_article",
                        route_group: "public",
                        content_category: article.category,
                        content_slug: article.slug,
                      }}
                      className="ui-btn ui-btn-secondary"
                    >
                      Open Guide
                    </PublicTrackedLink>
                    <PublicTrackedLink
                      href="/signup"
                      eventName="cta_clicked"
                      eventProps={{
                        cta_name: "start_your_first_case",
                        cta_location: "knowledge_base_article_sidebar",
                        page_type: "knowledge_base_article",
                        route_group: "public",
                        content_category: article.category,
                        content_slug: article.slug,
                      }}
                      className="ui-btn ui-btn-primary"
                    >
                      Start your first case
                    </PublicTrackedLink>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-main)] p-4 shadow-sm">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
                    Article Details
                  </p>
                  <p className="text-sm text-[var(--accent-stone-500)]">Author: {article.author}</p>
                  <p className="text-sm text-[var(--accent-stone-500)]">
                    Published: {formatDate(article.publishedAt)}
                  </p>
                  <p className="text-sm text-[var(--accent-stone-500)]">
                    Updated: {formatDate(article.updatedAt)}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </article>

      {relatedArticles.length ? (
        <section className="space-y-4">
          <div className="max-w-2xl space-y-2">
            <p className="field-label">Related Reading</p>
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[1.7rem]">
              Keep the learning loop going.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {relatedArticles.map((relatedArticle) => (
              <KnowledgeBaseArticleCard
                key={relatedArticle.slug}
                article={relatedArticle}
                pageType="knowledge_base_article"
                ctaLocation="knowledge_base_related_articles"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
