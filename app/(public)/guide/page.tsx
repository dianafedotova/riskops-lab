import { PublicBetaNote } from "@/components/public-beta-note";
import {
  buildPublicPageMetadata,
  buildPublicWebPageJsonLd,
  serializeJsonLd,
} from "@/lib/public-seo";

export const metadata = buildPublicPageMetadata({
  title: "Simulator Guide",
  description:
    "Understand how the RiskOps Lab simulator works, from alert review to analyst decisions in synthetic fraud and AML workflows.",
  path: "/guide",
});

export default function GuidePage() {
  const guideJsonLd = buildPublicWebPageJsonLd({
    name: "RiskOps Lab Guide",
    path: "/guide",
    description:
      "Guide to the RiskOps Lab simulator covering review workflow, alerts, and analyst actions in a synthetic training environment.",
    about: [
      "Alert review workflow",
      "Fraud analyst practice",
      "AML analyst practice",
    ],
  });

  return (
    <section className="space-y-5 rounded-[1.2rem] bg-[var(--surface-panel)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)] sm:p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(guideJsonLd) }}
      />
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-stone-500)]">
            Guide
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--app-shell-bg)]">
            How the simulator works
          </h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.2rem] bg-[var(--surface-main)] p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-stone-500)]">
            Review workflow
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            Start in Users or Alerts, open a detail view, and review synthetic
            context before selecting an analyst action.
          </p>
        </article>
        <article className="rounded-[1.2rem] bg-[var(--surface-main)] p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-stone-500)]">
            What users can review
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            User identity fields, risk snapshots, alert metadata, and
            investigation placeholders for case handling practice.
          </p>
        </article>
        <article className="rounded-[1.2rem] bg-[var(--surface-main)] p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-stone-500)]">
            Fraud vs AML alerts
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            Fraud alerts emphasize behavioral misuse and transaction anomalies.
            AML alerts emphasize sanctions and suspicious flow patterns.
          </p>
        </article>
        <article className="rounded-[1.2rem] bg-[var(--surface-main)] p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-stone-500)]">
            Decisions and actions
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
            Typical outcomes include clear, monitor, request additional checks,
            or escalate for enhanced investigation.
          </p>
        </article>
      </div>

      <div className="rounded-[1.2rem] bg-[var(--surface-main)] p-4 text-sm leading-6 text-[var(--accent-stone-500)] shadow-sm">
        <p>
          <span className="font-semibold">Beta assumptions:</span> this product
          is designed for training loops, not live adjudication. It supports
          synthetic review practice, shared beta accounts, and manual feedback
          on analyst reasoning.
        </p>
      </div>

      <PublicBetaNote title="Synthetic-only rule" />
    </section>
  );
}
