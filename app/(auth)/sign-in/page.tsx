import { Suspense } from "react";
import { LoginForm } from "../login/login-form";

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-300">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
