# Managed online ordering — Milestone 4A

The user authorized the Website Ordering option for this milestone. Milestones
1, 2A, 2B, 3A, 3B and 3C are complete and merged per the user. This implementation
is local only: no remote migration, real order/email, content write or deployment.

## Responsibility and workflow

The website owns customer order submission, an immutable submitted snapshot, staff
notification and minimal staff visibility. Big Wicks handles availability review,
substitutions, finalization, payment, invoicing and fulfillment outside the website.
Submission is an order request, never a completed purchase or stock reservation.

`/portal` → quantities → **Review order** → current server review → **Submit order
request** → ownership-protected confirmation. The catalog's search/filter/sort and
current-tier DTO remain unchanged. Quantity state is a component-local map keyed
by catalogKey; filtering preserves selections. Reloading loses an unsubmitted
draft. There is no localStorage, persistent cart or anonymous/cross-device cart.
The selected-product count and exact estimated total are conveniences only.

Quantities are integers 0–999; blank means zero, zero lines are omitted. Up to 250
distinct products may be submitted. Negative, fractional, padded/whitespace,
exponent, non-finite, malformed and excessive quantities are rejected without
clamping. Malformed/duplicate keys and empty orders fail. UUIDv4 keys use the
existing canonical lowercase representation. Only catalogKey/quantity pairs are
sent to review; caller-supplied customer/tier/price/total fields are ignored.

Customers order complete cases. Prices are per case and totals are case price ×
number of cases; packing is descriptive and never a multiplier/divisor. Currency
remains unconfirmed. No tax, shipping, discounts or fees are inferred.

## Case metadata update (Milestone 5A.1)

The new `20260907050000_case_catalog_tier_rank` migration adds nullable
`brandSnapshot` and `packingSnapshot` to OrderItem. Current metadata is included
in the reviewed hash and final stored lines, so changing it requires refreshed
review before submission. Confirmation, staff order details and plain-text email
use the saved snapshot without querying Sanity. Historical rows remain nullable;
their quantity/price/total columns are not rewritten. Existing field names such
as unitPriceSnapshot and quantity are retained internally, with case terminology
in the UI/email. Idempotency, interrupted-submit recovery and navigation remain
unchanged. All currently valid configured tiers are supported.

## Schema and exact arithmetic

The new `20260906040000_submitted_orders` migration adds Order, OrderItem,
OrderStatus and OrderNotificationStatus. Earlier migrations are unchanged.

- **Order:** internal CUID; unique random `BW-` plus 20 hex-character reference;
  customer and submitting-user relations; submission UUID/review hash; SUBMITTED
  status; company/customer-number/email/tier-ID/tier-name snapshots; exact total;
  created timestamp; notification status and optional provider-acceptance timestamp.
- **OrderItem:** internal CUID; order relation; catalogKey, SKU, name, optional brand/packing, case-price,
  case-count and line-total snapshots. Each catalogKey is unique within its order.
  There is no Sanity or ProductPrice foreign key required to render history.
- Unit prices use NUMERIC(12,2). Line/order totals use NUMERIC(18,2), sufficient for
  250 products × 999 × 9999999999.99 = 2497499999997502.50. Quantity and finite,
  nonnegative amount CHECK constraints include exact line-total multiplication.
  Customer/user/order deletion is restricted by foreign keys.

The existing `priceText()` validates authoritative unit prices. Shared BigInt
integer-cent multiplication/summing is exact on server and client; only quantities
use Number. PostgreSQL/Prisma receives canonical decimal strings, never floating
point money. Order/OrderItem snapshots have no application editing/deletion route.
Later catalog, price, customer or tier edits do not update those snapshots.

## Review, authorization and concurrency

Every action/service independently calls `requireCustomer()`. ADMIN cannot submit
as a customer. Review reads current PostgreSQL identity/association/tier and the
published Sanity origin through the existing uncached content reader/normalizer.
Requested products must be unambiguous, available and validly priced for the
customer's current configured pricing tier. Missing or failed content/prices fail safely;
no fallback to browser data or another tier is allowed.

A server-generated AES-256-GCM envelope binds requested keys/quantities, customer,
user/session version, random submission UUID, a snapshot hash and 15-minute expiry.
It uses a random 96-bit nonce and a domain-separated key derived from existing
`AUTH_SECRET`; rotating that secret invalidates reviews. No new review secret,
staging table or raw browser pricing is needed. Only the authorized review DTO and
opaque envelope reach the browser. Final submission accepts that envelope alone.

Final submission independently authorizes, opens the token, checks for an already
persisted identical submission and otherwise reads current Sanity. A serializable
PostgreSQL transaction locks User before Customer, rechecks current role, active
flags, association and session version, resolves the current tier and prices, and
recalculates all amounts. It compares the reviewed hash with customer/tier context,
requested product document IDs/keys/SKUs/names/brand/packing, case counts and exact current prices.
Any meaningful difference returns refreshed values and requires a second explicit
review/submit; no order is created. Unavailable/missing-price products reject and
require returning to/reloading the catalog. Description/image/category edits do
not alter the reviewed order because those fields are not order snapshots.

