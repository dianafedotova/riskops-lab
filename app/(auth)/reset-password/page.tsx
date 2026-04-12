import type { Metadata } from "next";
import { buildNoIndexPageMetadata } from "@/lib/public-seo";
import { ResetPasswordPageClient } from "./reset-password-page-client";

export const metadata: Metadata = buildNoIndexPageMetadata({
  title: "Reset Password",
  description: "Set a new password for your RiskOps Lab beta account.",
  path: "/reset-password",
});

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
