# Big Wicks Fireworks — Project Decisions Log

> `PROJECT.md`, `BRAND.md`, `CONTENT.md`, and `SEO.md` describe the current working state. This file records how the project got there and prevents older directions from resurfacing accidentally.

## Current priority

**Optimize for:**  
Complete Milestone 5B bulk customer onboarding and separate invitations, preserving
the completed milestones through 5A.2 and their security invariants.

**Waiting on:**

- Confirmed staff order-notification inbox and currency wording
- Tier 1 per-product source and review of received BoxHero anomalies
- Real customer list and invitation timing
- Final production-domain / launch details

**Do not work on yet:**

- Live inventory / BoxHero integration
- Payment processing
- Full admin portal
- Full invoice/order-reconciliation system
- Major backend implementation that depends on a not-yet-final option

---

## Decision log

### 2026-09-07 — Milestone 5B bulk customer onboarding

**Source:** User; milestones through 5A.2 complete and merged.

Use ADMIN-only create-only CSV import, required customer numbers, existing email
normalization and exact current tier names. No passwords or roles in files, no
overwrites, no import-triggered email. Encrypt ten-minute previews bound to the
admin/session and SQL snapshot; confirm with SERIALIZABLE all-or-nothing creation.
Reuse individual creation invariants. Imported active flags agree; passwords stay null.

Invitation selection/review/confirmation is separate, active/passwordless CUSTOMER
only for bulk. Choose 25 recipients per batch, sequential 600 ms pacing, existing
AccountToken delivery guarantees and per-recipient limits, a 100/hour bulk global
cap and atomic replay guard. This keeps the initial ~50 recipients to two batches
and bounds synchronous work without adding jobs. Individual disabled-account
setup policy stays unchanged. Interrupted/partial batches need fresh status review.
No schema/dependency/env changes, real data, real email or deployment. Operational
details and deferred hosting/delivery verification: `docs/ONBOARDING.md`.

---

### 2026-09-07 — Milestone 5A.1 confirmed BoxHero and case model

**Source:** User request and read-only inspection of the supplied workbook.
**Status:** Implemented locally; remote migration/import remains deferred.

Item Number is customer-facing SKU; catalogKey remains permanent identity.
Item Name/Type/Brand/Packing map to public product content. Brand/packing are
optional. Customers order full cases; Selling Price is Tier 2 case price. Unit
Cost is confidential internal case cost and is discarded, never a tier price.
Inventory counts are diagnostic only; mapped visibility starts false. No live
BoxHero integration exists. Tier 1 is cheapest; higher ranks indicate more
expensive groups, with prices independently supplied per product and no formula.

Use unique positive PricingTier ranks, dynamic tier columns and CSV headers
`price:<rank>:<exact name>`. Require all configured columns; resolve SQL identities
server-side and reject stale tier metadata before confirmation. New nullable
brand/packing order snapshots keep historical requests readable. The operator
mapper supports bounded XLSX/CSV, reviewed category mapping and source-bound row
fixes/exclusions/acknowledgements. It never silently merges, deletes, rounds,
publishes, derives Tier 1 prices or writes remote data. Workbook contents stay
untracked; fixtures are fictional. Migration/limitations: ONBOARDING/CATALOG docs.

**Supersedes:** Exactly-two-tier logic, unconfirmed case semantics, absent source
format and the original eight-column onboarding/private-pricing headers.

---

### 2026-09-07 — Milestone 5A canonical catalog onboarding

**Source:** User / Veriq; milestones through 4A are complete and merged.
**Status:** Implemented locally; real client spreadsheet and remote apply deferred.

Use operator CLI tooling, not an application endpoint. Prepare validates a strict
eight-column canonical CSV, generates only missing UUIDv4 catalogKeys and preserves
the resolved identity mapping. Emit a spreadsheet-safe CSV for the existing admin
pricing workflow. Private prices never enter Sanity mutations or direct SQL writes.
Import defaults to a read-only plan, matches products only by catalogKey and rejects
ambiguous keys/categories, SKU collisions, malformed identities and drafts/releases.
Category names match via normalized name; ordinary document IDs come from Sanity.
Missing categories commit first, followed by one revision-guarded product transaction.
Document category-only partial outcomes and require one operator with edits paused.

