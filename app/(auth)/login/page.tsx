import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-300">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
