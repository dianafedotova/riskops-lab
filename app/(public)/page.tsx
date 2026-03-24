import Link from "next/link";

export default function LandingPage() {
  const primaryButtonClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_8px_18px_rgba(38,75,90,0.35)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-500 active:translate-y-0 sm:min-h-0 sm:px-4 sm:py-2";
  const secondaryButtonClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-800 transition-all duration-150 hover:-translate-y-0.5 hover:bg-white sm:min-h-0 sm:px-4 sm:py-2";
  const cardClass =
    "surface-lift rounded-2xl border border-slate-300/90 bg-slate-50 p-6 shadow-[0_12px_26px_rgba(15,23,42,0.10)]";

  return (
    <div className="space-y-6">
      <section className="page-panel relative overflow-hidden p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/25 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-3xl space-y-4">
            <p className="field-label">Fraud & AML Training Platform</p>
            <h1 className="heading-page">RiskOps Lab</h1>
            <p className="text-base leading-7 text-slate-700">
              A training platform for fraud and AML operations teams. RiskOps Lab helps analysts
              practice investigation flows, decision-making, and review consistency in a safe
              simulation environment.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-600">
                Role-based workflows
              </span>
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-600">
                Synthetic risk data
              </span>
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-600">
                Team decision alignment
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/guide" className={primaryButtonClass}>
                Open Guide
              </Link>
              <Link href="/about" className={secondaryButtonClass}>
                About RiskOps Lab
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-300/90 bg-white/90 p-4 shadow-[0_12px_24px_rgba(15,23,42,0.10)] backdrop-blur">
            <p className="field-label">Platform Snapshot</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-semibold tracking-tight text-slate-900">3</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">Core Flows</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-semibold tracking-tight text-slate-900">24/7</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">Sandbox Access</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-semibold tracking-tight text-slate-900">100%</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">Synthetic Data</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className={cardClass}>
          <p className="field-label">Purpose</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Project Purpose</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Build practical risk review habits with repeatable cases and realistic signals that improve
            analyst readiness.
          </p>
        </article>
        <article className={cardClass}>
          <p className="field-label">Capabilities</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Key Capabilities</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Scenario-based workflows, structured risk context, and role-based review paths designed for
            operations learning.
          </p>
        </article>
        <article className={`${cardClass} md:col-span-2 xl:col-span-1`}>
          <p className="field-label">Outcomes</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Team Outcomes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Improve review quality, speed up onboarding, and align investigation decisions across teams.
          </p>
        </article>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-[#345868]/80 bg-gradient-to-r from-[#264B5A] to-[#315E70] p-6 shadow-[0_16px_30px_rgba(2,6,23,0.25)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-white/10 [clip-path:polygon(25%_0,100%_0,100%_100%,0_100%)]"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200/90">Get Access</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Want to try it?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-100/90">
              If you are not registered yet, create an account to access the simulator.
            </p>
          </div>
          <div>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-100 active:translate-y-0 sm:min-h-0 sm:py-2"
            >
              Start training
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
