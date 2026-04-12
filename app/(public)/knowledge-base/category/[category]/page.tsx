import { KnowledgeBaseArticleCard } from "@/components/knowledge-base-article-card";
import { PublicTrackedLink } from "@/components/public-tracked-link";
import {
  getKnowledgeBaseArticlesByCategory,
  getKnowledgeBaseCategory,
  getKnowledgeBaseCategoryStaticParams,
  getKnowledgeBaseCategorySummaries,
  KNOWLEDGE_BASE_PATH,
} from "@/lib/knowledge-base";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildPublicPageMetadata,
  serializeJsonLd,
} from "@/lib/public-seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return getKnowledgeBaseCategoryStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categoryMeta = getKnowledgeBaseCategory(category);

  if (!categoryMeta) {
    return buildPublicPageMetadata({
      title: "Knowledge Base Category",
      description: "Knowledge Base category page.",
      path: KNOWLEDGE_BASE_PATH,
    });
  }

  return buildPublicPageMetadata({
    title: `${categoryMeta.label} Knowledge Base`,
    description: categoryMeta.description,
    path: `${KNOWLEDGE_BASE_PATH}/category/${categoryMeta.slug}`,
    keywords: [categoryMeta.label, "knowledge base", "RiskOps Lab"],
  });
}

export default async function KnowledgeBaseCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryMeta = getKnowledgeBaseCategory(category);

  if (!categoryMeta) {
    notFound();
  }

  const articles = getKnowledgeBaseArticlesByCategory(categoryMeta.slug);
  const categoryJsonLd = [
    buildCollectionPageJsonLd({
      name: `${categoryMeta.label} Knowledge Base`,
      path: `${KNOWLEDGE_BASE_PATH}/category/${categoryMeta.slug}`,
      description: categoryMeta.description,
    }),
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Knowledge Base", path: KNOWLEDGE_BASE_PATH },
      { name: categoryMeta.label, path: `${KNOWLEDGE_BASE_PATH}/category/${categoryMeta.slug}` },
    ]),
  ];
  const siblingCategories = getKnowledgeBaseCategorySummaries().filter(
    (item) => item.slug !== categoryMeta.slug
  );

  return (
    <div className="space-y-8 md:space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(categoryJsonLd) }}
      />

      <section className="shell-card p-6 sm:p-8">
        <div className="max-w-3xl space-y-4">
          <div className="space-y-2">
            <p className="field-label">Knowledge Base Category</p>
            <h1 className="text-[clamp(1.9rem,1.45rem+1.8vw,3rem)] font-semibold tracking-[-0.05em] text-[var(--app-shell-bg)]">
              {categoryMeta.label}
            </h1>
            <p className="text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[1rem]">
              {categoryMeta.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PublicTrackedLink
              href={KNOWLEDGE_BASE_PATH}
              eventName="cta_clicked"
              eventProps={{
                cta_name: "back_to_knowledge_base",
                cta_location: "knowledge_base_category_header",
                page_type: "knowledge_base_category",
                route_group: "public",
                content_category: categoryMeta.slug,
              }}
              className="ui-btn ui-btn-secondary"
            >
              Back to Knowledge Base
            </PublicTrackedLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <KnowledgeBaseArticleCard
            key={article.slug}
            article={article}
            pageType="knowledge_base_category"
            ctaLocation="knowledge_base_category_grid"
            showCategory={false}
          />
        ))}
      </section>

      <section className="shell-card p-6 sm:p-8">
        <div className="space-y-4">
          <p className="field-label">Explore Other Categories</p>
          <div className="flex flex-wrap gap-3">
            {siblingCategories.map((item) => (
              <PublicTrackedLink
                key={item.slug}
                href={item.href}
                eventName="cta_clicked"
                eventProps={{
                  cta_name: "open_category",
                  cta_location: "knowledge_base_category_footer",
                  page_type: "knowledge_base_category",
                  route_group: "public",
                  content_category: item.slug,
                }}
                className="rounded-full border border-[var(--border-app)] bg-[var(--surface-main)] px-4 py-2 text-sm font-medium text-[var(--app-shell-bg)] transition-colors duration-150 hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
              >
                {item.label}
              </PublicTrackedLink>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
