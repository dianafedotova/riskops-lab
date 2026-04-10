import { PublicBetaNote } from "@/components/public-beta-note";

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
          RiskOps Lab is a public beta training product for beginner-friendly
          fraud and anti-money laundering (AML) investigation practice.
        </p>
        <p>
          It gives external beta users a fictional operations workspace where
          they can review synthetic user profiles, investigate alerts, and
          document structured risk decisions in a controlled environment.
        </p>
        <p>
          Fraud workflows focus on suspicious behavior, account misuse, and
          transaction anomalies. AML workflows focus on sanctions exposure,
          suspicious activity patterns, and escalation handling.
        </p>
        <p>
          All data in the beta must remain synthetic or fictional. Do not enter
          real customer information, real case evidence, credentials, or other
          secrets.
        </p>
      </div>

      <PublicBetaNote title="What this beta is for" />
    </section>
  );
}
