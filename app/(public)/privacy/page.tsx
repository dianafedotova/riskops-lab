import { PublicBetaNote } from "@/components/public-beta-note";
import { buildPublicPageMetadata } from "@/lib/public-seo";

export const metadata = buildPublicPageMetadata({
  title: "Privacy",
  description:
    "Read the RiskOps Lab beta privacy baseline and the synthetic-data rules for using the simulator safely.",
  path: "/privacy",
});

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
          RiskOps Lab public beta is built around synthetic data for training
          and simulation. Standard use should not require real personal or
          customer information.
        </p>
        <p>
          Any notes, uploads, or temporary inputs you add inside the beta
          should be treated as training artifacts only.
        </p>
        <p>
          We use the product to improve the beta, operate authentication, and
          review reported issues. Do not rely on the beta as a system of record
          or a place to store sensitive materials.
        </p>
        <p>
          Never input real personal data, credentials, production secrets, or
          live case materials into RiskOps Lab.
        </p>
      </div>

      <PublicBetaNote title="Beta privacy baseline" />
    </section>
  );
}
