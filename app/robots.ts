import { buildPublicRobots } from "@/lib/public-metadata";
import { getPublicSiteOrigin } from "@/lib/public-config";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return buildPublicRobots(getPublicSiteOrigin());
}
