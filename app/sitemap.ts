import { getKnowledgeBaseSitemapEntries } from "@/lib/knowledge-base";
import { buildPublicSitemap } from "@/lib/public-metadata";
import { getPublicSiteOrigin } from "@/lib/public-config";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicSiteOrigin();
  return [...buildPublicSitemap(origin), ...getKnowledgeBaseSitemapEntries(origin)];
}
