# Big Wicks Fireworks

Website and customer-ordering project for Big Wicks Fireworks LLC in La Porte, Indiana.

## Current status

Milestones 1, 2A and 2B provide authentication, customer management and account
setup/reset. Milestone 3A establishes Sanity product content and a private
PostgreSQL pricing/catalog service. Milestone 3B provides CUSTOMER-only browsing
at `/portal`, with search, category filters and sorting. Ordering, price management
and real catalog import remain deferred; currency/unit meaning still needs confirmation.

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

The likely managed-ordering flow is intentionally **not ecommerce checkout**:

```text
Approved customer
  -> login
  -> protected catalog with assigned pricing
  -> enter quantities
  -> submit order request
  -> Big Wicks receives the order
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
No remote catalog/database writes are performed. Milestone 3B adds no dependencies
or application environment variables.

## Security rule for ordering

If online ordering is selected, the browser must never be authoritative for customer identity, pricing tier, unit price, or order total. Those values must be derived and calculated server-side from the authenticated account and authoritative product data.
