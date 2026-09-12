# Big Wicks Fireworks

Website and customer-ordering project for Big Wicks Fireworks LLC in La Porte, Indiana.

## Current status

Milestone 8A / PR #24 is merged. Milestone 8B expands the public search surface
with `/fireworks-near-new-buffalo-mi` and `/wholesale`, preserves the approved
homepage/contact design, and keeps operational wholesale data private.
See [SEO architecture and manual launch checklist](docs/SEO.md) and
[8B verification](docs/SEO-8B-VERIFICATION.md). No merge or deployment is included.
Earlier milestone summaries below retain their original scope.

Milestones through **7B / PR #20** are merged. Milestone 7A records the
[production readiness audit](docs/PRODUCTION-READINESS.md) and the authoritative
[launch/rollback runbook](docs/LAUNCH-RUNBOOK.md). Milestone 7B closes CODE-01:
explicit homepage canonical, root/contact-only sitemap and robots reference, using
`NEXT_PUBLIC_SITE_URL`. Focused tests and isolated production build/render checks
pass. Verdict: **A. CODE READY — BLOCKED ON CLIENT/PRODUCTION CONFIG**. Production
bootstrap/configuration, client data and live verification remain open; this is
not public-launch approval. Milestone 7C completes OPS-01 tooling and disposable
rehearsal with a separate guarded `npm run db:bootstrap`: read-only plan by default,
explicit reviewed apply and hidden ADMIN password. It creates only two tiers and
one ADMIN; the development seed is unchanged. Production execution remains a
separate live gate. No live launch operation was performed in 7A, 7B or 7C.