Order plus a bulk OrderItem insert commit together. A failed item insert or
serialization conflict cannot leave a partial order. Sanity and SQL are separate
systems: a content edit after the final Sanity read can occur during SQL commit.
There is no distributed lock or live inventory promise. Immutable catalogKey and
fail-closed current reads preserve the existing cross-system constraints.

## Idempotency and limits

The database uniquely constrains `(customerId, submissionId)`. The server-generated
submission UUID belongs to a review, and the saved review hash prevents using it
for different values. Concurrent/replayed identical final actions return the same
reference and never insert or notify twice. A retry of an already-created order
can recover its reference even after token expiry or catalog/price changes; current
customer authorization/session binding still applies. An expired unused review
cannot create an order. References and submission IDs never grant authorization.

The UI keeps the review/token after an interrupted submission so **Submit order
request** retries the same intent. Starting a fresh review generates a new intent;
it is not deduplicated by identical product contents, which may be legitimate.
There is no durable draft or customer order-history list. If a browser is closed
and loses its review/confirmation URL, staff can locate the saved request.

On `submitted`, the Server Action calls `redirect(confirmationPath,
RedirectType.replace)` outside any catch block. Next.js supplies the 303 action
redirect and manages the confirmation navigation/history replacement. The client
handles only returned review/invalid results and ordinary transport failures;
it never initiates success navigation itself. Its async React action transition
keeps **Submitting…** active. The catch calls documented `unstable_rethrow()` first
so Next's redirect signal reaches its RedirectBoundary, instead of being mislabeled
as an interruption. Ordinary failures retain the review/token and permit retry.

There is no `revalidatePath("/admin/orders")` after submission. The protected list
uses request-time authentication and uncached PostgreSQL reads; the next server
request reads current orders. An already-open staff page still needs navigation
or refresh; this is not a live feed. In installed Next.js 16.2.9, action revalidation
invalidates router caches and schedules navigation work even after resolving the
action result. The previous browser `location.replace()` could race that work.
The framework-owned redirect removes that competing navigation; no timing delay
or custom error boundary is added.

The existing shared PostgreSQL/HMAC limiter allows 30 review/new-submission attempts
per user per minute, bounding malformed requests and content work. Inside the
transaction, a customer-indexed count enforces 10 successfully persisted orders
per rolling hour using database time. The User lock and serializable isolation
arbitrate concurrent submissions. Identical saved retries bypass order/attempt
quotas and do not send another email. Storage failures deny new writes. Limits are
defensive implementation choices and can be reviewed against real staff usage.

## Notification and recovery

After commit, a plain-text Resend email includes reference, company/customer number,
login email, UTC timestamp, SKU/name, quantity, unit price, line total and total.
Content fields have embedded control/newline characters flattened; no HTML is
generated. No session/security data, internal IDs or Sanity metadata is included.
Provider payloads, private order contents and provider errors are never logged.

Configuration is server-only:

- Existing `RESEND_API_KEY` and verified `ACCOUNT_FROM_EMAIL` are reused.
- New **`ORDER_TO_EMAIL`** is one validated staff recipient. Leave it empty until
  the intended destination is confirmed. There is no contact-email fallback and
  no new customer order-confirmation email.

Notification starts PENDING on persistence. A bounded 10-second direct request
uses an order-reference Resend idempotency key. Provider acceptance records
ACCEPTED plus `notificationAcceptedAt`; this is not confirmed inbox delivery.
Configuration failure, rejection or timeout records FAILED. A process interruption
or failure to record the result leaves PENDING (acceptance may be uncertain).
None of these failures rolls back the saved order or asks the customer to create
a replacement order. Customer confirmation promises a saved request and subsequent
staff review, never that an email reached an inbox.

`/admin/orders` shows newest first, 50 per page, with company, reference, UTC time,
total and notification state. Detail pages render PostgreSQL snapshots even while
Sanity is unavailable. Staff must check pending/failed notifications and hand the
saved request into their existing process manually; no automatic notification
retry queue, retry button, delivery webhook or fulfillment workflow is included.
Direct delivery is not durable background execution or guaranteed email delivery.

## Privacy and routes

`/portal/confirmation/[reference]` is an individual saved confirmation, not a
history list. Both page and service require CUSTOMER and resolve ownership from
the current server-side customer association. Other customers, ADMIN and anonymous
users cannot access it. Its explicit DTO excludes notification/tier/internal IDs.
ADMIN pages/services independently require ADMIN. Orders is added only to the
internal admin navigation; public navigation is unchanged.

