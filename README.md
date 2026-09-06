# Big Wicks Fireworks

Website and customer-ordering project for Big Wicks Fireworks LLC in La Porte, Indiana.

## Current status

Internal build work has started ahead of final client sign-off because the project is highly likely to proceed. The public marketing site already exists in a strong first-pass state. The immediate work is to refine the site architecture and prepare it for the selected customer-ordering option without prematurely building functionality the client has not finalized.

## Stack

- Next.js 16.2.x App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vercel hosting
- Resend for server-side email
- Auth.js, Prisma, and PostgreSQL form the Milestone 1 foundation shared by both ordering options

## Project documentation

Read these before substantial work:

- `AGENTS.md`
- `docs/PROJECT.md`
- `docs/BRAND.md`
- `docs/CONTENT.md`
- `docs/SEO.md`
- `docs/DECISIONS.md`
- `docs/AUTH.md` — authentication architecture, setup, fixtures and verification

Client-specific facts and scope live in `/docs`; do not rely on this README as the detailed source of truth.

## Development

```bash
npm install
npm run dev
npm run lint
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

## Security rule for ordering

If online ordering is selected, the browser must never be authoritative for customer identity, pricing tier, unit price, or order total. Those values must be derived and calculated server-side from the authenticated account and authoritative product data.