Milestones 1, 2A and 2B provide authentication, customer management and account
setup/reset. Milestone 3A establishes Sanity product content and a private
PostgreSQL pricing/catalog service. Milestone 3B provides CUSTOMER-only browsing
at `/portal`, with search, category filters and sorting. Milestone 3C adds ADMIN-only
pricing review, CSV export, validation/preview and confirmed transactional imports
at `/admin/pricing`. Milestone 4A adds website order requests: quantities, current
server review, duplicate-safe submission, immutable snapshots, staff notification
and read-only admin order visibility. Currency and the staff notification recipient
still need confirmation. Milestone
5A.1 adds case-based catalog/order wording, optional brand/packing snapshots,
ranked configurable tiers and read-only-first BoxHero XLSX/CSV mapping.
Milestones through 5A.2 are merged per user. Milestone 5B adds ADMIN-only,
create-only customer CSV import at `/admin/customers/import` and separately
reviewed setup invitations at `/admin/customers/invitations`. Imports create no
passwords and send no email. See the [customer onboarding workflow](docs/ONBOARDING.md#customer-onboarding--milestone-5b).

Milestone 5B and the Milestone 6A security audit are merged. Milestone 6B updates
Next.js and its ESLint configuration to 16.3.4 for framework security remediation.
See the [dated remediation record](docs/SECURITY-REMEDIATION.md) for resolved
dependencies, verification and remaining release gates. The
[original audit](docs/SECURITY-AUDIT.md) remains a historical baseline.

Real catalog onboarding is complete in **non-production only**, as confirmed by
the user: Sanity `sim96pgy` / `development` contains 302 products and 17 categories;
import verification returned 302 unchanged / 0 new / 0 updates / 0 errors.
Preview Postgres contains 280 Tier 2 ProductPrice rows, with 22 Tier 2 prices
unresolved/blank. Tier 1 has 0 prices pending the client source. All 302 products
remain `available=false`; descriptions and images are missing. No production
Sanity catalog or Postgres pricing import, real customer import, or real customer
invitations have occurred. See [current onboarding status](docs/ONBOARDING.md#current-status).

## Stack

- Next.js 16.3.4 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vercel hosting
- Resend for server-side email
- Auth.js, Prisma, and PostgreSQL form the Milestone 1 foundation shared by both ordering options
- Sanity Studio for non-secret catalog content; private prices stay in PostgreSQL

## Project documentation

Read these before substantial work:

- `AGENTS.md`
- `docs/PROJECT.md`
- `docs/BRAND.md`
- `docs/CONTENT.md`
- `docs/SEO.md`
- `docs/DECISIONS.md`
- `docs/AUTH.md` — authentication architecture, setup, fixtures and verification
- `docs/CATALOG.md` — Sanity setup, permanent product identity, private pricing and audit
- `docs/ORDERING.md` — order snapshots, review/submission security, notifications and local setup

Client-specific facts and scope live in `/docs`; do not rely on this README as the detailed source of truth.

## Development

```bash
npm ci
npm run db:generate
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Current product direction

The project combines two distinct jobs:

1. A public retail marketing site that helps local shoppers discover Big Wicks, understand the selection, and visit/contact the store.
2. A private customer portal for approved business/wholesale customers if the client selects that option.

The authorized Milestone 4A managed-ordering flow is:

```text
Approved customer
  -> login
  -> protected catalog with assigned pricing
  -> enter quantities and review current server values
  -> submit order request
  -> order is saved and staff notification is attempted
  -> salesperson confirms availability/substitutions/final total offline
```

No online payment, live inventory synchronization, BoxHero/IMS integration, customer-facing invoice engine, or full ecommerce checkout should be introduced unless the user explicitly expands scope.

## Environment variables

Use the authoritative [environment inventory](docs/PRODUCTION-READINESS.md#5-authoritative-environmentconfiguration-inventory)
and safe development placeholders in `.env.example`. Contact now requires SQL and
AUTH_SECRET for its shared abuse limiter as well as its mail configuration;
NEXT_PUBLIC_SITE_URL supplies metadata, not contact routing. Preview has no
application-level mail recipient sandbox; keep its mail key absent by default.
Follow [the authentication setup guide](docs/AUTH.md) before using `/login`, `/admin`
or `/portal`. No production database or real customer accounts are provisioned by
this repository change.

Initial tier/ADMIN provisioning now has a separate operator tool; use the exact
[guarded bootstrap procedure](docs/LAUNCH-RUNBOOK.md#guarded-first-admintier-bootstrap--milestone-7c).
It reads only process-injected DATABASE_URL, requires no AUTH_SECRET/mail secrets
and never runs automatically during build/migrate/deploy. Do not use the development
seed for Production. `node tests/bootstrap/run.mjs` performs disposable local
rehearsal and lint/typecheck without reading private environment files.

Sanity uses `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` for a
public content-only dataset. Both can remain empty for local checks; `/studio`
shows an admin-only configuration notice. Staff need both application ADMIN and
Sanity project permissions. No Sanity read token or remote project is required
for automated tests/builds. See [catalog setup and rules](docs/CATALOG.md).

`npm run catalog:audit` reads configured Sanity/PostgreSQL data and reports drift
without writes or price amounts. Run it only against the intended environment.
`npm run test:integration` applies all migrations to a fresh isolated PostgreSQL
database, mocks catalog content, builds production and runs browser checks both
without Sanity configuration and with locally intercepted fictional content.
These automated checks perform no remote catalog/database writes. Milestone 3C adds `csv-parse@7.0.2`
for bounded, conventional CSV parsing. It adds no migrations or environment variables;
encrypted previews use the existing server-only `AUTH_SECRET` (at least 32 characters).

## Admin pricing workflow

Milestone 5A adds operator-only catalog onboarding: map the reviewed BoxHero source to
the internal canonical CSV, run `npm run catalog:prepare -- input.csv
data/onboarding/resolved.csv`, review, then dry-run `catalog:import` with explicit
Sanity project/dataset flags. Apply requires a reviewed hash and target confirmation;
production has additional safeguards. Preparation also generates the existing
admin-pricing CSV. Prices never go to Sanity or directly into SQL through these
tools. Non-production catalog and Tier 2 pricing imports are complete; production
imports, unresolved pricing, descriptions and images remain pending. See the complete
[onboarding workflow and safeguards](docs/ONBOARDING.md).

Sign in as ADMIN and choose **Pricing**. Download the current pricing CSV, edit only
the `price:<rank>:<name>` columns, and save as comma-separated CSV UTF-8. Upload to see
validation errors, warnings and exact before/after values. Review, acknowledge any
removals, then explicitly confirm. A preview alone never changes prices.

`catalogKey` is the permanent product identity; SKU/name are informational. Blank
price cells remove an existing tier price, never mean zero; omitted products stay
unchanged. Tiers are independent. Files are limited to 256 KiB, 500 product rows
and 4,096 characters per record. Previews expire after ten minutes and must be
recreated if catalog/tier/pricing data changes. Customers see updated prices on
their next `/portal` refresh without signing in again. See [the full CSV contract,
authorization and concurrency rules](docs/CATALOG.md#milestone-3c-admin-pricing-operations).

## Security rule for ordering

The browser submits only catalogKey/quantity pairs for review and an opaque server
review token for final submission. Current customer, tier and exact prices are
resolved server-side again; changed values require renewed review. The database
uniquely constrains each customer/submission ID. No customer order-history list,
payment, inventory reservation or submitted-order editing is added.

Milestone 4A adds the `20260906040000_submitted_orders` migration. Apply it only to
an intended local database with `npm run db:deploy`; builds never apply migrations.
Set server-only `ORDER_TO_EMAIL` to the confirmed staff inbox before release.
Notifications reuse `ACCOUNT_FROM_EMAIL` and `RESEND_API_KEY`. A saved order remains
valid if email fails; `/admin/orders` exposes notification state for staff follow-up.
See [ordering operations and limitations](docs/ORDERING.md). No new dependencies.
