import Link from "next/link";

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-md space-y-4 rounded border border-slate-300 bg-white p-6 text-slate-900">
      <h1 className="text-lg font-semibold">Sign up</h1>
      <p className="text-sm text-slate-600">Create your RiskOps Lab access account.</p>
      <form className="space-y-3">
        <label className="block text-sm">
          <span className="text-slate-600">Email</span>
          <input
            type="email"
            placeholder="name@company.com"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Password</span>
          <input
            type="password"
            placeholder="Create a password"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Confirm password</span>
          <input
            type="password"
            placeholder="Repeat your password"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            autoComplete="new-password"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-md bg-slate-800 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-slate-700 active:translate-y-[1px] active:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60"
        >
          Create account
        </button>
      </form>
      <p className="text-xs text-slate-500">
        Demo UI: signup submission is not connected yet.
      </p>
      <p className="text-sm text-slate-600">
        <Link href="/login" className="underline">
          Already have an account? Sign in
        </Link>
      </p>
    </section>
  );
}
