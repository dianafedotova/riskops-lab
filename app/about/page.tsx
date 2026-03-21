import Link from "next/link";

export default function AboutPage() {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            About
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            What is RiskOps Lab?
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
          RiskOps Lab is a front-end simulator designed for internal fraud and
          anti-money laundering (AML) risk operations training.
        </p>
        <p>
          The simulator helps analysts practice reviewing user profiles,
          investigating alerts, and documenting structured risk decisions in a
          controlled environment.
        </p>
        <p>
          Fraud workflows focus on suspicious behavior, account misuse, and
          transaction anomalies. AML workflows focus on sanctions exposure,
          suspicious activity patterns, and escalation handling.
        </p>
        <p>
          All data shown in this simulator is synthetic and intended for
          educational purposes only.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
        Not for production use. RiskOps Lab does not include live integrations,
        regulatory controls, or complete operational safeguards.
      </div>
    </section>
  );
}
