# Big Wicks Fireworks — Project Brief

## 1. Project Identity

**Client / business name:** Big Wicks Fireworks LLC
**Public-facing name:** Big Wicks Fireworks
**Project type:** Retail marketing website + protected wholesale customer portal
**Current stage:** Milestones through 7C / PR #21 are merged. Milestone 7A provides the [production readiness audit](PRODUCTION-READINESS.md) and authoritative [launch/rollback runbook](LAUNCH-RUNBOOK.md). 7B resolves CODE-01 SEO acceptance. 7C completes OPS-01 tooling/disposable rehearsal with a separate guarded tier/initial ADMIN bootstrap CLI; no production bootstrap was executed. 7D completes the [Production configuration manifest and verification plan](PRODUCTION-CONFIGURATION.md); no live provider settings were verified or changed. Verdict: **A. CODE READY — BLOCKED ON CLIENT/PRODUCTION CONFIG**, not public-launch approval. Production bootstrap execution/configuration, client data and live verification remain open. Real catalog onboarding is complete in non-production only; production catalog/pricing imports, real customer imports and real invitations have not occurred. See [current onboarding status](ONBOARDING.md#current-status).
**Primary Veriq contact:** Mick Enev

### Project summary

Big Wicks needs a polished public website that strengthens its digital presence, improves local search visibility, and gives retail shoppers a clear reason to visit the store.

The project also includes a protected wholesale customer portal for roughly 50 existing customers. The non-production catalog now contains 302 real products and 17 categories; all products remain unavailable, with descriptions and images missing. Preview Postgres has 280 Tier 2 prices, 22 unresolved/blank Tier 2 prices and 0 Tier 1 prices pending the client source.

Both proposed ordering options include:

- Wholesale customer logins
- An admin area for managing customer accounts
- Admin ability to assign and change customer pricing tiers
- Product availability controls
- Private customer-specific pricing
- A protected product catalog

The difference between the two options is how customers submit their quantities:

- **Option 1:** Excel-based ordering
- **Option 2:** Ordering directly through the website

The website's responsibility ends once the initial order is submitted. Big Wicks staff remain responsible for final availability, substitutions, order adjustments, invoicing, payment, and fulfillment.

---

## 2. Project Goals

### Primary goals

1. Present Big Wicks as a credible, distinct local fireworks destination rather than a generic chain-style retailer.
2. Improve visibility for relevant fireworks searches around La Porte, Indiana and the nearby New Buffalo, Michigan market.
3. Make store visits, directions, calls, and contact easy for public retail shoppers.
4. Give approved wholesale customers a secure way to access private pricing and current available products.
5. Give Big Wicks staff a simple admin interface for managing customer access and pricing tiers.
6. Reduce friction in the existing wholesale ordering process without turning the website into a full ecommerce, accounting, or inventory-management system.

### Primary public conversion

**CTA:** Get Directions / Visit the Store
**Destination:** Map/directions

### Primary customer-portal conversion

**CTA:** Access Wholesale Catalog
**Destination:** Authenticated customer portal

### Primary admin objective

Allow authorized Big Wicks staff to manage customer accounts, pricing tiers, and product availability without requiring Veriq to make routine account changes.

### Success should feel like

A retail shopper can quickly understand what Big Wicks offers and how to visit.

An approved wholesale customer can:

1. Sign in.
2. See only products currently marked available.
3. See the correct pricing associated with their assigned tier.
4. Enter quantities using the selected ordering method.
5. Submit the order to Big Wicks.

An authorized Big Wicks administrator can:

1. Sign in securely.
2. Create wholesale customer accounts.
3. Edit customer information.
4. Enable or disable customer access.
5. Assign or change pricing tiers.
6. Control which products are currently visible to customers.

---

## 3. Audience

### Public retail shopper

People shopping for fireworks in and around La Porte, Indiana and nearby New Buffalo, Michigan.

They primarily care about:

- Selection
- Value
- Product guidance
- Store location
- Hours
- Confidence that the trip is worthwhile

### Approved wholesale customer

Existing or approved Big Wicks wholesale/business customers who need a faster way to:

- Access the current product catalog
- View private pricing
- Enter order quantities
- Submit their initial order request

### Big Wicks administrator

Authorized staff responsible for maintaining customer access and the information customers need to place orders.

Admin users need simple, practical controls rather than a complex enterprise dashboard.

---

## 4. Service Area / Market