All order pages are request-time protected/noindex with generic metadata; no order
or private price data enters public pages, static metadata or a public order API.
There is no shared order cache. Existing Next.js Server Action POST/origin
protection remains enabled. Session revocation/disabled access blocks new protected
requests; already-delivered browser data cannot be recalled.

## Local setup and verification

Use Node 24 and existing dependencies. Run `npm run db:generate`, and apply the
new migration with `npm run db:deploy` only against an intended local database.
The build generates Prisma but never migrates/seeds. Before any separately
authorized release, confirm the staff inbox/verified sender, currency wording,
migration/backup plan, direct-notification operational monitoring and existing
dependency advisories. No production routing or credentials are changed here.

Install both test browsers with `npx playwright install chromium firefox`.
`npm run test:integration` creates a fresh isolated PostgreSQL cluster, applies
all migrations, seeds fictional users and runs unit/database tests plus production
Playwright passes with unconfigured and locally intercepted Sanity. Resend is
mocked/intercepted and the staff recipient is `orders@example.test`. Test orders
never touch preview/production SQL or remote Sanity. Run `npm run build` afterward
to restore the ordinary local configuration before manual `npm start`.
Playwright's `chromium` project runs the full suite; `firefox-orders` runs the five
order scenarios, including successful/lost-response submission, stale reviews,
notification failure, customer isolation and responsive views. Both run against
the same isolated harness with one worker. Normal success uses the original
unintercepted Server Action response; only lost-response recovery buffers/aborts
that response. To select only Firefox against an
already-running isolated test server, use `npx playwright test --project=firefox-orders`.

Deferred: Excel customer ordering, payments/checkout, tax/shipping, live inventory,
BoxHero, stock reservation, invoicing, customer history/edit/reorder, admin repricing,
substitutions, cancellation/completion states, fulfillment and deployment.
Non-production catalog/pricing imports are complete; production imports and real
customer onboarding remain pending. See [current onboarding status](ONBOARDING.md#current-status).

## Verification record

Server Action redirect follow-up on 2026-09-07: lint, typecheck, 151 unit tests,
261 combined unit/database tests, all five isolated migrations and the ordinary
production build passed. Playwright passed 29 Chromium scenarios and all five
Firefox order scenarios (34 total; Playwright Firefox 155.0). Normal submission
retains the original response stream in both browsers. Tests observed a 303
replacement redirect with no revalidation header and no visible global error or
false interruption message. Recovery retries the identical token after losing a
successful response, with one order and one captured notification. Stale reviews,
rejections, email failure, isolation, Back/Forward and responsive checks passed.
The production build restores ordinary local configuration after the test build.
The reported deployed Firefox session was not retested; local results are not
proof of deployed behavior. No order-service, schema, dependency or security changes.

Earlier native-navigation follow-up on 2026-09-07: lint, typecheck, 151 unit tests, 261 combined
unit/database tests, all five isolated migrations and the ordinary production
build passed. Playwright passed 15 unconfigured and 14 intercepted-content
scenarios (29 total). Two new scenarios monitor DOM mutations for the global error
text, assert pending controls at document departure, verify native confirmation
navigation and Back/Forward history, and count one saved order/notification.
One deliberately loses the successful action response and retries the same token.
Existing stale-review, rejection, notification-failure and responsive tests pass.
That coverage was Chromium-only. The user subsequently reproduced the flash in
deployed Firefox, so it did not verify or resolve that browser-specific symptom.
The Server Action redirect follow-up above supersedes that native-navigation fix.

Milestone 4A checks on 2026-09-06 passed: Prisma generation, all five migrations on
a fresh isolated PostgreSQL database, lint, typecheck, `npm test` (151 unit tests),
`npm run test:integration` (261 combined: 151 unit + 110 database tests), and
`npm run build`. Playwright passed 15 scenarios in the unconfigured build and all
12 in the intercepted-content build (27 total); those 12 intentionally skip in
the unconfigured pass. The test database stopped cleanly.

Coverage includes authorization/disabled/revoked access, customer isolation,
forged customer/tier/money input, malformed quantities/products, exact maximum
250-line totals, stale reviews, unavailable/missing-price selections, transaction
rollback, concurrent/replayed idempotency, rate limits, notification-after-commit,
email failure retention, snapshot immutability and bounded staff pagination.
Browser coverage includes real HTTP action replay, confirmation ownership, staff
views, preserved filter selections, public-data isolation and 200-product usability.
Quantity, review, confirmation and admin screenshots at 390/768/1440px were inspected;
overflow checks and the unobstructed final quantity control check passed.

Diff review and `git diff --check` passed. No earlier migration, dependency version,
authentication/catalog/pricing service, Sanity schema or public navigation was
changed. Real email delivery, remote migrations/data and deployment remain unverified
and were not performed. Existing dependency-advisory review remains a release task.
