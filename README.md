# Big Wicks Fireworks

Website and customer-ordering project for Big Wicks Fireworks LLC in La Porte, Indiana.

## Current status

Milestones 1, 2A and 2B provide authentication, customer management and account
setup/reset. Milestone 3A establishes Sanity product content and a private
PostgreSQL pricing/catalog service. Milestone 3B provides CUSTOMER-only browsing
at `/portal`, with search, category filters and sorting. Milestone 3C adds ADMIN-only
pricing review, CSV export, validation/preview and confirmed transactional imports
at `/admin/pricing`. Milestone 4A adds website order requests: quantities, current
server review, duplicate-safe submission, immutable snapshots, staff notification
and read-only admin order visibility. Real catalog import remains deferred;
currency and the staff notification recipient still need confirmation. Milestone
5A.1 adds case-based catalog/order wording, optional brand/packing snapshots,
ranked configurable tiers and read-only-first BoxHero XLSX/CSV mapping.

## Stack

- Next.js 16.2.x App Router
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

The current contact form uses:

- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`
- `NEXT_PUBLIC_SITE_URL`

Database/authentication and development seed variables are listed in `.env.example`.
Follow [the authentication setup guide](docs/AUTH.md) before using `/login`, `/admin`
or `/portal`. No production database or real customer accounts are provisioned by
this repository change.

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
No remote catalog/database writes are performed. Milestone 3C adds `csv-parse@7.0.2`
for bounded, conventional CSV parsing. It adds no migrations or environment variables;
encrypted previews use the existing server-only `AUTH_SECRET` (at least 32 characters).

## Admin pricing workflow

Milestone 5A adds operator-only catalog onboarding: map the reviewed BoxHero source to
the internal canonical CSV, run `npm run catalog:prepare -- input.csv
data/onboarding/resolved.csv`, review, then dry-run `catalog:import` with explicit
Sanity project/dataset flags. Apply requires a reviewed hash and target confirmation;
production has additional safeguards. Preparation also generates the existing
admin-pricing CSV. Prices never go to Sanity or directly into SQL through these
tools. Real import, images and remote applies remain deferred. See the complete
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
