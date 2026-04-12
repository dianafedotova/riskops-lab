import type { Metadata } from "next";
import { buildNoIndexPageMetadata } from "@/lib/public-seo";
import { redirect } from "next/navigation";

export const metadata: Metadata = buildNoIndexPageMetadata({
  title: "Login",
  description: "Legacy sign-in alias that redirects to the primary RiskOps Lab sign-in route.",
  path: "/login",
});

export default function LoginPage() {
  redirect("/sign-in");
}
