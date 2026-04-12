# Growth Program

## 1. Purpose

This document is the source of truth for growth-oriented implementation work across:

- technical SEO
- search visibility tooling
- analytics and tag management
- paid-media instrumentation
- content / knowledge-base foundations
- product email infrastructure

The goal is to make future requests like:

- `do wave 1`
- `do wave 2`
- `do wave 3`

unambiguous, so implementation can follow this plan instead of inventing a new scope each time.

---

## 2. Standing Decisions

These decisions are already made and should not be re-litigated unless explicitly changed by the user.

### 2.1 Branch naming is strict

Use:

- `feature/...`
- `fix/...`
- `chore/...`
- `refactor/...`
- `test/...`

Important:

- never use `feat/...`
- CI depends on the approved prefixes above

Recommended wave branch names:

- `feature/growth-wave-1-foundation`
- `feature/growth-wave-2-knowledge-base`
- `feature/growth-wave-3-product-email`

---

### 2.2 Content section naming

Use `Knowledge Base` as the default product/marketing label for the content section.

Do not use:

- `Academy`

`Blog` is acceptable as a future marketing rename, but the default plan and information architecture in this program use `Knowledge Base`.

---

### 2.3 Content scope exclusions

Initial content scope does **not** include:

- `Sanctions`

Initial content categories are:

- `AML Basics`
- `Fraud Basics`
- `Career`
- `Glossary`
- `Product Guides`

---

### 2.4 Consent / CMP choice

Use `Silktide` as the consent-management platform for non-essential tracking.

This plan assumes:

- consent gating for analytics and ad tags
- no direct uncontrolled vendor script sprawl
- consent state is centralized and respected before firing non-essential tags

---

### 2.5 Paid / remarketing stack choice

The approved paid-growth and remarketing stack is:

- `Google Tag Manager`
- `GA4`
- `Google Ads`
- `Meta Pixel`
- `LinkedIn Insight Tag`

Do not add `Microsoft Clarity` in the current program unless explicitly requested later.

---

### 2.6 Email provider split

Use providers by responsibility:

- `Supabase Auth` for authentication emails
- `Resend` for product emails

`Supabase Auth` should remain responsible for:

- signup confirmation
- email confirmation
- password reset
- magic link / auth recovery
- other auth-owned system emails

`Resend` should be introduced for application-owned product notifications, for example:

- `your case was reviewed`
- `new alerts available`
- `action required`

Do **not** move auth emails from Supabase to Resend as part of the normal plan.

If any non-auth emails are later found to be sent via Supabase, only those may be migrated.

---

## 3. Current Baseline

As of this plan:

- global root metadata already exists
- `robots.txt` and `sitemap.xml` already exist
- `favicon.ico` already exists
- `Amplitude`, `Sentry`, `Vercel Analytics`, and `Vercel Speed Insights` are already present
- public pages currently exist for landing, about, guide, privacy, and terms
- there is no content section yet for `Knowledge Base`
- there is no application-owned product-email layer yet

Important current-state note:

- repository inspection currently shows Supabase Auth email flows for signup / login / reset-password
- repository inspection does **not** currently show an existing in-app product-notification sender

So wave 3 should be treated as introducing product-email infrastructure, not replacing core auth flows.

---

## 4. Route Policy

All future growth work must respect route classification.

### 4.1 Indexable public marketing routes

Examples:

- `/`
- `/about`
- `/guide`
- future `/knowledge-base`
- future `/knowledge-base/**`

Rules:

- eligible for indexing
- included in `sitemap.xml`
- allowed in `robots.txt`
- allowed to load GTM
- eligible for GA4 / Ads / Meta / LinkedIn tracking subject to consent

---

### 4.2 Public funnel routes that should not index

Examples:

- `/sign-in`
- `/signup`
- `/forgot-password`
- `/reset-password`

Rules:

- public and useful for acquisition funnels
- should be `noindex`
- should be excluded from sitemap
- may still participate in funnel tracking and conversion measurement

---

### 4.3 Protected product routes

Examples:

- `/dashboard`
- `/workspace`
- `/my-cases`
- `/alerts/**`
- `/users/**`
- `/profile`
- `/admin/**`

Rules:

- never index
- never appear in public sitemap
- never load remarketing / ad-platform tags intended for public marketing measurement
- product analytics may continue through approved product analytics tooling

