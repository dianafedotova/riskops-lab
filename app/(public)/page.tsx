import Link from "next/link";

type IconName = "alert" | "book" | "note" | "path" | "shield" | "spark";

const beginnerPainPoints = [
  {
    title: "Theory is not enough",
    description:
      "Most entry-level learning explains concepts, but not how an analyst actually thinks through a case.",
    icon: "book",
  },
  {
    title: "Real tools feel intimidating",
    description:
      "RiskOps Lab gives you a safer place to practice before your first real operations role.",
    icon: "shield",
  },
  {
    title: "Decisions are hard to explain",
    description:
      "You learn not only what looks risky, but how to justify the next step clearly.",
    icon: "note",
  },
] as const;

const productBenefits = [
  {
    title: "Synthetic cases",
    description:
      "Practice on fictional users, alerts, and activity without confusing training with live operations.",
    icon: "spark",
  },
  {
    title: "Guided investigations",
    description:
      "Follow a clearer path from signal to context to decision instead of staring at a blank dashboard.",
    icon: "path",
  },
  {
    title: "Review-oriented training",
    description:
      "Write decisions, compare evidence, and build judgment that is easier to defend.",
    icon: "alert",
  },
] as const;

const firstCaseSteps = [
  {
    step: "01",
    title: "Open a case",
    description: "Start from an alert or a user profile.",
  },
  {
    step: "02",
    title: "Review the evidence",
    description: "Check activity, context, and possible red flags.",
  },
  {
    step: "03",
    title: "Make a decision",
    description: "Write a clear conclusion and explain your reasoning.",
  },
] as const;

function Glyph({ icon, className = "h-5 w-5" }: { icon: IconName; className?: string }) {
  switch (icon) {
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
        </svg>
      );
    case "path":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M5 19c0-3.3 2.7-6 6-6h2a4 4 0 1 0 0-8H8" />
          <path d="M8 3 4 5.5 8 8" />
          <path d="M16 21 20 18.5 16 16" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15H6.5A2.5 2.5 0 0 0 4 21V6.5Z" />
          <path d="M8 7h8M8 11h8" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M12 3 5.5 6v5.3c0 4.2 2.8 8 6.5 9.7 3.7-1.7 6.5-5.5 6.5-9.7V6L12 3Z" />
          <path d="m9.5 12 1.7 1.7 3.3-3.4" />
        </svg>
      );
    case "note":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M7 4h7l4 4v12H7z" />
          <path d="M14 4v4h4" />
          <path d="M10 13h5M10 17h4" />
        </svg>
      );
    case "alert":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
          <path d="M12 4 4.5 18h15L12 4Z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="16" r=".8" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

function IconBadge({ icon }: { icon: IconName }) {
  return (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-app)] bg-white text-[var(--brand-700)] shadow-[0_10px_20px_rgba(18,32,46,0.07)]">
      <Glyph icon={icon} />
    </span>
  );
}

export default function LandingPage() {
  const primaryButtonClass = "ui-btn ui-btn-primary";
  const secondaryButtonClass = "ui-btn ui-btn-secondary";

  return (
    <div className="main-content-shell p-3 sm:p-5 md:p-6">
      <div className="space-y-8 md:space-y-10">
        <section className="shell-card relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 top-0 h-56 w-56 rounded-full bg-brand-500/12 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl"
          />

          <div className="relative max-w-4xl space-y-7">
            <p className="field-label">Fraud & AML Training Platform</p>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-[clamp(2.2rem,1.6rem+2.7vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--app-shell-bg)]">
                Build AML and fraud investigation skills before your first role.
              </h1>
              <p className="max-w-2xl text-[1.02rem] leading-8 text-[var(--accent-stone-500)] sm:text-[1.15rem]">
                RiskOps Lab helps beginners practice how analysts review alerts,
                investigate account activity, and explain risk decisions with confidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={primaryButtonClass}>
                Start your first case
              </Link>
              <Link href="/guide" className={secondaryButtonClass}>
                Open Guide
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {beginnerPainPoints.map((item) => (
            <article key={item.title} className="surface-lift evidence-shell p-6 sm:p-7">
              <div className="space-y-4">
                <IconBadge icon={item.icon} />
                <div className="space-y-2">
                  <p className="field-label">For beginners</p>
                  <h2 className="text-[1.35rem] font-semibold tracking-tight text-[var(--app-shell-bg)]">
                    {item.title}
                  </h2>
                  <p className="text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[0.98rem]">
                    {item.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="shell-card p-6 sm:p-8">
          <div className="max-w-2xl space-y-3">
            <p className="field-label">What RiskOps Lab Gives You</p>
            <h2 className="text-[1.75rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[2rem]">
              A simpler way to start practicing.
            </h2>
            <p className="text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[1rem]">
              The experience is designed to help beginners start with a clearer, more manageable
              first case.
            </p>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {productBenefits.map((item) => (
              <article key={item.title} className="rounded-[1.2rem] border border-[var(--border-subtle)] bg-white/78 p-5 shadow-[0_10px_22px_rgba(17,33,46,0.05)]">
                <div className="space-y-4">
                  <IconBadge icon={item.icon} />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold tracking-tight text-[var(--app-shell-bg)]">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-7 text-[var(--accent-stone-500)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="shell-card p-6 sm:p-8">
            <div className="max-w-lg space-y-3">
              <p className="field-label">Your First Case</p>
              <h2 className="text-[1.75rem] font-semibold tracking-tight text-[var(--app-shell-bg)] sm:text-[2rem]">
                Your first case in three steps.
              </h2>
              <p className="text-sm leading-7 text-[var(--accent-stone-500)] sm:text-[1rem]">
                The goal is to make the first investigation feel structured, not intimidating.
              </p>
            </div>
          </article>

          <article className="shell-card p-6 sm:p-8">
            <div className="space-y-3">
              {firstCaseSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[1.2rem] border border-[var(--border-subtle)] bg-white/80 p-4 shadow-[0_10px_20px_rgba(17,33,46,0.05)]"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-600)] text-sm font-semibold tracking-[0.08em] text-white shadow-[0_10px_18px_rgba(24,42,59,0.16)]">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-[var(--app-shell-bg)]">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-7 text-[var(--accent-stone-500)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="relative overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-[var(--brand-600)] via-[var(--brand-700)] to-[var(--brand-500)] p-6 sm:p-7 shadow-[0_18px_38px_rgba(0,0,0,0.32)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[var(--surface-workspace)]/10 [clip-path:polygon(25%_0,100%_0,100%_100%,0_100%)]"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200/90">
                Start Practical Training
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Begin with your first guided case.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-100/90">
                Create an account and start practicing with a simpler first-step experience.
              </p>
            </div>
            <div>
              <Link
                href="/signup"
                className="inline-flex min-h-11 items-center justify-center rounded-[1.2rem] bg-[var(--surface-workspace)] px-5 py-2 text-sm font-semibold text-[var(--app-shell-bg)] shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--surface-main)] active:translate-y-0 sm:min-h-0 sm:py-2"
              >
                Start your first case
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
