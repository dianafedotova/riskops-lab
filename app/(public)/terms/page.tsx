export default function TermsPage() {
  return (
    <section className="space-y-5 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-panel)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)] sm:p-6">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-stone-500)]">
            Legal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--app-shell-bg)]">
            Terms &amp; Conditions
          </h1>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-6 text-[var(--accent-stone-500)]">
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

      <div className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--accent-stone-500)]">
        Use is limited to testing, training, and demonstration scenarios only.
      </div>
    </section>
  );
}

