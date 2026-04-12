"use client";

import {
  getKnowledgeBaseRouteContext,
  getMarketingPageType,
  getMarketingRouteGroup,
  normalizePathname,
} from "@/lib/marketing-routes";
import {
  markMarketingSurfaceSessionFlag,
  pushPublicDataLayerEvent,
} from "@/lib/public-data-layer";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function PublicRouteAnalytics() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedPath = normalizePathname(pathname);
    if (lastTrackedPathRef.current === normalizedPath) return;
    lastTrackedPathRef.current = normalizedPath;

    const routeGroup = getMarketingRouteGroup(normalizedPath);
    const pageType = getMarketingPageType(normalizedPath);
    const knowledgeBaseContext = getKnowledgeBaseRouteContext(normalizedPath);

    if (!routeGroup || !pageType) return;

    markMarketingSurfaceSessionFlag();

    pushPublicDataLayerEvent("public_page_viewed", {
      path: normalizedPath,
      route_group: routeGroup,
      page_type: pageType,
      content_category: knowledgeBaseContext.category,
      content_slug: knowledgeBaseContext.slug,
    });

    if (normalizedPath === "/") {
      pushPublicDataLayerEvent("landing_viewed", {
        path: normalizedPath,
        route_group: routeGroup,
        page_type: pageType,
      });
      return;
    }

    if (pageType === "knowledge_base_index") {
      pushPublicDataLayerEvent("knowledge_base_viewed", {
        path: normalizedPath,
        route_group: routeGroup,
        page_type: pageType,
      });
      return;
    }

    if (pageType === "knowledge_base_category") {
      pushPublicDataLayerEvent("knowledge_base_category_viewed", {
        path: normalizedPath,
        route_group: routeGroup,
        page_type: pageType,
        content_category: knowledgeBaseContext.category,
      });
      return;
    }

    if (pageType === "knowledge_base_article") {
      pushPublicDataLayerEvent("knowledge_base_article_viewed", {
        path: normalizedPath,
        route_group: routeGroup,
        page_type: pageType,
        content_slug: knowledgeBaseContext.slug,
      });
      return;
    }

    if (normalizedPath === "/guide") {
      pushPublicDataLayerEvent("guide_viewed", {
        path: normalizedPath,
        route_group: routeGroup,
        page_type: pageType,
      });
      return;
    }

    if (normalizedPath === "/signup") {
      pushPublicDataLayerEvent("signup_started", {
        path: normalizedPath,
        route_group: routeGroup,
        page_type: pageType,
        source: "page_view",
      });
    }
  }, [pathname]);

  return null;
}
