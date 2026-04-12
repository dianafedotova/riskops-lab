import { PUBLIC_BETA_DESCRIPTION, PUBLIC_BETA_NAME } from "@/lib/public-config";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PUBLIC_BETA_NAME,
    short_name: "RiskOps Lab",
    description: PUBLIC_BETA_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0F1F2E",
    theme_color: "#12202E",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
