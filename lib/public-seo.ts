import type { Metadata } from "next";
import { PUBLIC_BETA_NAME } from "@/lib/public-config";
import { getPublicSiteOrigin } from "@/lib/marketing-config";

type PublicMetadataOptions = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  type?: "website" | "article";
  keywords?: string[];
};

const DEFAULT_SOCIAL_IMAGE_PATH = "/opengraph-image";

function toCanonicalPath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function toAbsoluteUrl(path: string): string {
  const origin = getPublicSiteOrigin();
  const canonicalPath = toCanonicalPath(path);
  return canonicalPath === "/" ? origin : `${origin}${canonicalPath}`;
}

export function buildPublicPageMetadata({
  title,
  description,
  path,
  index = true,
  type = "website",
  keywords,
}: PublicMetadataOptions): Metadata {
  const canonical = toCanonicalPath(path);

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical,
    },
    robots: index
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-image-preview": "none",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type,
      title,
      description,
      url: canonical,
      siteName: PUBLIC_BETA_NAME,
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${PUBLIC_BETA_NAME} sharing image`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE_PATH],
    },
  };
}

export function buildNoIndexPageMetadata(
  options: Omit<PublicMetadataOptions, "index">
): Metadata {
  return buildPublicPageMetadata({
    ...options,
    index: false,
  });
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PUBLIC_BETA_NAME,
    url: getPublicSiteOrigin(),
    description:
      "Beginner-friendly fraud and AML investigation simulator for synthetic training cases.",
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PUBLIC_BETA_NAME,
    url: getPublicSiteOrigin(),
    description:
      "Fraud and AML investigation training for beginners using synthetic cases and guided review practice.",
  };
}

export function buildLandingPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Build AML and fraud investigation skills before your first role",
    url: getPublicSiteOrigin(),
    description:
      "RiskOps Lab helps beginners practice alert review, account investigation, and risk decision writing with synthetic training data.",
    isPartOf: {
      "@type": "WebSite",
      name: PUBLIC_BETA_NAME,
      url: getPublicSiteOrigin(),
    },
    about: [
      "AML investigation training",
      "Fraud investigation training",
      "Synthetic analyst practice",
    ],
  };
}

type PublicWebPageJsonLdOptions = {
  name: string;
  path: string;
  description: string;
  about?: string[];
};

export function buildPublicWebPageJsonLd({
  name,
  path,
  description,
  about,
}: PublicWebPageJsonLdOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url: toAbsoluteUrl(path),
    description,
    isPartOf: {
      "@type": "WebSite",
      name: PUBLIC_BETA_NAME,
      url: getPublicSiteOrigin(),
    },
    ...(about?.length ? { about } : {}),
  };
}

type CollectionPageJsonLdOptions = {
  name: string;
  path: string;
  description: string;
};

export function buildCollectionPageJsonLd({
  name,
  path,
  description,
}: CollectionPageJsonLdOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: toAbsoluteUrl(path),
    description,
    isPartOf: {
      "@type": "WebSite",
      name: PUBLIC_BETA_NAME,
      url: getPublicSiteOrigin(),
    },
  };
}

type BreadcrumbItemOptions = {
  name: string;
  path: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItemOptions[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };
}

type ArticleJsonLdOptions = {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  section: string;
  tags?: string[];
};

export function buildArticleJsonLd({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  author,
  section,
  tags,
}: ArticleJsonLdOptions) {
  const url = toAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: PUBLIC_BETA_NAME,
      url: getPublicSiteOrigin(),
    },
    articleSection: section,
    ...(tags?.length ? { keywords: tags.join(", ") } : {}),
  };
}
