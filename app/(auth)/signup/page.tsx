import type { Metadata } from "next";
import { buildNoIndexPageMetadata } from "@/lib/public-seo";
import { SignupPageClient } from "./signup-page-client";

export const metadata: Metadata = buildNoIndexPageMetadata({
  title: "Sign Up",
  description: "Create a RiskOps Lab account to start your first synthetic training case.",
  path: "/signup",
});

export default function SignupPage() {
  return <SignupPageClient />;
}
