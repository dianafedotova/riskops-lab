import Link from "next/link";

export default function TermsPage() {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Legal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Terms &amp; Conditions
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
          RiskOps Lab is provided as a training simulator to demonstrate fraud
          and AML review workflows in a non-production environment.
        </p>
        <p>
          By using this simulator, you acknowledge that all content and
          workflows are illustrative and may not reflect complete operational,
          legal, or regulatory controls.
        </p>
        <p>
          The simulator must not be used for live customer decisions, case
          adjudication, or regulatory reporting.
        </p>
        <p>
          Features, sample data, and interface behavior may be changed at any
          time for educational purposes.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
        Use is limited to testing, training, and demonstration scenarios only.
      </div>
    </section>
  );
}
