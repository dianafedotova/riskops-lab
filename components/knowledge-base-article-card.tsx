import type { KnowledgeBaseArticleSummary } from "@/lib/knowledge-base";
import { PublicTrackedLink } from "@/components/public-tracked-link";

type KnowledgeBaseArticleCardProps = {
  article: KnowledgeBaseArticleSummary;
  pageType: string;
  ctaLocation: string;
  showCategory?: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function KnowledgeBaseArticleCard({
  article,
  pageType,
  ctaLocation,
  showCategory = true,
}: KnowledgeBaseArticleCardProps) {
  return (
    <article className="shell-card surface-lift flex h-full flex-col gap-4 p-5 sm:p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
          {showCategory ? <span>{article.categoryMeta.label}</span> : null}
          <span>{formatDate(article.updatedAt)}</span>
          <span>{article.readingTimeMinutes} min read</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-[1.2rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[1.3rem]">
            <PublicTrackedLink
              href={article.href}
              eventName="cta_clicked"
              eventProps={{
                cta_name: "open_article",
                cta_location: ctaLocation,
                page_type: pageType,
                route_group: "public",
                content_category: article.category,
                content_slug: article.slug,
              }}
              className="transition-colors duration-150 hover:text-[var(--brand-700)]"
            >
              {article.title}
            </PublicTrackedLink>
          </h2>
          <p className="text-sm leading-7 text-[var(--accent-stone-500)]">{article.description}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {article.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--border-app)] bg-[var(--surface-main)] px-2.5 py-1 text-[0.72rem] font-medium text-[var(--app-shell-bg)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
