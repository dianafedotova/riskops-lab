import type { NextConfig } from "next";

const vercelHost = process.env.VERCEL_URL?.trim();
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_URL:
      vercelHost && vercelHost.length > 0 ? `https://${vercelHost.replace(/^\/+/, "")}` : "",
  },
};

export default nextConfig;
