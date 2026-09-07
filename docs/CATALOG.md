# Catalog content, private pricing and customer browsing

## Current status

The user confirms 302 real products and 17 categories in non-production Sanity
`sim96pgy` / `development`, with import verification returning 302 unchanged /
0 new / 0 updates / 0 errors. Preview Postgres has 280 Tier 2 ProductPrice rows;
22 Tier 2 prices remain unresolved/blank, and Tier 1 has 0 prices awaiting the
client source. All 302 products remain `available=false`; descriptions and images
are missing. No production catalog/pricing imports, real customer imports or real
invitations have occurred. See [onboarding status](ONBOARDING.md#current-status).

## Responsibility split

- **Sanity** owns non-secret product content: permanent catalogKey, editable SKU,
  name, category, optional brand/packing, description, image and manual wholesale visibility. Categories
  are reusable documents with editable names. There are no price fields.
- **PostgreSQL/Prisma** owns User/Customer identities, pricing tiers and authoritative
  tier-specific ProductPrice rows. Later orders must snapshot their own values.
- **Auth.js** authenticates sessions. The existing authorization helpers resolve
  current role, status, customer association and pricing tier from PostgreSQL.

Product content is deliberately separate from protected commercial data. A public
Sanity dataset is suitable because it contains no private data. Availability is
manual visibility, not inventory, stock reservation or a promise of availability.
Public site categories remain implementation context. The Milestone 3A foundation
task imported or invented no real products or categories; subsequent non-production
onboarding is recorded above.

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

## Configured tiers and case metadata (Milestone 5A.1)

PricingTier has a unique positive integer rank and human-readable name. All
configured valid rows, ordered by rank, populate customer selectors, pricing
columns and audit checks. The server verifies selected IDs against current SQL.
Tier 1 is cheapest; higher ranks describe progressively more expensive groups.
Per-product prices are independently supplied, never computed from another tier.
No Tier 3 is created by the migration or development seed; tests create one only
inside an isolated database and remove it afterward.

The new `20260907050000_case_catalog_tier_rank` migration assigns existing Tier 1/2
ranks 1/2 without changing their IDs or relationships. Any other existing tiers
receive deterministic ranks above 2. Review that ordering before a future remote
migration. Unique/positive database constraints prevent invalid rank configuration.
The migration also adds nullable OrderItem brand/packing snapshots; old order rows
retain their stored amounts and metadata remains null. Prior migrations are untouched.

Brand and packing are optional single-line strings, max 100 characters, projected
and explicitly normalized into the customer DTO. Missing/invalid values degrade
to null. Packing notation describes one complete case; no parsing/arithmetic is
performed. Cards and saved orders show metadata only when present. Item Number is
the customer SKU; immutable catalogKey remains identity. Unit Cost, BoxHero IDs,
inventory counts and private tier prices never enter Sanity content.

The CSV contract is `price:<rank>:<exact name>`. All current columns are required;
unknown/missing/duplicate columns fail. Tier renames/rank/ID changes invalidate
staged previews. Both ID and mutable tier metadata are bound in the server hash.
The sealed preview uses version 2, so outstanding old-format previews expire on
upgrade. Existing eight-column onboarding files need deliberate header conversion
and blank brand/packing fields with their existing keys preserved. See
`docs/ONBOARDING.md` for BoxHero mapping, safeguards and source review.

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
alone to reject excessive input scale. Prices are per complete case; currency
still needs confirmation. BoxHero Selling Price supplies rank 2 only.

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
route/action. Milestone 3B's CUSTOMER-only `/portal` calls it on the server; only
the authorized result reaches the catalog Client Component. Never serialize it
into public pages, metadata, shared caches or browser-selected queries.

## Milestone 3B: protected customer catalog

`app/(wholesale)/portal/page.tsx` replaces the placeholder at the same `/portal`
URL. Its separate route group permits a wider catalog without changing the narrow
login/admin forms. The page calls the existing customer helper for safe company/email
context; the catalog service independently authorizes its read. No auth rules change.
ADMIN still receives 404; anonymous, disabled and revoked sessions remain denied.
Generic metadata is noindex/nofollow and contains no customer or product prices.

`components/catalog/Catalog.tsx` receives only the existing authorized DTO. It renders
a responsive product grid with exact price text, SKU, category, name, optional
description and image. Search matches trimmed, case-insensitive name/SKU/category;
category options derive only from returned products. Native selects offer name A–Z,
name Z–A, price low–high and price high–low. Sorting compares canonical decimal
strings by integer length then digits, with deterministic name/key tie-breaking.
No floating-point money conversion, totals, per-card reads, fetch-on-search, local
storage, tier selector, catalog mutation or public pricing API is added.

Case meaning is confirmed: customers order complete cases. Currency remains unconfirmed. Display the exact supplied
two-decimal amount under “Case price”, without an assumed USD/$ currency symbol.
Confirm those semantics before customer release. No discounts, stock counts or
availability guarantees are implied.

The grid uses one through five columns, constrained desktop width, wrapping long
names/SKUs, and three-line descriptions. Native labeled controls, visible keyboard
focus, live result counts, semantic headings and 44px+ controls support accessibility.
Missing category becomes “Uncategorized”; missing description adds no invented copy.
Zero available products and zero filter matches have distinct messages. Service
failure shows its existing generic message with a full server reload link. Catalog
navigation also reloads from the server; local filter/sort changes only use the
already-delivered snapshot. The account disclosure shows the current login email;
`/account` remains the existing role dispatcher, so it is not mislabeled as a profile
page. Existing POST sign-out is reused; no ADMIN links are added for customers.

`ProductImage.tsx` uses Next Image with a component-scoped Sanity CDN loader,
responsive sizes, lazy loading, a fixed 4:3 container and object-contain. It accepts
only HTTPS cdn.sanity.io/images/ URLs, bounds transforms to 960×720 with fit=max,
and requests auto=format. It uses the existing normalized URL without another SDK
or content query. No remotePatterns/global loader changes or arbitrary remote hosts
are needed. Missing/failed images share a neutral labeled placeholder. Image content
is non-secret; its CDN caching contains no prices. Transformation parameters follow
[Sanity's image documentation](https://www.sanity.io/docs/apis-and-sdks/image-urls).

No dependencies, application environment variables, schema changes or migrations
are added by 3B. Node 24, the standard Next production build and dynamic request-time
authorization remain compatible with the existing Vercel configuration.

Automated browser verification runs in two isolated passes: unconfigured Sanity
(including Studio fallback), then fictional `testonly/test` content. The second
uses a Node preload transport interceptor under `tests/`, with a temporary local
JSON fixture. It never adds an application mock switch or endpoint; Sanity requests
are intercepted before transport and unexpected Sanity hosts fail. Browser image
requests are intercepted as well. SQL fixtures exist only in the newly created
local test cluster. Tests cover both tiers, immediate tier changes, forged query/
POST/login context, HTML/RSC leakage, omitted products, failure/retry, 200 products,
keyboard controls and responsive screenshots. They never use the live preview data.

## Milestone 3C: admin pricing operations

`/admin/pricing` joins published Sanity content with all private PostgreSQL prices
on the server. It shows completeness counts, existing audit issues and a product
pricing table. Completeness and per-tier missing-price counts apply only to
available products; hidden products do not need full pricing. Orphaned SQL rows
are reported but never exported, matched or silently deleted. Content remains in
Sanity; ProductPrice remains keyed by catalogKey and pricingTierId.

Internal ADMIN navigation includes Customers, Pricing, Catalog Studio, Public
website and POST Sign out. The pricing page, export handler, both Server Actions
and every service operation independently call `requireAdmin()`. Anonymous,
inactive and revoked sessions are redirected to login; CUSTOMER receives 404.
The additional admin layout authorization is defense in depth. Public navigation,
the `/account` dispatcher and customer catalog behavior remain unchanged.

### Staff workflow and CSV contract

1. Open **Pricing** and review completeness/audit issues.
2. Download the current export from `/admin/pricing/export`.
3. Edit only the configured price columns in Excel or another spreadsheet application.
4. Save as comma-separated CSV UTF-8 and upload for validation/preview.
5. Review per-tier create/update/remove/unchanged counts, warnings and exact
   before/after values. Resolve any errors; an invalid upload cannot be confirmed.
6. Acknowledge removals when applicable and explicitly confirm the import.
7. Customers refresh `/portal` to read their current tier price without logging in again.

All five context headers plus every current tier column are required; order may vary. Example:

```csv
catalogKey,sku,productName,category,available,price:1:Tier 1,price:2:Tier 2
```

Export includes valid published products whether visible or hidden, exact decimal
prices or empty missing-price cells, and `true`/`false` manual availability. It uses
UTF-8 with BOM, CRLF and conventional double-quote escaping, including multiline
content. Formula-like human text (including leading whitespace, =/+/−/@ and their
full-width forms, tab/newline or apostrophe) gets a leading apostrophe. Price and
UUID fields are unaffected. This neutralization may be visible in spreadsheet
software; preserve those context columns on reimport. The parser accepts both
the original and escaped SKU/name for mismatch comparisons.

catalogKey is the only import identity: it must be a valid product UUID and exist
unambiguously in current Sanity content. Duplicate upload keys, including case
aliases, are rejected. UUID case/outer whitespace is normalized for lookup.
SKU/name mismatches are warnings, never alternate identity matches. Category and
availability are informational and ignored on import; no CSV content edit writes
Sanity. Hidden products may retain prices, with a warning when pricing is supplied.

Each tier is independent. Reuse `priceText()` for nonnegative decimal text within
NUMERIC(12,2), maximum `9999999999.99`, at most two decimal places. No JavaScript
Number conversion, currency symbols, grouping commas, negatives, exponent notation,
NaN or Infinity. Outer price whitespace is trimmed; blank/whitespace means no price
for that tier. It removes an existing row only after explicit removal acknowledgment.
Blank never means `0.00`; explicit zero is valid. Products omitted from the CSV stay
unchanged. No automatic tier calculation. Prices are per complete case; packing is descriptive only.

Files must be nonempty, at most **256 KiB**, **500 product rows**, and **4,096
characters per record**. Empty lines are skipped. Extra/missing/duplicate headers,
unequal field counts, malformed quoting, NUL and invalid UTF-8 are rejected.
`csv-parse@7.0.2` supplies bounded in-memory sync parsing rather than custom CSV
tokenization. No raw upload is logged, written to disk, stored in SQL or exposed
through a URL. The admin pricing upload remains CSV-only; XLSX is read only by the operator BoxHero mapper.

### Preview integrity and writes

Validation creates a ten-minute AES-256-GCM encrypted/authenticated envelope with
a random 96-bit nonce. It contains only normalized catalogKey/tier amounts, the
admin ID/session revocation version, expiry and a SHA-256 snapshot fingerprint.
A domain-separated key derives from the existing server-only `AUTH_SECRET` (at
least 32 characters); rotating it invalidates outstanding previews. The browser
receives the intended ADMIN preview plus this sealed token, never the secret.
No new environment variables, staging table, Redis or object storage is required.
The confirmation endpoint ignores browser-supplied prices, tier IDs and prior
action state. It opens only an authentic, unexpired, correctly bound token.

Confirmation reauthorizes, reads current published Sanity content, then opens a
serializable PostgreSQL transaction. It locks the admin User row for share and
rechecks active ADMIN, no Customer association and the current session version.
It rereads all tier/price rows, checks expiry again and recomputes the snapshot.
The fingerprint covers document IDs/catalogKeys, normalized SKU/name/category/
visibility, all tier identities/names/ranks and all SQL prices/updatedAt versions.
Description/image edits do not invalidate it. Unrelated price changes conservatively
invalidate the whole preview; staff must upload again instead of overwriting them.

Invalid/duplicate catalog identities or required content, invalid SQL prices and
missing/invalid tier configuration block export, preview and confirmation. Optional content
warnings and orphaned SQL prices remain visible without inventing matches. A Sanity
failure blocks all operations with a fixed safe message; export returns 503 without
fabricated rows. The read-only `catalog:audit` evaluates all configured tiers ordered by rank.

After drift validation, the server recalculates changes. An explicit blank-removal
acknowledgment is enforced server-side. One bulk delete and one parameterized bulk
upsert run in the same transaction; any failure rolls everything back. Unchanged
rows keep their timestamps. PricingTier, Customer and Sanity are never modified.
Transaction conflicts require a new upload; there is no automatic overwrite/retry.
A successful write makes the old token stale. Replaying a no-op preview within its
expiry is harmless and writes nothing; no long-lived used-token store is added.

Sanity and PostgreSQL cannot participate in a shared atomic transaction. A content
change after the final Sanity read can take effect during SQL commit. Immutable
catalogKey, fail-closed customer reads and the audit constrain that cross-system
window; this workflow does not claim distributed locking. Already-delivered
browser previews/prices cannot be recalled after account revocation, but subsequent
protected requests and confirmation are denied.

Pricing routes are dynamically rendered, metadata is generic/noindex and no prices
enter public pages, metadata or public diagnostics. CSV responses use
`private, no-store, max-age=0`, attachment disposition, noindex and nosniff. Pricing
modules are server-only. Successful confirmation revalidates the admin pricing and
customer portal paths; existing uncached customer reads resolve current prices.

Direct per-product editing and orphan repair remain deferred. This milestone adds
no quantities, cart, ordering/Excel customer order generation, totals, inventory,
payments, invoices, announcements, real customer/product imports or deployment.

## Milestone 4A: catalog quantities and order requests

The existing CUSTOMER catalog DTO, search/filter/sort and price ownership remain
unchanged. Quantity state lives only in the client catalog component and persists
across filters. Review sends only catalogKey/quantity pairs. A separate server-only
ordering service independently authorizes, reads current Sanity and current SQL
customer/tier/prices, and returns a protected review. Final submission repeats the
authoritative reads and refuses stale or unavailable selections. Price changes
require refreshed review instead of silently submitting different amounts.

Submitted OrderItems snapshot catalogKey/SKU/name/quantity/exact prices and totals;
historical order views never read Sanity or current ProductPrice. Customer/tier
context is also snapshotted. This is intentionally historical order evidence,
not a duplicate mutable product CMS. Catalog availability remains a manual switch;
submitting never changes Sanity, ProductPrice or stock. Admin price imports still
apply only to future reads/reviews, never to saved order snapshots.

Milestone 4A supersedes the earlier deferral of managed website ordering. Excel
ordering, inventory, payment and customer history/editing remain deferred.
For current import status, see [onboarding](ONBOARDING.md#current-status).
See `docs/ORDERING.md` for quantities, exact totals, review integrity,
duplicate prevention, notifications, admin visibility, setup and verification.

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

## Onboarding tooling and client mapping

Milestone 5A implements CLI-only canonical CSV preparation, dry-run planning and
explicit Sanity content apply. Preparation assigns missing permanent UUIDs once
and generates the existing admin-pricing CSV; apply never generates catalogKeys
or writes ProductPrice. Products match only catalogKey, normalized category names
must be unambiguous, existing images/omitted products are preserved, and production
is guarded by default. See `docs/ONBOARDING.md` for the content and dynamic-tier contract,
two-transaction category/product strategy, revision checks, concurrency limits and
isolated verification. Real non-production catalog/pricing imports have since
been completed as recorded in [current status](#current-status).

The BoxHero source is now confirmed; the following earlier logical import sketch is superseded by `docs/ONBOARDING.md`. Mapping reconciles
records resembling the following logical shape, after actual client columns and
currency/unit meaning are confirmed:

```text
catalogKey       permanent UUID; allocate once and preserve in the mapping
sku, name        editable business content
category         resolve/create an approved Category reference
description      optional plain text
image            authorized source asset + optional accurate alt text
available        explicit manual visibility boolean
price:1:Tier 1  separate per-product source -> PostgreSQL Tier 1 row only
price:2:Tier 2  BoxHero Selling Price -> PostgreSQL Tier 2 case-price row only
```

Split content and prices before writing either system. Do not send a combined
source record containing private prices to Sanity, logs or public asset storage.
Do not use SKU/name as the upsert identity once catalogKey exists. Run the audit
after each authorized import. The current fictional fixtures exist only under
`tests/`; neither the development seed nor automated tests populate a real dataset.

The user reports Milestone 3A merged and manually verified with three fictional
published preview products and six price rows; audit issues were empty. This is
user-reported context, not a new remote verification performed during 3B.

Deferred: production catalog/pricing imports, real customer imports/invitations,
direct per-product price editing and orphan repair,
currency confirmation, Excel ordering, inventory integration,
payments, order history, announcements, and deployment. No remote records,
environment variables or Sanity settings were changed during the 3B/3C implementation tasks. The 3C CSV
workflow maintains prices for existing Sanity products; it is not a content import.

## Verification and dependency review

Milestone 3C verification on 2026-09-06: clean `npm ci`, Prisma generation, lint,
typecheck, `npm test` (130 unit tests) and `npm run test:integration` passed.
The isolated run passed 207 combined tests (130 unit + 77 database) and all four
existing migrations on a fresh local PostgreSQL cluster. Playwright passed 15
scenarios against the unconfigured build and nine against intercepted fictional
Sanity content (24 total); the latter nine intentionally skip in the first pass.
Coverage includes direct unauthorized export/actions, disabled/revoked access,
CSV validation/escaping/formulas, preview-only zero writes, forged fields,
tamper/expiry/session binding, stale identity/tier/price changes, concurrent
confirmation, rollback after a failed upsert, exact independent tiers, customer
refresh, safe provider failure and a complete 200-product bulk import.

Dashboard, import/confirmation and table screenshots were inspected at 390, 768
and 1440px. Tables scroll within their labeled region; the page has no horizontal
overflow. The final diff was reviewed for scope and `git diff --check` passed.
The final `npm run build` also passed with the existing local configuration,
restoring `.next` after the fictional test build; pricing routes remain dynamic.
The local cluster stopped cleanly. Tests performed no remote database/content
writes, real uploads or deployment. The only dependency addition is the pinned
CSV parser; existing dependency-audit findings below still require release review.

Milestone 3B verification on 2026-09-06: Prisma generation, lint, typecheck,
`npm test` (99 unit tests), `npm run test:integration` (151 combined unit/database
tests: 99 unit + 52 database), and `npm run build` passed. All four existing
migrations applied successfully to a fresh isolated PostgreSQL database. Browser
verification passed 13 existing scenarios in the unconfigured build and all six
new catalog scenarios in the configured mock build (19 total). The six catalog
scenarios are intentionally skipped in the first pass and executed in the second.
The isolated cluster stopped cleanly. No migrations or dependencies changed, so
the existing clean Node 24 installation was reused.

Screenshots at 390, 768, 1440 and 1920px, individual cards and long-content cases
were inspected; the 200-product test verified controls and absence of horizontal
overflow. The final diff was reviewed, `git diff --check` passed, and auth/service,
Prisma migrations, package files and global image configuration stayed unchanged.
The standard production build also passed with the existing local configuration;
no deployment or remote-data verification/write was performed.

The test runner leaves `.next` built with fictional Sanity identifiers. Run
`npm run build` again before a manual `npm start` using your local configuration
(done after this milestone's checks); `npm run dev` uses development configuration.
Plain POST requests without an action identifier are rendered by Next.js and
still receive only session-authorized data. Next's router can echo query values
supplied by the caller; tests distinguish that request context from authoritative
associations, which are absent from normal catalog HTML/RSC. Forged query/form
context never selects prices or changes authorization.

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