Require explicit project/dataset, reviewed plan hash and exact target confirmation.
All targets are production-guarded unless explicitly designated non-production;
production additionally requires an environment acknowledgement and CLI flag.
Only CLI code reads the write token. Files live in ignored `data/onboarding/` and
are never overwritten. Tests use fictional in-memory/CLI fixtures with no remote
writes. Images, customer import, real data, deletion and deployment stay deferred.
Full contract, commands and limits: `docs/ONBOARDING.md`.

**Supersedes:** Deferral of developer product-import tooling. Actual client mapping
and production onboarding still require later data and explicit authorization.

---

### 2026-09-06 — Milestone 4A managed Website Ordering

**Source:** User / Veriq; Milestones 1 through 3C complete and merged.
**Status:** Implemented locally; no deployment or remote writes.

The Website Ordering option is authorized for this milestone. Customers select
quantities, review current server values and explicitly submit an order request.
Big Wicks handles availability questions, substitutions, finalization, payment,
invoicing and fulfillment afterward. No stock reservation or completed-purchase
claim is introduced. Currency/unit wording remains neutral until confirmed.

Persist immutable customer/tier/product/money snapshots in new Order/OrderItem
models, with SUBMITTED as the only order status. Revalidate current customer access,
tier, unambiguous published availability and exact prices in the final service.
Use BigInt integer cents and decimal SQL columns. A sealed 15-minute server review
binds intent/current snapshot to user/customer/session version. Meaningful changes
require refreshed review; `(customerId, submissionId)` uniqueness prevents duplicates.
All parent/item writes use one serializable transaction with bulk item insertion.

Use a local quantity map, 0–999 per product and at most 250 selected products.
Shared SQL limiting bounds review/submission attempts to 30/minute per user;
transactional counting permits 10 saved requests/hour per customer. Add only
ownership-protected individual customer confirmations and ADMIN list/detail views
(50/page); Orders belongs in internal ADMIN navigation, not the public navbar.

After persistence, attempt plain-text Resend notification using existing verified
ACCOUNT_FROM_EMAIL/RESEND_API_KEY and new, initially unset ORDER_TO_EMAIL. Record
PENDING/ACCEPTED/FAILED separately; acceptance is not inbox delivery. Failed or
uncertain notification leaves the order saved and visible for manual staff handoff.
No automatic queue, resend UI, customer history/editing, admin repricing,
fulfillment/payment/inventory workflow or real imports are added. Cross-system
Sanity/SQL timing and direct-mail limitations are detailed in `docs/ORDERING.md`.

**Supersedes:** Deferral of Website Ordering beyond the catalog/pricing milestones.
Excel ordering remains out of this implementation.

---

### 2026-09-06 — Milestone 3C admin pricing operations

**Source:** User / Veriq; Milestones 1, 2A, 2B, 3A and 3B complete and merged.
**Status:** Implemented locally; no deployment or remote writes.

Use `/admin/pricing` for an ADMIN-only completeness/audit table and a bulk CSV
workflow: Sanity catalog → private export → spreadsheet editing → validation and
preview → explicit confirmed PostgreSQL update → customer refresh. Product identity
is immutable catalogKey; SKU/name/category/availability remain Sanity context.
Blank price cells mean no price, with separate acknowledgment for deletions.
Omitted products are unchanged; Tier 1 and Tier 2 are independent exact decimals.

Use the small `csv-parse@7.0.2` sync parser for correct quoted/multiline CSV under
256 KiB, 500-product and 4,096-character record limits. Keep raw uploads in memory
only. AES-256-GCM previews expire in ten minutes and bind normalized prices and a
snapshot hash to the admin/session version using domain-separated `AUTH_SECRET`.
No staging table, new secret, Redis or object storage is needed. Confirmation
reauthorizes, reads current Sanity and SQL, rejects stale/tampered previews and
applies removals/bulk upserts in a serializable transaction. No automatic retries.
Separate Sanity/SQL systems cannot provide one distributed atomic content snapshot.

Internal admin navigation includes Customers, Pricing, Catalog Studio, Public
website and POST Sign out. Every pricing boundary independently calls requireAdmin;
the public navbar and customer catalog/auth rules are unchanged. Tests use only
isolated PostgreSQL and intercepted fictional catalog content. Manual price-edit
forms, real product/pricing imports, currency/unit confirmation, ordering,
inventory, payments, history and announcements remain deferred. Details and
verification: `docs/CATALOG.md`.

