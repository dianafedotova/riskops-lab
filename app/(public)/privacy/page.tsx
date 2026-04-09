export default function PrivacyPage() {
  return (
    <section className="space-y-5 rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-panel)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)] sm:p-6">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
            Legal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--app-shell-bg)]">
            Privacy
          </h1>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-6 text-[var(--accent-stone-500)]">
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

      <div className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--accent-stone-500)]">
        Privacy notice: this simulator is for internal learning and
        demonstration purposes only.
      </div>
    </section>
  );
}