Important:

- `Meta Pixel`
- `LinkedIn Insight Tag`
- Google Ads remarketing tags

must **not** be allowed to run across protected simulator / admin / investigation surfaces.

---

## 5. Global Technical Rules

### 5.1 One integration shell per concern

Do not scatter vendor snippets through individual pages.

Use centralized wrappers / helpers for:

- GTM
- consent-aware tag loading
- public event pushes
- SEO helpers
- product email sending

---

### 5.2 Data layer is the public event contract

Public growth events must be pushed through a stable `dataLayer` contract rather than ad hoc inline vendor calls.

This allows:

- GTM control without code churn
- easier QA
- clearer consent handling
- cleaner future mapping to GA4 / Ads / Meta / LinkedIn

---

### 5.3 Metadata is route-owned

Each important public route should own its page metadata rather than depending only on the global root metadata.

At minimum, important public routes need:

- title
- description
- canonical
- social sharing metadata
- index / noindex policy

---

### 5.4 Structured data should use native script tags

Use JSON-LD via native `<script type="application/ld+json">` in route components or layouts.

Do not use ad-hoc third-party helpers unless explicitly required.

---

### 5.5 Keep ad tags out of sensitive product surfaces

Public acquisition and remarketing tags are for:

- marketing pages
- knowledge-base pages
- public auth/funnel pages

They are not for:

- investigation workspace
- trainee review flows
- admin surfaces
- case-management internals

---

### 5.6 Program is wave-based

Do not silently bundle all waves together.

If the user later says:

- `do wave 1`
- `do wave 2`
- `do wave 3`

implement only that wave, plus the minimum prerequisites required to make it coherent.

---

## 6. Wave 1 — Foundation: SEO, Measurement, Consent, Search Tooling

### 6.1 Goal

Wave 1 establishes the public growth foundation so the site can:

- be indexed correctly
- be measured correctly
- support Google Ads / Meta / LinkedIn audiences
- respect consent rules
- avoid leaking ad tracking into protected product routes

---

### 6.2 In scope

#### A. Tag-management shell

- add `Google Tag Manager` bootstrap in a centralized integration component
- make GTM available on approved public routes
- keep GTM configuration centralized and env-driven
- define the public `dataLayer` contract

#### B. Consent layer

- integrate `Silktide`
- ensure non-essential tags wait for consent
- keep consent gating centralized rather than page-local

#### C. Public funnel measurement

Define and implement public growth events such as:

- `landing_viewed`
- `cta_clicked`
- `guide_viewed`
- `signup_started`
- `signup_completed`
- `login_completed`

Each event payload should support stable fields where relevant:

- `page_type`
- `route_group`
- `cta_name`
- `cta_location`
- `content_category`
- `content_slug`
- `actor_state`

The exact payload can be refined during implementation, but the naming must stay consistent.

#### D. GA4 / Ads / Meta / LinkedIn readiness

- prepare event flow so GTM can map events to `GA4`
- make conversion measurement possible for `Google Ads`
- allow `Meta Pixel` and `LinkedIn Insight Tag` to be managed through GTM
- enforce route gating so those tags do not run on protected product pages

#### E. Technical SEO foundation

- add page-level metadata for important public routes
- add canonical URLs for important public routes
- add `noindex` metadata for auth routes
- improve Open Graph / Twitter sharing metadata
- add structured data for relevant public pages
- add app/site manifest if useful for public metadata completeness
- add an OG sharing image strategy

#### F. Search tooling foundation

- support `Google Search Console` verification
- support `Bing Webmaster Tools` verification
- polish `robots.txt`
- polish `sitemap.xml`
- add `IndexNow` support
- document `Ahrefs Webmaster Tools` verification and expected use

---

### 6.3 Preferred implementation shape

Wave 1 should likely introduce or refine modules in areas like:

- `app/layout.tsx`
- public route files under `app/(public)/**`
- auth route metadata under `app/(auth)/**`
- `app/robots.ts`
- `app/sitemap.ts`
- new shared SEO helpers under `lib/**`
- new public tracking helpers / components under `components/**` or `lib/**`

Preferred architecture:

- one centralized GTM integration component
- one centralized consent integration component
- one shared helper for public `dataLayer` pushes
- one shared helper for reusable public-route metadata

