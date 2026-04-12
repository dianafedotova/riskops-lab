import type { Metadata } from "next";
import { Suspense } from "react";
import { buildNoIndexPageMetadata } from "@/lib/public-seo";
import { LoginForm } from "../login/login-form";

export const metadata: Metadata = buildNoIndexPageMetadata({
  title: "Sign In",
  description: "Sign in to continue your RiskOps Lab training workspace.",
  path: "/sign-in",
});

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--accent-stone-400)]">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
