import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-10">
      <section className="page-panel surface-lift w-full space-y-4 p-6 text-[var(--app-shell-bg)]">
        <p className="field-label">404</p>
        <h1 className="heading-page">We could not find that page.</h1>
        <p className="text-sm leading-6 text-[var(--accent-stone-500)]">
          The link may be outdated, or the page may require a different beta route.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="ui-btn ui-btn-primary">
            Go home
          </Link>
          <Link href="/guide" className="ui-btn ui-btn-secondary">
            Open guide
          </Link>
        </div>
      </section>
    </div>
  );
}
