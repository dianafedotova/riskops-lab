import Link from "next/link";

export default function GuidePage() {
  return (
    <section className="space-y-5 rounded-2xl bg-slate-50 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Guide
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            How the simulator works
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Back to Home
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-slate-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Review workflow
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Start in Users or Alerts, open a detail view, and review synthetic
            context before selecting an analyst action.
          </p>
        </article>
        <article className="rounded-xl bg-slate-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            What users can review
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            User identity fields, risk snapshots, alert metadata, and
            investigation placeholders for case handling practice.
          </p>
        </article>
        <article className="rounded-xl bg-slate-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Fraud vs AML alerts
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Fraud alerts emphasize behavioral misuse and transaction anomalies.
            AML alerts emphasize sanctions and suspicious flow patterns.
          </p>
        </article>
        <article className="rounded-xl bg-slate-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Decisions and actions
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Typical outcomes include clear, monitor, request additional checks,
            or escalate for enhanced investigation.
          </p>
        </article>
      </div>

      <div className="rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700 shadow-sm">
        <p>
          <span className="font-semibold">Limitations and assumptions:</span>{" "}
          this simulator is UI-focused and currently does not include backend
          logic, audit trails, model scoring, or regulator-specific policy
          implementation.
        </p>
      </div>

      <div className="rounded-xl bg-amber-100/95 p-4 text-sm text-amber-900 shadow-sm">
        Training-only disclaimer: RiskOps Lab is for learning and demonstration,
        not for real customer decisions.
      </div>
    </section>
  );
}
