import Link from "next/link";

export default function DashboardPage() {
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
    <div className="main-content-shell p-3 sm:p-5 md:p-6">
      <div className="space-y-4">
        <section className="page-panel surface-lift p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="heading-page">Simulation Overview</h1>
            <p className="mt-1 text-sm text-slate-600">
              Internal simulator for fraud and AML analyst workflows.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Link
              href="/users"
              className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-brand-500 active:bg-[#1F3E49] sm:min-h-0 sm:px-3 sm:py-1.5"
            >
              Open Users
            </Link>
            <Link
              href="/alerts"
              className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors duration-150 hover:bg-slate-200 sm:min-h-0 sm:px-3 sm:py-1.5"
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
              className="surface-lift rounded-xl bg-slate-50 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.09)] transition-shadow duration-150"
            >
              <p className="field-label">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-800">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="surface-lift rounded-xl bg-slate-100 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-shadow duration-150">
            <h2 className="text-lg font-semibold text-slate-900">Simulator Scope</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Practice triage, profile reviews, and alert decisions with synthetic risk data in a controlled
              environment. This is an internal training UI and not connected to production controls.
            </p>
          </article>
          <article className="surface-lift rounded-xl bg-slate-100 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-shadow duration-150">
            <h2 className="text-lg font-semibold text-slate-900">Quick Access</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/guide"
                className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200"
              >
                Open Guide
              </Link>
              <Link
                href="/about"
                className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-200"
              >
                About RiskOps Lab
              </Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
