export default function AboutPage() {
  return (
    <section className="space-y-5 rounded-[1.2rem] bg-[var(--surface-panel)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)] sm:p-6">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
            About
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--app-shell-bg)]">
            What is RiskOps Lab?
          </h1>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-6 text-[var(--accent-stone-500)]">
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

      <div className="rounded-[1.2rem] border border-[var(--border-app)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--accent-stone-500)] shadow-sm">
        Not for production use. RiskOps Lab does not include live integrations,
        regulatory controls, or complete operational safeguards.
      </div>
    </section>
  );
}

