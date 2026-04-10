import Link from "next/link";

const highlightChips = [
  "Public beta access",
  "Beginner-first practice",
  "Alerts and manual reviews",
  "Synthetic users and activity",
  "Human-reviewed submissions",
] as const;

const snapshotCards = [
  {
    title: "Users base",
    description: "Synthetic profiles, activity trails, and account context for ad hoc review.",
  },
  {
    title: "Alerts base",
    description: "Generalized signals that surface a problem without handing you the answer.",
  },
  {
    title: "Review loop",
    description: "Case assignment, watchlists, and structured write-ups built for feedback.",
  },
] as const;

const learningCards = [
  {
    kicker: "Why it exists",
    title: "From theory to casework",
    description:
      "Most entry-level AML and fraud learning material explains concepts, but not how an analyst actually thinks through a case.",
    points: [
      "Practice identifying what matters instead of memorizing definitions.",
      "Build confidence with repeatable reviews in a safe sandbox environment.",
    ],
  },
  {
    kicker: "What you practice",
    title: "Signals across the customer story",
    description:
      "RiskOps Lab is designed around the kinds of evidence a new analyst needs to connect before making a call.",
    points: [
      "Alert-driven investigations and manual ad hoc account reviews.",
      "Scenarios spanning card top-ups, bank transfers, crypto activity, and behavior shifts.",
    ],
  },
  {
    kicker: "What matters most",
    title: "Judgment over perfect mimicry",
    description:
      "The goal is not to copy one company's exact setup. The goal is to train how you see, weigh, and explain risk.",
    points: [
      "Spot red flags, separate signal from noise, and justify the next action.",
      "Learn to make decisions that are clear, defensible, and well documented.",
    ],
  },
] as const;

const simulatorAreas = [
  {
    title: "Users database",
    description:
      "Open synthetic customer profiles, trace activity, compare payment behavior, and review account context when you want to investigate outside of an alert.",
  },
  {
    title: "Alerts database",
    description:
      "Start from a surfaced signal, move into linked user context, and decide whether the pattern looks explainable, risky, or worth escalation.",
  },
] as const;

const reviewSteps = [
  {
    title: "Assign the case",
    description:
      "Claim work for yourself so the simulator feels closer to an actual analyst queue, not a static reading exercise.",
  },
  {
    title: "Build the picture",
    description:
      "Add sim users to a watch list, compare signals across the account story, and collect the red flags that support your conclusion.",
  },
  {
    title: "Submit the review",
    description:
      "Write a full decision with reasoning that can be manually reviewed for logic, prioritization, and clarity.",
  },
] as const;

export default function LandingPage() {
  const primaryButtonClass = "ui-btn ui-btn-primary";
  const secondaryButtonClass = "ui-btn ui-btn-secondary";
  const cardClass = "surface-lift evidence-shell p-6";

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
            <div className="max-w-3xl space-y-5">
              <p className="field-label">Fraud & AML Training Platform</p>
              <h1 className="max-w-3xl text-[clamp(2rem,1.55rem+1.7vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--app-shell-bg)]">
                Build practical analyst judgment in a public beta before your
                first AML or fraud role.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--accent-stone-500)] sm:text-[1.05rem]">
                RiskOps Lab is built for beginners entering AML, compliance, and anti-fraud. Instead
                of theory-only learning, it gives you a fictional operations dashboard where you
                review synthetic users, investigate alerts, run manual account checks, identify red
                flags, and practice making defensible risk decisions.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                {highlightChips.map((chip, index) => (
                  <span
                    key={chip}
                    className={index === highlightChips.length - 1 ? "ui-chip ui-chip-stone" : "ui-chip"}
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/signup" className={primaryButtonClass}>
                  Join the beta
                </Link>
                <Link href="/guide" className={primaryButtonClass}>
                  Open Guide
                </Link>
                <Link href="#inside-simulator" className={secondaryButtonClass}>
                  See the simulator
                </Link>
              </div>
            </div>

            <aside className="workspace-shell p-4 backdrop-blur">
              <p className="field-label">Practice Snapshot</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {snapshotCards.map((card) => (
                  <div key={card.title} className="content-panel p-4">
                    <h2 className="text-sm font-semibold tracking-tight text-[var(--app-shell-bg)]">
                      {card.title}
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-[var(--accent-stone-500)]">
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {learningCards.map((card) => (
            <article key={card.title} className={cardClass}>
              <p className="field-label">{card.kicker}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--app-shell-bg)]">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--accent-stone-500)]">
                {card.description}
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--accent-stone-500)]">
                {card.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand-500)]" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section id="inside-simulator" className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="shell-card p-5 sm:p-6">
            <p className="field-label">Inside the simulator</p>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[var(--app-shell-bg)]">
              Two connected practice environments
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--accent-stone-500)] sm:text-[0.98rem]">
              The project is split into a users base and an alerts base that feed each other. You
              can enter from a surfaced alert or open an account directly for manual review, then
              connect the evidence into a final judgment.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {simulatorAreas.map((area) => (
                <div key={area.title} className="content-panel p-4">
                  <h3 className="text-base font-semibold tracking-tight text-[var(--app-shell-bg)]">
                    {area.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
                    {area.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="shell-card p-5 sm:p-6">
            <p className="field-label">Review workflow</p>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[var(--app-shell-bg)]">
              Practice the full thinking loop
            </h2>
            <div className="mt-5 space-y-3">
              {reviewSteps.map((step, index) => (
                <div key={step.title} className="content-panel p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-600)] text-sm font-semibold text-white shadow-[0_8px_16px_rgba(24,42,59,0.18)]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-[var(--app-shell-bg)]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--accent-stone-500)]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[1rem] border border-[var(--border-app)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--accent-stone-500)]">
              The review flow is intentionally built for human feedback. Cases can be assigned,
              users can be added to a watch list, and completed reviews are meant to be evaluated
              on thought process, not just on the final answer.
            </div>
          </article>
        </section>

        <section className="muted-panel p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="space-y-3">
              <p className="field-label">Training design</p>
              <h2 className="text-[1.55rem] font-semibold tracking-tight text-[var(--app-shell-bg)]">
                Synthetic by nature, opinionated by design
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className="ui-badge ui-badge-teal">Fictional organization</span>
                <span className="ui-badge ui-badge-blue">AI-generated selfies</span>
                <span className="ui-badge ui-badge-amber">Early-stage project</span>
              </div>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--accent-stone-500)] sm:text-[0.98rem]">
              <p>
                All data in RiskOps Lab is fictional, and the profile selfies are AI-generated. The
                beta is framed as the control panel of a made-up organization so newcomers can
                practice safely without confusing it with a live production environment.
              </p>
              <p>
                Alerts are intentionally generalized rather than exact replicas of one company&apos;s
                monitoring stack. In real teams, alert design depends on risk appetite, customer
                base, product mix, and operations maturity. Here, the point is to help beginners
                see the risk, follow the logic, and explain the decision.
              </p>
              <p>
                The public beta is still at an early stage and will keep expanding with new
                scenarios, deeper casework, and more review feedback over time.
              </p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-[var(--brand-600)] via-[var(--brand-700)] to-[var(--brand-500)] p-6 shadow-[0_18px_38px_rgba(0,0,0,0.32)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[var(--surface-workspace)]/10 [clip-path:polygon(25%_0,100%_0,100%_100%,0_100%)]"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200/90">Get Access</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Open public beta</h2>
              <p className="mt-2 text-sm leading-6 text-slate-100/90">
                Create an account to access the simulator. Every new beta user
                is provisioned as a trainee inside the shared public beta
                workspace.
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
