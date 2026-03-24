import Link from "next/link";

export default function PrivacyPage() {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Legal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Privacy
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Back to Home
        </Link>
      </div>

      <div className="space-y-4 text-sm leading-6 text-slate-700">
        <p>
          RiskOps Lab uses synthetic data for training and simulation. No real
          personal or customer information is required for standard use.
        </p>
        <p>
          Any locally entered notes or temporary simulator inputs should be
          treated as non-production artifacts and handled under your internal
          training policies.
        </p>
        <p>
          This UI does not currently implement production-grade data retention,
          encryption, consent management, or audit controls.
        </p>
        <p>
          Do not input sensitive personal data, credentials, or real case
          materials into this simulator.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
        Privacy notice: this simulator is for internal learning and
        demonstration purposes only.
      </div>
    </section>
  );
}
