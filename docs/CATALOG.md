# Catalog content and private pricing — Milestone 3A

## Responsibility split

- **Sanity** owns non-secret product content: permanent catalogKey, editable SKU,
  name, category, description, image and manual wholesale visibility. Categories
  are reusable documents with editable names. There are no price fields.
- **PostgreSQL/Prisma** owns User/Customer identities, pricing tiers and authoritative
  tier-specific ProductPrice rows. Later orders must snapshot their own values.
- **Auth.js** authenticates sessions. The existing authorization helpers resolve
  current role, status, customer association and pricing tier from PostgreSQL.

Product content is deliberately separate from protected commercial data. A public
Sanity dataset is suitable because it contains no private data. Availability is
manual visibility, not inventory, stock reservation or a promise of availability.
Public site categories remain implementation context; no real products or categories
have been imported or invented by this milestone.

## Studio and configuration

The repository embeds Sanity Studio at `/studio/[[...tool]]` using `next-sanity`.
This keeps the requested editing route in the existing application for this small
catalog. The tradeoff is a larger dependency/build footprint and Studio upgrades
requiring an application rebuild. A standalone Studio can be considered separately
if those costs become significant.

The page independently calls `requireAdmin()`. Staff also need their own Sanity
account with appropriate project/dataset permissions; an Auth.js ADMIN session
does not grant a Sanity role. Studio mutations go through Sanity's authorization,
not a shared write token. No `/admin/products` CMS or public pricing endpoint exists.

Configuration uses two non-secret variables in `.env.example`:

```text
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
```

Leave them empty when no project is configured. `/studio` then shows a clear notice
to authorized staff; lint, typecheck, tests and production builds still work.
Once an existing project/public dataset is authorized for use, set these variables,
configure the exact Studio origin in Sanity's credential-enabled CORS settings,
and assign staff access in Sanity. Rebuild when public environment values change.
No project, dataset, CORS setting or real content is created automatically.

The published-content reader needs no `SANITY_API_READ_TOKEN`. No private dataset
or preview token is configured. A future private-dataset choice would require an
explicit server-only reader token; never put one in Studio/client props or a
`NEXT_PUBLIC_` variable. Prices must stay out of Sanity regardless of that choice.

Pinned compatible packages: sanity 6.12.0, next-sanity 13.3.4, @sanity/client 8.5.0,
@sanity/icons 5.2.1, styled-components 6.5.3. Node 24, Next.js 16.2.9 and React 19.2.4
remain unchanged. The content API version is pinned to 2026-09-06.

