import Link from "next/link";

export default function Home() {
  const metricCards = [
    {
      title: "Open Fraud Alerts",
      value: "24",
    },
    {
      title: "Open AML Alerts",
      value: "11",
    },
    {
      title: "Users Under Review",
      value: "37",
    },
    {
      title: "Review Completed",
      value: "78",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Simulation Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Internal simulator for fraud and AML analyst workflows.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/users"
              className="rounded-md bg-[#264B5A] px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-[#315E70] active:bg-[#1F3E49]"
            >
              Open Users
            </Link>
            <Link
              href="/alerts"
              className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
            >
              Open Alerts
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <article
            key={card.title}
            className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.09)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {card.title}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-800">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-300 bg-slate-100 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-semibold text-slate-900">Simulator Scope</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Practice triage, profile reviews, and alert decisions with synthetic
            risk data in a controlled environment. This is an internal training
            UI and not connected to production controls.
          </p>
        </article>
        <article className="rounded-xl border border-slate-300 bg-slate-100 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-semibold text-slate-900">Quick Access</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/guide"
              className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              Open Guide
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              About RiskOps Lab
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
