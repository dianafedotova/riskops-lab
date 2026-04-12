import type { Metadata } from "next";
import { buildNoIndexPageMetadata } from "@/lib/public-seo";
import { ForgotPasswordPageClient } from "./forgot-password-page-client";

export const metadata: Metadata = buildNoIndexPageMetadata({
  title: "Forgot Password",
  description: "Request a password reset link for your RiskOps Lab beta account.",
  path: "/forgot-password",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
