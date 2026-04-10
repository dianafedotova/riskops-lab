import { PublicBetaNote } from "@/components/public-beta-note";

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
          RiskOps Lab is provided as a public beta training workspace for fraud
          and AML review practice in a non-production environment.
        </p>
        <p>
          By using the beta, you acknowledge that workflows, scenarios, and
          content are illustrative and may change without notice while we
          improve the product.
        </p>
        <p>
          The beta must not be used for live customer decisions, case
          adjudication, regulatory reporting, or storage of real customer
          records.
        </p>
        <p>
          You are responsible for keeping your usage synthetic-only and for
          reporting issues through the published support channel.
        </p>
      </div>

      <PublicBetaNote title="Beta use terms" />
    </section>
  );
}
