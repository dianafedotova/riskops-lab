import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto max-w-md space-y-4 rounded border border-slate-300 bg-white p-6 text-slate-900">
      <h1 className="text-lg font-semibold">Forgot password</h1>
      <p className="text-sm text-slate-600">
        Password reset is not configured yet. Contact your RiskOps Lab administrator.
      </p>
      <p className="text-sm text-slate-600">
        <Link href="/login" className="underline">
          Back to login
        </Link>
      </p>
    </section>
  );
}