Implementation references: [Sanity's embedded Studio guide](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs),
[validation](https://www.sanity.io/docs/studio/validation), and
[client query perspectives](https://www.sanity.io/docs/apis-and-sdks/js-client-querying).
The installed Next.js 16 guides for layouts, dynamic imports and fetch caching
were inspected before implementation.

## Permanent identity and validation

Every new Studio product receives a cryptographically generated UUIDv4 catalogKey
once, independently of its name, SKU, category and Sanity-generated document `_id`.
The canonical representation is lowercase UUID text. The field is always read-only
in Studio. Initial visibility is false. The standard product Duplicate action is
disabled because it would copy the key; use New product to create a distinct identity.

Studio validation requires a valid key, checks uniqueness against other documents
(including drafts), and rejects changing the key of a published product. Its own
draft and published document count as one identity. SKU and name remain editable.
Do not delete/recreate a product to change its details, or copy an existing key to
a new document. Imports/repairs must preserve keys deliberately and run the audit.

Sanity validation/readOnly are editor guardrails, not database uniqueness constraints
or protection against privileged API writers. Concurrent/out-of-band content writes
can bypass them. The server rejects ambiguous keys instead of choosing a document;
the audit detects drift. PostgreSQL cannot enforce a foreign key into Sanity.
Drafts/releases are not served; this milestone supports normal published content,
not draft previews or a release workflow.

## PostgreSQL prices

`20260906030000_product_prices` adds only ProductPrice and its relation to PricingTier.
All earlier migrations remain unchanged. Fields:

- catalogKey: PostgreSQL UUID matching Sanity's permanent key.
- pricingTierId: authoritative FK to PricingTier, deletion restricted.
- price: NUMERIC(12,2), plus createdAt/updatedAt.
- Composite primary key on catalogKey + pricingTierId; tier lookup index.

A PostgreSQL CHECK constraint rejects negative amounts and numeric NaN. The column's
precision rejects out-of-range/infinite values. Zero is allowed; a future business
rule can reject it if confirmed. The supported range is 0.00–9999999999.99. No SKU,
name, description or other product content is duplicated in PostgreSQL.

Prisma Decimal is used for values/calculations; the protected result contains exact
two-decimal strings, never JavaScript floating-point amounts. The server rejects
non-finite, negative, excessive or over-scale values and does not derive one tier
from another. Future import/write tools must validate decimal text before saving:
PostgreSQL NUMERIC(12,2) rounds extra fractional digits, so do not rely on the column
alone to reject excessive input scale. Currency, unit/case/pack meaning and source
columns must be confirmed with the real catalog; none are invented here.

## Protected catalog service

`lib/catalog/service.ts` exports `getAvailableCatalogForCustomer()` with **no inputs**.
Each call independently invokes `requireCustomer()` and uses the current customer
pricingTierId from PostgreSQL. ADMIN is not implicitly a customer. Anonymous,
disabled and revoked callers retain the established redirect/denial behavior.

The service reads an explicit projection of published Sanity product content,
normalizes/validates it, and joins PostgreSQL rows for only the eligible keys and
the caller's tier. All published products, including unavailable ones, are read
at this small scale so a duplicate unavailable document cannot silently claim the
same pricing identity. Only available, unambiguous products with valid prices are
returned. DTO fields are catalogKey, SKU, name, category, description, image and
that customer's decimal price. No user/customer IDs, tier IDs, other-tier prices,
raw database records or arbitrary Sanity fields are returned.

Content/API/database failures return `{status: "unavailable", products: [], message}`
with a fixed safe message. Successful empty catalogs return `status: "ready"` and
an empty array. Auth denial happens outside the content-error handler. Nothing
falls back to guessed prices or stale data, and exceptions/secrets are not logged.

All catalog/pricing/audit modules are `server-only`. The service has no public
route/action and is not yet wired into customer pages. A future protected UI must
call this service and preserve these boundaries; do not serialize it into public
pages, metadata, caches or browser-selected queries.

## Freshness and data failures

Reads use the Sanity origin API (`useCdn: false`), `perspective: "published"`, no
stega and `cache: "no-store"`. No application memoization, cross-user cache, Live
Content browser token, webhook or stale fallback is added. PostgreSQL is read on
every call. Published visibility, price and customer-tier changes apply on the
next read without a new login. Already-delivered browser data cannot be recalled;
future ordering must revalidate authoritative data when submitting.

| Situation | Customer service | Audit |
| --- | --- | --- |
| Unavailable or draft/release product | Exclude | No missing-price requirement for unavailable products |
| Missing/invalid key | Exclude | Report document ID |
| Duplicate key, including uppercase UUID alias | Exclude all candidates | Report ambiguity/invalid key |
| Missing/malformed SKU/name/availability | Exclude | Report invalid required content |
| Missing/invalid current-tier price | Exclude | Report missing valid tier price |
| Orphaned price | Never returned | Report key/tier |
| Unsupported/missing pricing tier | Fail safely for affected customer | Report tier/configuration issue |
| Missing category/description/image | Return null for missing content | Report content warning |
| Missing image alt | Use product name | No invented image description |

Only HTTPS Sanity image CDN URLs are returned; unexpected external URLs become null.
The service enforces lowercase keys and checks UUID collisions case-insensitively,
matching PostgreSQL UUID comparison. Pricing is never read from Sanity fields.

## Consistency audit

```bash
npm run catalog:audit
```

This read-only operator command loads `.env.local`, then `.env`, without overriding
already-set environment values. It reads published content, all pricing rows and
tiers, and reports counts plus issue codes/document IDs/catalog keys/tier IDs.
It never prints prices, customer records, credentials or provider exception bodies.
It performs no repairs or content writes and is not exposed as a web endpoint.

Exit codes: 0 = no issues; 1 = drift or optional-content warnings; 2 = audit failed
to complete. A failed Sanity read must not be interpreted as every price being an
orphan. Run before/after future imports and after content identity repairs. Sanity
and PostgreSQL are separate snapshots, so rerun if a concurrent edit caused a
transient issue; this is a practical audit, not a distributed transaction.

## Future import contract and scope

No real catalog/source format has been supplied. A future import should reconcile
records resembling the following logical shape, after actual client columns and
currency/unit meaning are confirmed:

```text
catalogKey       permanent UUID; allocate once and preserve in the mapping
sku, name        editable business content
category         resolve/create an approved Category reference
description      optional plain text
image            authorized source asset + optional accurate alt text
available        explicit manual visibility boolean
tier1Price       validated decimal text -> PostgreSQL Tier 1 row only
tier2Price       validated decimal text -> PostgreSQL Tier 2 row only
```

Split content and prices before writing either system. Do not send a combined
source record containing private prices to Sanity, logs or public asset storage.
Do not use SKU/name as the upsert identity once catalogKey exists. Run the audit
after each authorized import. The current fictional fixtures exist only under
`tests/`; neither the development seed nor automated tests populate a real dataset.

Deferred: real Sanity project/dataset/CORS/staff setup and live editor validation,
real product import, pricing write UI/import tools, final customer catalog UI,
ordering/Excel, inventory, payments, announcements, and deployment.

## Verification and dependency review

Milestone 3A checks on 2026-09-06: clean `npm ci`, Prisma generation, all four
migrations on a fresh isolated database, lint, typecheck, 85 unit tests, 52 database
integration tests (137 combined), 13 Playwright scenarios and production build
passed. The audit's unconfigured error path returned its documented exit code 2.
Studio fallback layouts were inspected at 390px, 768px and 1440px. Existing
migrations were verified unchanged and the final diff was reviewed for scope.

Tests mock the Sanity transport/content boundary and use isolated PostgreSQL. The
integration runner explicitly clears both Sanity identifiers before build/browser
tests and continues intercepting Resend. No real Sanity calls or emails are needed.
Studio schema/identity validation runs against mocked clients; browser tests cover
the protected unconfigured Studio and absence of private prices from public HTML,
RSC and metadata. A configured remote Studio/editor session remains unverified.

Studio configuration and styles load only when Studio mounts. The explicit CSS
layer order keeps Sanity's global reset below site utilities so spacing survives
Studio navigation; the fallback's spacing is covered by a browser regression check.

On Windows the test runner uses pg_ctl fast shutdown for its own newly-created
cluster. This avoids orphaned PostgreSQL 18 I/O workers left by the dependency's
force-kill shutdown, which can otherwise hold node_modules files open during a
clean install. It never stops a user/preview/production database.

The dependency audit on 2026-09-06 reports 15 findings (6 moderate, 9 high), including
existing Next.js/Prisma tooling findings and Sanity CLI/transitive findings. The
current compatible Sanity packages were installed without forced peer resolution.
No blanket audit fix, framework upgrade or suggested major downgrade was applied.
Review and resolve applicable advisories before production release.