---

### 6.4 Expected environment variables

Wave 1 should prefer a minimal, explicit env surface.

App-level env candidates:

- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_SILKTIDE_CSS_URL`
- `NEXT_PUBLIC_SILKTIDE_JS_URL`
- `NEXT_PUBLIC_SILKTIDE_CONFIG_JSON`
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- `INDEXNOW_KEY`

Important implementation note:

- GA4, Google Ads, Meta, and LinkedIn tag details should preferably live in GTM workspace configuration rather than exploding app env surface

---

### 6.5 Acceptance criteria

Wave 1 is complete when:

- public marketing routes have route-owned metadata
- auth routes are `noindex`
- public sitemap excludes protected and auth-only routes
- public routes can push stable `dataLayer` events
- GTM is installed in a centralized way
- Silktide gates non-essential tags
- Google / Bing verification can be injected without manual HTML editing
- ad / remarketing tags are structurally prevented from loading on protected product routes
- an IndexNow path/key mechanism is available

---

### 6.6 Explicitly out of scope

Wave 1 does **not** include:

- `Knowledge Base` article system
- content production
- `Resend`
- product-email notifications
- `Microsoft Clarity`
- moving Supabase auth emails

---

## 7. Wave 2 — Knowledge Base and Content SEO

### 7.1 Goal

Wave 2 introduces the public content layer that can grow organic search visibility over time.

The section is called:

- `Knowledge Base`

not:

- `Academy`

`Blog` may be used later as a marketing label, but implementation defaults to `Knowledge Base`.

---

### 7.2 Default implementation decision

Unless explicitly changed, wave 2 should implement a repo-backed content system.

Default assumption:

- content lives in-repo, not in a headless CMS
- content lives under a dedicated content directory
- articles use structured frontmatter / metadata

Recommended default:

- repo-backed `MDX` or markdown-first article files

Do **not** introduce a headless CMS in wave 2 unless explicitly requested.

---

### 7.3 Route and information architecture

Preferred route shape:

- `/knowledge-base`
- `/knowledge-base/category/[category]`
- `/knowledge-base/[slug]`

Initial category set:

- `aml-basics`
- `fraud-basics`
- `career`
- `glossary`
- `product-guides`

Do not add:

- `sanctions`

without an explicit later request.

---

### 7.4 Article content model

Each article should have a stable content contract with fields such as:

- `title`
- `description`
- `slug`
- `category`
- `tags`
- `publishedAt`
- `updatedAt`
- `author`
- `draft`

Optional computed fields may include:

- reading time
- related articles

---

### 7.5 Knowledge Base page types

Wave 2 should create:

- an index page for the Knowledge Base
- category listing pages
- article detail pages
- internal linking blocks between related content

If time permits, add:

- a featured-article surface on the Knowledge Base index
- a lightweight glossary index experience

---

### 7.6 SEO requirements for content pages

Each article page should support:

- route-owned metadata
- canonical URL
- Open Graph / Twitter metadata
- `Article` JSON-LD
- breadcrumb structured data if useful
- inclusion in sitemap
- clear internal links to related articles

Each article should also have intentional conversion surfaces such as:

- `Start your first case`
- `Open Guide`
- future relevant CTA blocks

---

### 7.7 Seed content expectation

Wave 2 should not ship an empty shell.

The expected first tranche is a small set of cornerstone pieces, for example:

- `What does an AML analyst do?`
- `Fraud analyst vs AML analyst`
- `How alert review works in RiskOps Lab`
- `What is transaction monitoring?`
- `Beginner fraud investigation checklist`
- `AML glossary for beginners`

Exact titles may change, but the first release should contain enough content to validate the structure.

---

### 7.8 Acceptance criteria

Wave 2 is complete when:

- `/knowledge-base` exists
- category and article routes exist
- content routes are indexable and included in sitemap
- article pages have metadata and structured data
- the first tranche of seed content exists
- public navigation or landing-page pathways can reach the Knowledge Base

---

### 7.9 Explicitly out of scope

Wave 2 does **not** include:

- newsletter capture
- waitlist capture
- `Resend` marketing campaigns
- `Sanctions` content cluster
- headless CMS rollout

---

## 8. Wave 3 — Product Email Infrastructure with Resend

### 8.1 Goal

Wave 3 introduces application-owned product emails through `Resend`.

This is for product notifications, not marketing.

Examples:

- `your case was reviewed`
- `new alerts available`
- `action required`

---

### 8.2 Hard provider rule

Wave 3 must preserve the provider split:

- `Supabase Auth` stays responsible for auth emails
- `Resend` becomes responsible for product emails

Do **not** migrate:

- signup confirmation
- password reset
- login / magic-link auth

to `Resend` as part of wave 3.

---

### 8.3 Current-state migration note

At the time this plan was written:

- repo inspection confirms Supabase Auth email flows
- repo inspection does not confirm an existing custom product-email sender

Therefore, wave 3 should assume:

- product-email infrastructure is mostly net-new work
- migration work applies only if non-auth emails are later discovered

---

### 8.4 In scope

#### A. Resend provider setup

- add `Resend` integration
- define required server env vars
- document sender/domain requirements

Recommended env set:

- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `EMAIL_REPLY_TO_ADDRESS`

Important:

- keep auth emails on `Supabase Auth`
- use `Resend` only for app-owned product notifications

#### B. Server-only email service layer

Create a centralized server-side email layer, for example under:

- `lib/email/**`
- `lib/notifications/**`

Responsibilities:

- provider client setup
- typed send helpers
- template selection
- payload shaping
- safe logging / error capture

Do not send product emails directly from client components.

#### C. Product notification templates

Initial notification templates should target real product events such as:

- `case_reviewed`
- `new_alerts_available`
- `alert_assigned`

The exact first set can be adjusted to fit real event anchors, but wave 3 must ship with at least one real reviewed-case notification and one real alert-availability notification path.

#### D. Trigger model

Emails must send from explicit server-side domain events after successful writes.

Do not trigger from:

- optimistic client-only actions
- page loads
- loose polling without event ownership

Good anchors include:

- review completion state changes
- assignment creation
- queue / availability state changes

#### E. Persistence and safety

Wave 3 should introduce durable email-delivery observability.

Preferred additions:

- `notification_preferences`
- `notification_deliveries`

Minimum desired fields for `notification_deliveries`:

- `id`
- `type`
- `recipient_app_user_id`
- `recipient_email`
- `provider`
- `provider_message_id`
- `status`
- `error_message`
- `payload`
- `created_at`
- `sent_at`

If scope needs to stay smaller, `notification_deliveries` is more important than `notification_preferences`.

#### F. Migration handling

If any existing non-auth email flows are found in the future:

- move only those product-owned flows to `Resend`
- leave auth flows on Supabase

---

### 8.5 Acceptance criteria

Wave 3 is complete when:

- `Resend` is integrated server-side
- auth emails still remain on Supabase
- at least one product-review notification path works
- at least one alert-related notification path works
- delivery attempts are observable
- failures are captured safely
- templates are centralized rather than inline

---

### 8.6 Explicitly out of scope

Wave 3 does **not** include:

- waitlist email capture
- newsletter tooling
- marketing campaigns
- replacing Supabase Auth

---

## 9. Invocation Contract For Future Work

When future implementation is requested, use these meanings:

### 9.1 `Do wave 1`

Implement only the work from section 6:

- SEO foundation
- GTM / GA4 / Ads readiness
- Silktide consent
- Search Console / Bing / IndexNow / Ahrefs support
- public funnel measurement

Do not add Knowledge Base or Resend unless explicitly requested.

---

### 9.2 `Do wave 2`

Implement only the work from section 7:

- `Knowledge Base`
- content architecture
- article template
- initial seed content

Do not introduce `Sanctions`, `Resend`, or newsletter capture unless explicitly requested.

---

### 9.3 `Do wave 3`

Implement only the work from section 8:

- `Resend`
- product email infrastructure
- product notification templates
- delivery observability

Keep auth emails on Supabase.

Do not turn wave 3 into marketing-email work unless explicitly requested.

---

## 10. Summary of What This Program Intentionally Avoids

This program intentionally avoids:

- `feat/...` branch names
- `Academy` branding
- `Sanctions` content in the initial rollout
- `Microsoft Clarity` in the current scope
- moving Supabase auth emails to Resend
- loading remarketing tags on protected product routes
- bundling all waves together without explicit instruction