**Primary location:** La Porte, Indiana
**Nearby market emphasized in current site:** New Buffalo, Michigan
**Current store address in repository:** 10351 IN-39, La Porte, IN 46350 `[CONFIRM BEFORE LAUNCH]`

### Geographic notes

The current site positions Big Wicks as being approximately three miles south of downtown New Buffalo.

Do not create thin city pages or imply physical presence in locations where Big Wicks is not actually located.

---

## 5. Public Website Scope

### Existing routes

| Page     | Route       | Purpose                                          | Status           |
| -------- | ----------- | ------------------------------------------------ | ---------------- |
| Home     | `/`         | Retail discovery, selection, trust, visit intent | Existing; refine |
| Contact  | `/contact`  | Contact + store information                      | Existing; refine |
| About    | `/about`    | Currently minimal/placeholder                    | Re-evaluate      |
| Services | `/services` | Currently minimal/placeholder                    | Re-evaluate      |

### Existing homepage hierarchy

1. Hero
2. Trust strip
3. Product categories
4. Deals/promotions
5. About
6. Selection proof
7. Why Big Wicks
8. Product demo
9. Location
10. FAQ
11. Contact CTA

Do not keep sections merely because they already exist.

During the public-site carve-out pass, consolidate, restructure, or remove sections that do not materially help:

- Retail discovery
- Trust
- Product understanding
- Store-visit intent
- Local SEO
- Transition into the wholesale portal

### Public navigation

The final navigation should provide an obvious but non-dominant route for wholesale customers to sign in.

The public site should remain retail-first rather than looking like a software application.

---

## 6. Core Wholesale Portal Scope

The following functionality is included in **both ordering options**.

### Customer authentication

- Wholesale customer login
- Protected customer routes
- Logout
- Disabled accounts cannot access the portal
- No public self-registration unless explicitly approved later
- Customer accounts are created or approved through the Big Wicks admin workflow

### Admin authentication

- Separate admin authorization
- Only authorized admin users may access `/admin` functionality
- Admin permissions must be checked server-side
- Hiding admin links in the UI is not sufficient authorization

### Admin customer management

Admins can:

- Create wholesale customer accounts
- Edit customer account information
- Enable customer accounts
- Disable customer accounts
- Assign a customer to a pricing tier
- Change a customer's pricing tier

Potential supporting account functionality may include:

- Sending or regenerating account setup links
- Triggering a password-reset/setup workflow

Do not build unrelated CRM functionality into the admin system.

### Pricing tiers

The project currently expects two customer pricing tiers.

Each customer is assigned to one pricing tier.

The exact price for a customer must be resolved from authoritative server-side data.

Do not assume Tier 2 is always a fixed percentage discount unless Big Wicks explicitly confirms that pricing rule.

### Product catalog

The non-production catalog contains 302 imported products; all remain `available=false`.

Products may include:

- SKU/item number
- Name
- Category
- Description
- Image
- Availability state
- Tier-specific price data
- Other confirmed product fields supplied by Big Wicks

The exact source format for the initial product import remains to be confirmed.

### Product availability

The proposal promises that:

> Customers only see products Big Wicks currently has available.

There is no live BoxHero or inventory integration in scope.

Therefore the website must provide a manual mechanism for Big Wicks to control whether a product is customer-visible.

At minimum, each product should support an availability state such as:

```text
available = true / false
```

Unavailable products must not appear as orderable products in the wholesale customer catalog.

This is a manual catalog-visibility control, not inventory tracking.

### Protected pricing

Wholesale prices must never be publicly exposed.

Unauthenticated users must not receive protected price data through:

- Public pages
- Static HTML
- Metadata
- Browser bundles
- Public API responses
- Logs
- Search indexing

The server determines:

1. Authenticated user identity
2. Associated customer
3. Account status
4. Assigned pricing tier
5. Authoritative product price

The browser is never authoritative for pricing.

---

## 7. Ordering Options

The client has been offered two options.

The core account-management, catalog, availability, and pricing functionality is the same in both.

### Option 1 — Excel Ordering

**Quoted price:** $3,500

Includes:

- New Big Wicks website
- Wholesale customer login
- Admin customer-management area
- Pricing-tier management
- Approximately 200-product catalog
- Manual product availability controls
- Protected tier-specific pricing
- Excel-based ordering workflow

Customers:

1. Sign in.
2. Access the products and prices associated with their account.
3. Enter quantities through the appropriate Excel order sheet.
4. Submit the completed Excel order back to Big Wicks.

