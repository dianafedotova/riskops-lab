import Link from "next/link";

export default function LandingPage() {
  const primaryButtonClass =
    "ui-btn ui-btn-primary";
  const secondaryButtonClass =
    "ui-btn ui-btn-secondary";
  const cardClass =
    "surface-lift evidence-shell p-6";

  return (
    <div className="main-content-shell p-3 sm:p-5 md:p-6">
      <div className="space-y-6">
        <section className="shell-card relative overflow-hidden p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-500/18 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-3xl space-y-4">
            <p className="field-label">Fraud & AML Training Platform</p>
            <h1 className="heading-page">RiskOps Lab</h1>
            <p className="text-base leading-7 text-[var(--accent-stone-500)]">
              A training platform for fraud and AML operations teams. RiskOps Lab helps analysts
              practice investigation flows, decision-making, and review consistency in a safe
              simulation environment.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="ui-chip">
                Role-based workflows
              </span>
              <span className="ui-chip">
                Synthetic risk data
              </span>
              <span className="ui-chip ui-chip-stone">
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

          <aside className="workspace-shell p-4 backdrop-blur">
            <p className="field-label">Platform Snapshot</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="content-panel p-3 text-center">
                <p className="text-xl font-semibold tracking-tight text-[var(--app-shell-bg)]">3</p>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--accent-stone-400)]">Core Flows</p>
              </div>
              <div className="content-panel p-3 text-center">
                <p className="text-xl font-semibold tracking-tight text-[var(--app-shell-bg)]">24/7</p>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--accent-stone-400)]">Sandbox Access</p>
              </div>
              <div className="content-panel p-3 text-center">
                <p className="text-xl font-semibold tracking-tight text-[var(--app-shell-bg)]">100%</p>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--accent-stone-400)]">Synthetic Data</p>
              </div>
            </div>
          </aside>
        </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className={cardClass}>
          <p className="field-label">Purpose</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--app-shell-bg)]">Project Purpose</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            Build practical risk review habits with repeatable cases and realistic signals that improve
            analyst readiness.
          </p>
          </article>
          <article className={cardClass}>
          <p className="field-label">Capabilities</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--app-shell-bg)]">Key Capabilities</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            Scenario-based workflows, structured risk context, and role-based review paths designed for
            operations learning.
          </p>
          </article>
          <article className={`${cardClass} md:col-span-2 xl:col-span-1`}>
          <p className="field-label">Outcomes</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--app-shell-bg)]">Team Outcomes</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            Improve review quality, speed up onboarding, and align investigation decisions across teams.
          </p>
          </article>
        </section>

        <section className="relative overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-[var(--brand-600)] via-[var(--brand-700)] to-[var(--brand-500)] p-6 shadow-[0_18px_38px_rgba(0,0,0,0.32)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[var(--surface-workspace)]/10 [clip-path:polygon(25%_0,100%_0,100%_100%,0_100%)]"
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
              className="inline-flex min-h-11 items-center justify-center rounded-[1.2rem] bg-[var(--surface-workspace)] px-5 py-2 text-sm font-semibold text-[var(--app-shell-bg)] shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--surface-main)] active:translate-y-0 sm:min-h-0 sm:py-2"
            >
              Start training
            </Link>
          </div>
        </div>
        </section>
      </div>
    </div>
  );
}