**Supersedes:** Deferral of admin price-management/export/import beyond 3B.

---

### 2026-09-06 — Milestone 3B protected catalog browsing

**Source:** User / Veriq; Milestones 1, 2A, 2B and 3A complete and merged.
**Status:** Implemented locally; no deployment or remote writes.

Keep `/portal` CUSTOMER-only and call the existing zero-input catalog service on
the server. Pass only authorized current-tier DTOs to a small client browsing UI.
Search/filter/name and price sorting run locally; no new pricing endpoint, identity
inputs or shared protected cache. Price sorting compares exact decimal strings.
Currency/unit meaning remains unconfirmed, so no USD/$ or case/pack label is assumed.

Use dense responsive cards in existing Big Wicks colors/fonts, native labeled
controls and explicit empty/failure/missing-image states. Next Image uses a bounded
Sanity CDN loader on the normalized URL. Keep auth and database architecture intact;
no dependencies, migrations or application environment variables are needed.

The developer reports existing fictional preview products/prices and a clean audit.
Automated tests use an isolated database and mocked content/images; no remote data
is changed. Price management, real catalog import, ordering/quantities, inventory,
payment, history and announcements remain deferred. Details: `docs/CATALOG.md`.

**Supersedes:** Directions that deferred customer browsing beyond Milestone 3A.

---

### 2026-09-06 — Milestone 3A catalog/pricing responsibility and identity

**Source:** User / Veriq; Milestones 1, 2A and 2B are complete.
**Status:** Active; implementation local only.

Sanity owns non-secret product content, category references, images and manual
visibility. PostgreSQL owns customers, tiers and private decimal ProductPrice rows.
Auth.js retains session authentication. No wholesale price fields belong in Sanity.

Generate a UUID catalogKey once per product, keep it read-only in Studio, validate
uniqueness/published-key immutability and disable product duplication. SKU/name
edits preserve identity. API writers can bypass Studio guards, so the service
rejects ambiguous keys and a read-only audit detects drift; no cross-system FK
is claimed. A new migration adds ProductPrice with composite key, tier FK and
nonnegative finite NUMERIC(12,2) price. No product content is duplicated in SQL.

Embed Studio at `/studio`, protected by ADMIN and Sanity's own editor permissions.
Use a public content dataset with no read token. Missing configuration must not
break builds. Server catalog reads take no customer/tier inputs, independently
authenticate the customer, join only current-tier prices, and use no shared cache
or CDN. Missing/invalid prices and ambiguous identities are omitted; unavailable
content is excluded. Optional content degrades gracefully. Details: `docs/CATALOG.md`.

No real Sanity project/data creation, preview/production writes or deployment.
No final catalog UI, duplicate custom product CMS, ordering/Excel, inventory,
payments or announcements. Currency/unit meaning and real import format remain
unconfirmed; tests use explicitly fictional fixtures only.

**Supersedes:** Earlier placeholders that left product content ownership or the
cross-system identity undefined. The client ordering-option decision remains open.

---

### 2026-09-06 — Milestone 2B secure setup and customer password reset

**Source:** User / Veriq; Milestones 1 and 2A are complete and merged.
**Status:** Active; implemented locally, no deployment or environment data changes.

Add a dedicated digest-only AccountToken model in a new migration. Setup links last
24 hours; reset links last one hour. Tokens are single-use and bound to the current
sessionVersion and a server-selected purpose. New links supersede older links of
the same purpose; password changes, normalized login-email changes and account-access
changes invalidate all outstanding account links. Setup/reset preserve both active
flags and increment sessionVersion transactionally.

Staff explicitly send invitations only to provisioned, passwordless CUSTOMER users.
Public reset is CUSTOMER-only for identities with a password and a Customer record;
disabled customers can change passwords but remain unable to sign in. Admin recovery
remains a controlled operational task, not a public reset endpoint.

Reuse Resend with ACCOUNT_FROM_EMAIL and canonical AUTH_URL. A token is unusable until
email acceptance is recorded. Delivery failures require a fresh issue; never report
confirmed success on failure. Reset request responses are generic and independent
of account eligibility, with lookup/delivery scheduled using Next.js after(). All
limits use PostgreSQL buckets, not process memory. Details are in `docs/AUTH.md`.