The exact download/upload/email workflow for the Excel file should be confirmed before implementation.

### Option 2 — Website Ordering

**Quoted price:** $4,500

Includes everything in the core wholesale portal plus direct website ordering.

Customers:

1. Sign in.
2. View available products.
3. See pricing associated with their assigned tier.
4. Enter quantities directly through the website.
5. Review their requested order.
6. Submit the order.
7. Big Wicks receives the completed order at the appropriate email address(es).

After submission, someone from Big Wicks takes over.

The website does not finalize the transaction.

---

## 8. Website Ordering Requirements — Option 2

If Option 2 is selected, the browser may submit only information necessary to describe customer intent.

Conceptually:

```text
Product ID
Quantity
```

The browser must not be trusted to submit authoritative:

- Customer ID
- Pricing tier
- Unit price
- Line total
- Order total
- Account status

### Server-side submission flow

1. Authenticate the current user.
2. Resolve the associated customer.
3. Confirm the customer account is active.
4. Resolve the customer's current pricing tier.
5. Validate every submitted product ID.
6. Confirm submitted products are currently available.
7. Validate quantity bounds.
8. Look up authoritative server-side prices.
9. Calculate line totals.
10. Calculate the order total.
11. Create the order and order items transactionally.
12. Send the completed order notification to Big Wicks.
13. Return a clear success/failure state to the customer.

### Order snapshots

Submitted orders must preserve the state of the order at submission time.

Order items should store snapshots such as:

- Product ID/reference
- SKU snapshot
- Product-name snapshot
- Unit-price snapshot
- Quantity
- Line total

This prevents later product or pricing changes from silently changing historical submitted-order data.

### Duplicate submission protection

The ordering system must protect against accidental duplicate submissions caused by:

- Double-clicking
- Browser retries
- Network retries
- Repeated form submission

Use a practical idempotency or duplicate-prevention strategy.

---

## 9. Admin Scope

The admin area is part of the contracted core scope.

### Required admin functionality

Admins must be able to:

- Log in
- View customer accounts
- Create customer accounts
- Edit customer accounts
- Enable or disable customer accounts
- Assign pricing tiers
- Change pricing tiers
- Control product availability

### Product-management scope

The proposal clearly requires Big Wicks to control which products customers currently see.

Therefore an availability control is required.

Milestone 3A establishes Sanity Studio for product content, categories, images and
manual availability. The custom admin remains responsible for customer accounts
and pricing-tier assignment. Milestone 3C adds bulk CSV price maintenance.
Private prices belong exclusively in PostgreSQL;
there is no duplicate custom product CMS.

The following may be architecturally supported but should not be assumed as required UI until confirmed:

- Creating new products
- Deleting products
- Editing product names
- Editing product SKUs
- Editing product descriptions
- Uploading/changing product images
- Editing per-tier prices individually

If Big Wicks needs routine control of those fields, expand the admin system deliberately rather than accidentally turning it into an inventory-management system.

### What the admin area is NOT

The admin area is not intended to become:

- An IMS
- An ERP
- An accounting system
- A full order-processing application
- A warehouse-management system
- A payment dashboard
- An invoicing system
- A BoxHero replacement

---

## 10. Explicitly Out of Scope

The following are excluded from both quoted options unless separately approved:

- Live inventory synchronization
- BoxHero integration
- Inventory quantity tracking
- Inventory reservation
- Automatic out-of-stock detection
- Ecommerce checkout
- Online payment processing
- Credit-card storage
- Customer payment portal
- Customer order history
- Customer self-service order editing after submission
- Automatic substitutions
- Automatic post-submission price adjustments
- Final invoice calculation
- Automatic invoicing
- Accounting integration
- ERP integration
- Shipping-rate calculation
- Fulfillment management
- Warehouse management
- Full internal order-management dashboard
- Replacement inventory-management system

If requested later, treat these as scope changes.

---

## 11. Data Model Direction

Exact schema details may evolve during implementation, but responsibilities should remain clearly separated.

### User

Represents authentication identity.

Likely fields:

```text
id
email
passwordHash
role
active
createdAt
updatedAt
```

Possible roles:

```text
ADMIN
CUSTOMER
```

### Customer

Represents the wholesale business/customer associated with a customer user.

Likely fields:

```text
id
userId
companyName
customerNumber
pricingTierId
active
createdAt
updatedAt
```