No default passwords, public registration, products, catalog, pricing implementation,
ordering or unrelated public-site changes. No real test emails, production/preview
data changes or deployment. Sender/domain configuration, live deliverability and
production provisioning remain separate release work.

**Supersedes:** Milestone 2A's temporary deferral of setup and reset flows.

---

### 2026-09-06 — Milestone 2A customer management and account-setup boundary

**Source:** User / Veriq; Milestone 1 is deployed and manually verified by the user.
**Status:** Active

Implement only staff customer list/create/edit, enable/disable and Tier 1/Tier 2
assignment. New identities may have a null password hash and cannot authenticate
until a later secure setup flow stores a real password. Never generate default
passwords or send invitations in this pass.

Account-access mutations set User.active and Customer.active together and increment
sessionVersion in one transaction. Re-enabling cannot restore old sessions. Normal
business/tier edits preserve sessions; changing the normalized login email revokes
them. Every mutation checks requireAdmin independently and verifies target records.

Apply the new nullable-hash migration only to isolated test databases during this
pass. Do not deploy or modify preview/production data. Implementation details and
Milestone 2B requirements are recorded in `docs/AUTH.md`.

**Supersedes:** Earlier sequencing that deferred the shared admin customer controls.

---

### 2026-09-06 — Start internal build before final sign-off

**Source:** User / Veriq  
**Status:** Active

**Decision:**

Begin productive work now because the project is highly likely to proceed. Use the time first on project documentation and public-site architecture/refinement rather than prematurely committing to backend scope that may still change.

**Affected areas:**

- Project-wide
- Documentation
- Site architecture
- Development sequencing

**Implementation notes:**

- Establish `/docs` source-of-truth files.
- Preserve the existing Next.js-specific AGENTS rule.
- Carve/refine the marketing site next.
- Keep the project portal-ready.

**Supersedes:** None

---

### 2026-08-25 — Constrain customer ordering to a managed request workflow

**Source:** Client discussion relayed by user / Veriq  
**Status:** Active

**Decision:**

The intended online-ordering concept is not a full ecommerce, payment, inventory, invoicing, or IMS replacement. Approved customers may view protected pricing and enter quantities; if the managed ordering option is selected, the site submits an order request and Big Wicks staff finalize availability, substitutions, final amount, invoice, and fulfillment outside the website.

**Affected areas:**

- Authentication
- Catalog
- Pricing
- Orders
- Scope
- Security

**Implementation notes:**

- Approximately 200 products.
- Approximately 50 initial customers.
- Two pricing tiers.
- Prices hidden until authentication.
- No public self-registration in the current concept.
- No payment processing.
- No BoxHero integration.
- No live inventory promise.
- No full admin panel in the currently discussed managed-ordering scope.

**Supersedes:** Earlier exploratory ideas that drifted toward a broader inventory/admin/ecommerce system.

---

### 2026-08-23 — Preserve two functional proposal levels

**Source:** User / Veriq  
**Status:** Active pending final client selection

**Decision:**

Present a simpler customer-portal/manual-ordering level and a more involved managed online-order-submission level as distinct choices. Do not make the more complex option appear artificially necessary.

**Affected areas:**

- Scope
- Proposal
- Architecture
- Development sequencing

**Implementation notes:**

- Shared foundation can include account login, protected catalog, and customer-specific pricing.
- Managed submission adds persistence/order request creation and notification.
- Functionality unique to the more complex option should not be built merely because it may increase project value.

**Supersedes:** Any assumption that only the most complex option should be proposed.

---

### 2026-08-21 — Establish current public-site visual direction

**Source:** User / Veriq design work  
**Status:** Active

**Decision:**

Use Big Wicks' real storefront/interior imagery and a bold black/off-white/red visual system. The current typography uses Barlow for body/UI and Roboto Condensed for headings.

**Affected areas:**

- Brand
- Homepage
- Responsive design
- Assets

**Implementation notes:**

- Avoid generic AI-site styling.
- Keep the physical store and selection central to the retail experience.
- Portal UI should inherit the Big Wicks identity without becoming a marketing-heavy dashboard.

**Supersedes:** Earlier generic/template directions.