Authentication identity and business/customer data should remain separate.

### PricingTier

Represents the pricing group assigned to customers.

Likely fields:

```text
id
name
```

### Product

Represents non-secret catalog content in Sanity, not a PostgreSQL Product table.

Likely fields:

```text
catalogKey (immutable generated UUID, distinct from editable SKU and Sanity _id)
sku
name
category
description
image
available
```

### ProductPrice

Represents authoritative tier-specific pricing.

Likely fields:

```text
catalogKey
pricingTierId
price (PostgreSQL NUMERIC(12,2))
```

### Order

Required only for Option 2.

Likely fields:

```text
id
customerId
submittedAt
submittedTotal
status
```

### OrderItem

Required only for Option 2.

Likely fields:

```text
orderId
productId
skuSnapshot
nameSnapshot
unitPriceSnapshot
quantity
lineTotal
```

Do not put mutable pricing-tier information into the authentication token and then treat it as authoritative indefinitely.

Authentication answers:

> Who is this user?

The database answers:

> What customer are they associated with, are they active, what pricing tier are they currently assigned, and what price should they receive?

---

## 12. Features and Integrations

| Feature                           |         Required? | Status / Notes                       |
| --------------------------------- | ----------------: | ------------------------------------ |
| Public marketing website          |               Yes | Existing; refine                     |
| Contact form                      |               Yes | Existing Resend implementation       |
| Click-to-call / directions        |               Yes | Existing                             |
| Core SEO/local metadata           |               Yes | Existing foundation; improve         |
| GBP cleanup/support               | Yes, as value-add | Do not claim changes until performed |
| Wholesale customer authentication |               Yes | Milestone 1; preview verified by user |
| Admin authentication              |               Yes | Milestone 1; preview verified by user |
| Admin customer management         |               Yes | Milestone 2A complete and merged      |
| Customer enable/disable           |               Yes | Milestone 2A complete and merged      |
| Pricing-tier assignment           |               Yes | Milestone 2A complete and merged      |
| Account setup / password reset    |               Yes | Milestone 2B complete per user        |
| Product catalog                   |               Yes | Milestone 3B protected browsing UI; ordering deferred |
| Product availability controls     |               Yes | Milestone 3A Sanity schema            |
| Protected tier pricing            |               Yes | Milestone 3A PostgreSQL/service foundation |
| Admin pricing operations          |               Yes | Milestone 3C review/export/preview/confirmed CSV import |
| Excel ordering                    |          Option 1 | Pending client selection             |
| Website order submission          |          Option 2 | Milestone 4A implemented locally; authorized by user |
| Order email notification          |          Option 2 | Milestone 4A direct Resend; staff recipient pending |
| Live inventory                    |                No | Explicitly excluded                  |
| BoxHero integration               |                No | Explicitly excluded                  |
| Online payments                   |                No | Explicitly excluded                  |
| Customer order history            |                No | Explicitly excluded                  |
| Full order-management admin       |                No | Explicitly excluded                  |

---

## 13. Technical Context

### Existing stack

- Next.js 16.3.4
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- App Router
- Vercel-oriented deployment
- Resend contact form

### Preferred portal stack

If backend functionality is implemented:

- Auth.js for authentication/session management
- Prisma ORM
- PostgreSQL
- Zod or equivalent schema validation
- Resend for order notifications
- Appropriate server-side rate limiting

### Repository-specific framework rule

The root `AGENTS.md` preserves the existing Next.js warning:

Before assuming APIs, conventions, file structure, middleware/proxy behavior, or framework capabilities, inspect the relevant documentation installed with the repository's Next.js version.

Do not rely solely on older Next.js knowledge.

---

## 14. Authentication and Authorization Requirements

### Authentication

Use a proven authentication library rather than implementing custom session/token cryptography.

### Roles

Support clear authorization roles:

```text
ADMIN
CUSTOMER
```

### Server-side authorization

Create clear authorization helpers conceptually equivalent to:

```text
requireUser()
requireAdmin()
requireCustomer()
```

Every protected server action or route must independently enforce authorization.

Do not rely only on:

- Hidden navigation
- Client-side redirects
- UI conditionals
- URL obscurity

### Registration

Public self-registration is not part of the current scope.

Customer accounts should be created by Big Wicks administrators or through a controlled invitation/setup workflow.

### Disabled accounts

A disabled customer must not be able to:

- Sign in
- Access protected catalog data
- Access private pricing
- Submit orders

### Login protection

Credential login should include practical protection against brute-force attempts.

---

## 15. Security Invariants

The following rules are non-negotiable for the protected portal.

- Never trust customer identity supplied by the browser.
- Never trust pricing tier supplied by the browser.
- Never trust unit prices supplied by the browser.
- Never trust line totals supplied by the browser.
- Never trust order totals supplied by the browser.
- Never expose protected pricing publicly.
- Validate all product IDs server-side.
- Validate quantity bounds server-side.
- Verify product availability server-side when submitting Option 2 orders.
- Customer A must never access Customer B's protected data.
- Admin routes must require admin authorization.
- Disabled accounts cannot authenticate or order.
- Secrets remain server-side.
- Production credentials are stored in environment variables.
- Add explicit authorization/tampering tests before launch.
- Add duplicate-submission protection for Option 2.
- Use database transactions where multiple writes form one logical operation.

---

## 16. Brand / Design Direction

The current retail design direction remains active unless explicitly changed.

### Visual direction

- Black
- Off-white
- Big Wicks red
- Authentic storefront/interior imagery
- Bold condensed headings
- Restrained shape language
- Minimal unnecessary effects
- High contrast
- Strong local-retail personality

### Existing typography

- Barlow
- Roboto Condensed

### Portal design

The wholesale portal and admin area should still feel like Big Wicks.

However, these interfaces should prioritize:

- Clarity
- Speed
- Information density
- Product scanning
- Accurate state feedback
- Error prevention
- Mobile usability

over decorative marketing treatment.

Avoid generic SaaS-dashboard aesthetics.

---

## 17. Public Website and Portal Relationship

The project contains two distinct experiences.

### Public website

Primary audience:

- Retail shoppers

Primary objectives:

- Discover Big Wicks
- Understand selection/value
- Get directions
- Call/contact
- Build trust

### Customer portal

Primary audience:

- Approved wholesale customers

Primary objectives:

- Sign in
- View available products
- View assigned pricing
- Enter quantities
- Submit through selected ordering workflow

### Admin area

Primary audience:

- Authorized Big Wicks staff

Primary objectives:

- Manage wholesale customers
- Manage account status
- Manage pricing-tier assignment
- Manage product visibility

Do not design the public homepage like an application dashboard.

---

## 18. SEO / Online Presence Scope

The project includes core SEO setup and assistance improving Big Wicks' broader online presence.

### Website SEO

Focus on:

- Big Wicks branded searches
- Fireworks store searches
- Fireworks searches around La Porte
- Nearby New Buffalo intent where geographically accurate
- Useful category/product-related content where appropriate
- Technical SEO
- Structured data
- Metadata
- Internal linking
- Crawlability
- Performance
- Mobile usability

Do not use:

- Keyword stuffing
- Fake service locations
- Thin city pages
- Unsupported rankings/superiority claims

### Google Business Profile support

Planned assistance includes:

- Connecting website and business information correctly
- Reviewing outdated information
- Reviewing outdated images
- Improving website/GBP consistency
- Connecting appropriate social profiles where possible
- Improving overall local presence

Do not document GBP changes as completed until they are actually performed.

---

## 19. Current Build Order

### Milestone 1 — Foundation and authentication

1. Finalize initial database architecture.
2. Add Prisma/PostgreSQL.
3. Add Auth.js.
4. Implement `ADMIN` and `CUSTOMER` authorization.
5. Implement secure login/logout.
6. Implement protected `/admin` area.
7. Implement protected customer area.
8. Confirm disabled-account behavior.

### Milestone 2A — Admin customer management

1. Customer list
2. Create customer
3. Edit customer
4. Enable/disable customer
5. Assign pricing tier
6. Change pricing tier

Complete and merged per user: customer list/create/edit, verified tier assignment, synchronized
enable/disable and session revocation. Passwordless accounts await setup and cannot
authenticate. See `docs/AUTH.md` for mutation rules and the nullable-hash migration.

### Milestone 2B — Customer account setup

1. Secure first-time password setup/invite flow
2. Password reset
3. Confirmed production provisioning

Complete per user: explicit staff setup invitations, single-use expiring links,
customer-chosen passwords and customer-only public reset. Setup/reset preserve
account access and revoke sessions. See `docs/AUTH.md` for token, email and retry
rules. Customer creation still sends no automatic invitation and creates no default
password. Production provisioning/configuration and real email delivery verification
remain a separately authorized release task.

### Milestone 3A — Product catalog and private pricing foundation

1. Sanity product/category schemas and an embedded `/studio` route.
2. Immutable catalogKey independent of SKU/name.
3. PostgreSQL ProductPrice per catalogKey/tier, decimal-safe and private.
4. Authenticated server-only catalog join using the current customer tier.
5. Read-only content/pricing consistency audit.
6. Fresh isolated tests with fictional fixtures only.

Complete and merged per user; fictional preview content/prices and a clean audit
were manually verified by the developer. See `docs/CATALOG.md`. Real catalog/import
columns and case semantics are now confirmed in Milestone 5A.1; currency remains unconfirmed.

### Milestone 3B — Protected wholesale catalog UI

Complete and merged per user. Implemented at CUSTOMER-only `/portal`: server-authorized current-tier catalog,
client search/category filters/name and exact-price sorting, responsive cards,
optional-content fallbacks, empty/failure states and account/sign-out navigation.
No ordering, quantity inputs or private pricing API. Automated checks use only
isolated SQL and mocked Sanity content. See `docs/CATALOG.md` for boundaries.

### Milestone 3C — Admin pricing operations

Complete and merged per user. Implemented at `/admin/pricing`: current completeness/audit overview,
product pricing table, private CSV export, bounded CSV validation and detailed
preview, then explicit confirmation of one atomic PostgreSQL import. Blank cells
mean no price and require acknowledgment before deleting existing prices; omitted
products remain unchanged. catalogKey is authoritative; SKU/name are context.
Each tier is independently supplied, with no automatic discount formula.

Every pricing page, export, action and service independently requires ADMIN.
Encrypted ten-minute previews bind to the admin/session version and reject tampering
or catalog/tier/price drift. Internal navigation links Customers, Pricing, Catalog
Studio, Public website and Sign out; public navigation is unchanged. Sanity retains
content/availability ownership. No new schema, migration or environment variable.
Manual per-product editing and inventory stay deferred. Non-production catalog
and Tier 2 pricing imports are now complete; production imports remain pending.
Website ordering is implemented in Milestone 4A below.
See `docs/CATALOG.md` for workflow, operational limits and local-only verification.

### Milestone 4A — Managed online ordering

The user authorized the quoted Website Ordering option for this milestone.
Implemented locally: catalog quantity inputs, server-generated review, explicit
submission with current customer/tier/price/availability validation, exact money
calculation, immutable Order/OrderItem snapshots and database-backed idempotency.
Changed review values require renewed customer review before an order can be saved.
Orders use only SUBMITTED status; there is no fulfillment state machine.

Resend notification occurs after persistence and tracks provider acceptance/failure
separately. ADMIN has a newest-first 50-order list and snapshot detail pages, with
Orders in internal navigation. Customer confirmation enforces ownership and exposes
no staff notification state. There is no customer history list or order editing.
Limits: 999 per product, 250 selected products, 30 ordering attempts/minute per user
and 10 saved requests/hour per customer. These are documented defensive choices.

One new migration adds submitted orders; no old migration or dependencies change.
The new server-only `ORDER_TO_EMAIL` remains unset pending recipient confirmation
and reuses the verified account sender. No remote writes, real orders or deployment.
Big Wicks owns final availability review, substitutions, payment, invoicing and
fulfillment outside the website. See `docs/ORDERING.md` for exact architecture,
notification recovery limits, setup and verification.

### Milestone 5B — Bulk customer onboarding

Milestone 5B now adds `/admin/customers/import` and `/admin/customers/invitations`
without changing this catalog workflow. Customer imports use a strict five-column
CSV, dynamic current tiers, encrypted previews, stale-state checks and atomic
create-only writes. Imported accounts are passwordless and receive no automatic
email. Invitations require a separate selected-recipient review and confirmation,
using existing secure setup tokens. No real customer/remote data/email operations
are authorized by implementation. See `docs/ONBOARDING.md` for the 5B workflow.

### Milestone 5A.1 — Real case catalog, configured tiers and BoxHero mapping

5A is complete and merged per user. Brand/packing are optional public catalog
metadata. Customers order complete cases; Selling Price is Tier 2 case price,
Unit Cost is confidential internal case cost, and Packing is descriptive only.
Item Number supplies customer-facing SKU; BoxHero SKU is not identity. Never
derive website availability from inventory counts. CatalogKey stays permanent.
Tier 1 is cheapest, higher ranks describe more expensive groups; all per-product
prices remain independently entered. Tier 1 source is still pending.

Implement unique positive tier ranks, dynamic customer/pricing/audit paths,
new nullable order metadata snapshots, dynamic pricing CSV and operator BoxHero
XLSX/CSV mapping. Default mapped visibility is false. Source corrections,
exclusions, category labels, zero/invalid prices and initial visibility require
explicit operator review. No remote migration/import, tier creation, deployment
or environment changes are authorized during this task. See ONBOARDING/CATALOG/
ORDERING docs. Real workbook contents must not be committed or copied into tests.

### Milestone 5A — Product catalog onboarding tooling

Milestones 1, 2A, 2B, 3A, 3B, 3C and 4A are complete and merged per the user.
Add only operator tooling: canonical CSV preparation into a preserved UUID mapping,
explicit target-aware Sanity dry-run/apply, and a compatible pricing CSV for the
existing admin validation/confirmation workflow. No client columns or products are
invented, no ProductPrice writes replace that workflow, and no customer UI changes.
Real data and images were pending during the Milestone 5A implementation, which
authorized no remote apply or deployment. Non-production catalog/pricing onboarding
has since occurred; see [current onboarding status](ONBOARDING.md#current-status)
for the remaining pricing/content gaps and production/customer boundaries.

### Earlier admin catalog controls

At minimum:

1. View products
2. Toggle product availability

Add broader product-editing controls only if confirmed necessary.

### Milestone 5 — Customer catalog

Browsing/search/filter/pricing are implemented by Milestone 3B. Quantity and
managed website ordering interactions are implemented by Milestone 4A.

1. Customer authentication
2. Search/filter catalog
3. Hide unavailable products
4. Show assigned-tier prices
5. Responsive product/quantity interface

### Milestone 6A — Option 1 ordering

If Excel ordering is selected:

1. Finalize Excel workflow
2. Generate/provide appropriate order sheet
3. Make customer pricing/product data available in the agreed format
4. Establish submission process to Big Wicks

### Milestone 6B — Option 2 ordering

If website ordering is selected:

1. Quantity entry
2. Order review
3. Server-side validation
4. Server-side pricing
5. Order snapshot
6. Database transaction
7. Duplicate-submission protection
8. Big Wicks email notification
9. Customer success confirmation

### Milestone 7 — Security and failure testing

Test:

- Logged-out protected access
- Customer/admin role separation
- Customer A vs Customer B isolation
- Price tampering
- Tier tampering
- Customer-ID tampering
- Invalid product IDs
- Unavailable products
- Negative quantities
- Excessive quantities
- Disabled users
- Duplicate submission
- Failed email delivery
- Database failure behavior

### Milestone 8 — Public-site carve-out

1. Review current navigation.
2. Review every homepage section.
3. Remove unnecessary sections.
4. Consolidate repetitive messaging.
5. Add clear wholesale login path.
6. Refine public calls to action.
7. Revisit placeholder `/about` and `/services` routes.
8. Preserve the retail-first experience.

### Milestone 9 — SEO / GBP / online-presence pass

1. Metadata
2. Structured data
3. Sitemap/robots
4. Internal linking
5. Local search targeting
6. Search Console
7. GBP cleanup
8. Website/social/GBP consistency
9. Updated imagery where appropriate

### Milestone 10 — Production QA and launch

1. Import final customers.
2. Import final product/pricing data.
3. Confirm production email destinations.
4. Configure production environment variables.
5. Confirm database backups/recovery approach.
6. Run lint/tests/build.
7. Verify desktop/tablet/mobile.
8. Verify protected-route behavior.
9. Verify email delivery.
10. Verify metadata/schema.
11. Resolve `[CONFIRM]` items.
12. Client approval.
13. Launch.

---

## 20. Current Priority

### What Codex should optimize for right now

Complete the release gates in [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md).
Milestones through 7C / PR #21 are merged; CODE-01 public SEO acceptance is closed.
[LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md) supersedes the older illustrative milestone
launch order above. 7C completes OPS-01 guarded bootstrap tooling/rehearsal; 7D
completes the [Production configuration manifest](PRODUCTION-CONFIGURATION.md).
Collect client inputs and complete its read-only dashboard verification ledger,
then separately authorize necessary configuration/provisioning and migration/bootstrap
only after their live gates pass. 7A/7B/7C/7D perform no deploy, live mutation, real
email or customer import. Local link/env evidence is not live provider verification.

### Do not work on yet

Until needed by the active milestone:

- Excel ordering implementation
- Customer order history
- Payments
- Live inventory
- BoxHero integration
- Invoicing
- Full order-management tooling
- ERP/accounting integrations

Avoid giant implementation passes.

Build and verify one vertical slice at a time.

---

## 21. Open Questions

### Blocks later implementation

- [x] Website Ordering authorized by the user for Milestone 4A implementation.
- [x] BoxHero XLSX export received and inspected read-only for 5A.1 (311 rows).
- [ ] Tier 1 per-product source is pending; BoxHero Selling Price is confirmed as Tier 2 case price.
- [x] All tiers are independently priced per product; no percentage formula.
- [ ] What exact customer fields are included in the approximately 50-customer import?
- [x] Initial customer setup: admin-issued, expiring single-use email links (Milestone 2B).
- [ ] Which Big Wicks staff members need admin accounts?
- [ ] Which Big Wicks email address(es) should receive Option 2 orders?
- [ ] For Option 1, exactly how should the Excel order sheet be generated/downloaded/submitted?
- [x] Content/availability belongs in Sanity; ADMIN bulk pricing maintenance is authorized for Milestone 3C. Individual price-edit forms remain deferred.
- [x] Milestone 4A defensive limits: 0–999 per product and 250 selected products; review against real operational needs before launch.

### Can wait until later

- [ ] Production domain
- [ ] Analytics ownership
- [ ] Search Console ownership
- [ ] Final GBP access
- [ ] Final promotions/deals
- [ ] Final confirmation of all current store hours
- [ ] Final confirmation of contact/social data
- [ ] Final privacy/legal requirements

---

## 22. Acceptance Criteria

### Public website

- [ ] Correct Big Wicks identity everywhere
- [ ] Strong retail-first homepage
- [ ] Clear visit/directions CTA
- [ ] Wholesale login is easy to find without dominating the retail experience
- [ ] Accurate location/contact information
- [ ] No unsupported claims
- [ ] Strong mobile/tablet/desktop usability
- [ ] Useful local SEO without keyword stuffing
- [ ] No stale/demo metadata
- [ ] No broken routes
- [ ] Relevant lint/build checks pass

### Authentication

- [ ] Admin and customer roles are enforced server-side
- [ ] Protected routes reject unauthenticated users
- [ ] Customer users cannot access admin functionality
- [ ] Disabled users cannot authenticate/access protected data
- [ ] Login attempts are appropriately protected
- [ ] No public self-registration exists unless explicitly approved

### Admin area

- [ ] Admin can create customer accounts
- [ ] Admin can edit customer accounts
- [ ] Admin can enable/disable customer accounts
- [ ] Admin can assign pricing tiers
- [ ] Admin can change pricing tiers
- [ ] Admin can control product visibility
- [ ] Unauthorized users cannot call admin mutations directly

### Customer catalog

- [ ] Only authenticated approved customers can access private catalog pricing
- [ ] Customer sees only currently available products
- [ ] Customer sees only their assigned-tier pricing
- [ ] Pricing cannot be manipulated from the browser
- [ ] Private prices are not exposed publicly

### Option 1

If selected:

- [ ] Appropriate Excel ordering workflow functions correctly
- [ ] Customer receives the correct products/pricing
- [ ] Completed order can be submitted back to Big Wicks
- [ ] No unsupported ecommerce behavior is implied

### Option 2

If selected:

- [ ] Customer can enter quantities directly on the website
- [ ] Order data is validated server-side
- [ ] Prices are resolved server-side
- [ ] Product availability is checked server-side
- [ ] Order and order items are created transactionally
- [ ] Product/pricing snapshots are preserved
- [ ] Duplicate submissions are safely handled
- [ ] Big Wicks reliably receives the submitted order
- [ ] Customer receives clear confirmation
- [ ] No payment/live-inventory behavior is implied
- [ ] Customer order history is not exposed

### Final project

- [ ] Scope remains consistent with the selected quoted option
- [ ] No BoxHero/live inventory functionality slipped into the project
- [ ] No payment functionality slipped into the project
- [ ] No full order-management system slipped into the project
- [ ] Remaining limitations are documented
- [ ] Security-sensitive functionality has explicit tests
- [ ] Production configuration is verified
- [ ] Client approval is received before launch
