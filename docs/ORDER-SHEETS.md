# Staff Excel order sheets

`/admin/order-sheets` manages staff export templates for the actual configured
PricingTier records, in rank order. Customers keep the existing review, submission
and confirmation flow. **Uploading an order sheet changes Excel exports only.
Website products and prices are managed separately.** Use Sanity for catalog
content and `/admin/pricing` for private case prices.

## Upload, review and activate

1. Select the intended database pricing tier and upload a `.xlsx` file, at most
   2 MiB. The filename, tier headings and purchase notes never assign a tier.
2. Review the detected worksheet, header row, columns, product count and validation
   messages. Structural problems and duplicate normalized product IDs block
   activation; correct the source locations and reupload. An invalid replacement
   leaves the current active version unchanged.
3. Explicitly select a detected case-price column, even when only one exists.
   Multiple price columns are allowed and remain staff-only.
4. Review unique SKU matches, unmatched template rows, missing catalog mappings,
   ambiguous catalog SKUs and source/website price differences. Formula-derived,
   date, blank or otherwise unreadable price values are reported; they are never
   evaluated. Source prices never update ProductPrice.
5. Acknowledge the selected tier/column, warnings and complete fallback behavior,
   then activate the reviewed version. A preview expires ten minutes after upload.
   Changed catalog identities/SKUs/names/availability, tier metadata, private prices,
   session or active-version revision requires a fresh upload. Concurrent activation
   has one winner. No client-supplied mapping is authoritative.

Only unique matches on **both sides** are used. PRODUCT ID and SKU normalization is
Unicode NFKC, outer whitespace trimming and uppercase conversion. Internal spaces
and punctuation stay intact: `DEMO-A,B,C` is one identifier. No fuzzy name matching,
punctuation splitting or catalogKey derivation occurs. Mappings bind permanent
catalogKey to a row in that exact immutable template version. Replacement files
are parsed and mapped afresh. Unknown template products do not create catalog items.

Deactivate to stop pinning a template to future orders. Existing orders keep their
version/artifact. The page shows the latest 20 retained versions per tier. An old
order also links to its pinned original, including versions older than that list.
Downloads reauthorize ADMIN independently and return attachments with private,
no-store and noindex headers. There are no public file URLs or customer downloads.

## Supported template contract (order-sheets-v1)

One visible worksheet, not named `Submitted order`, with one unique header row in
the first 30 rows. Headers use NFKC, uppercase, trimmed/collapsed whitespace and
replace `.`, `_`, `:` with spaces. Required columns and aliases:

| Field | Accepted headers |
| --- | --- |
| Case count | QTY, QUANTITY, CASES, CASE COUNT |
| Identifier | PRODUCT ID, SKU, ITEM NUMBER |
| Name | PRODUCT NAME, ITEM NAME |
| Packing | PACKING, CASE PACK |
| Line total | TOTAL, LINE TOTAL |
| Optional unit weight | UNIT G.W, UNIT WEIGHT |

The remaining 1–16 nonempty labeled header columns are offered as case-price
choices. Staff confirms their meaning; the application does not infer tier names
or thresholds. Product rows have both an ID and a name. Category headings have a
blank ID or merge the ID/name into a single heading. Product cells must be unmerged
and product rows/required columns visible. Up to 2,000 products are supported.
Reordered columns/rows, inserted categories, blank rows and trailing formatting
are accepted. ID/name limits are 100/200 characters.

After the final product, include one `SUBTOTAL` or `MERCHANDISE SUBTOTAL` label,
with its value in the immediately adjacent cell to the right. Optional `TOTAL` or
`GRAND TOTAL` has the same layout. SHIPPING, TAX, CC FEE and CARD FEE labels may
include rates; their right-hand amount cells are cleared. `TOTAL WEIGHT...` has
its result to the right; `TOTAL CASE COUNT`/`TOTAL CASES` has its result immediately
below. These coordinates are detected per version, not globally fixed.
Summary/input result cells must be distinct, unmerged and within the supported
worksheet bounds; duplicate subtotal/total labels block activation.

Supported previous-order input labels are CUSTOMER, CUSTOMER NAME, COMPANY,
COMPANY NAME, EMAIL, CUSTOMER NUMBER, ORDER DATE, ORDER NUMBER, REFERENCE and
PO NUMBER. Their adjacent right-hand cells are cleared in generated copies.
Other previous-order inputs must be removed from the source before uploading.
This is a bounded table/summary contract, not an arbitrary spreadsheet mapper.

Ordinary cell fonts/fills/borders/number formats, row heights, column widths,
category separators, merges outside product data and standard page setup are
preserved through ExcelJS. Printer-driver binary settings, calculation chains,
author metadata and worksheet protection are explicitly not retained in generated
copies. The original download is always the uploaded bytes. Drawings, charts,
tables, conditional formatting, data validation, external links, connections,
custom defined names, macros, OLE/embedded objects and extensions are unsupported;
remove them or create a simpler export template. Arithmetic, local cell references,
SUM and SUMPRODUCT source formulas are accepted only in price, line-total or
recognized summary cells. Arrays, dynamic/named/external/active formulas are rejected.
ExcelJS does not evaluate any source formula.

Packing date/numeric cells produce warnings; no packing-ratio conversion is
invented. For ordered rows, saved packing replaces the template value and null
stays blank. Unit weight is not present in saved orders. Shipment weight is marked
not calculated by the website, never presented as an authoritative complete weight.

## Saved orders and exports

New orders pin the current active template ID (or explicit `NO_TEMPLATE`) in the
existing order creation transaction using the server-resolved tier. The pointer
does not enter the commercial review hash, so a template-only replacement does
not force the customer to review unchanged prices again. No historical snapshots
are rewritten. Older orders without export metadata receive `LEGACY_ORDER` and a
canonical snapshot; today's template is never assigned retroactively.

After commit, generation reads only persisted Order/OrderItem values and the pinned
template/configuration. It does not consult Sanity, current prices or the customer's
current tier. A fully mapped copy clears product quantities and controlled formulas,
including shared formula masters/followers, then writes saved SKU, name, packing,
case count and case price. Text is written as literal strings, including formula-like
prefixes. Packing never multiplies prices. Controlled line/subtotal formulas cover
all detected products, including the last. Cached values are computed with BigInt
integer cents, checked against saved totals and verified after XLSX serialization.
Controlled quantity and money cells use integer and two-decimal formats so an
inherited source format cannot hide or mislabel the saved figures.

Automatic shipping/tax/card-fee amounts are cleared. The working total is merchandise
only, excluding unentered adjustments. No source rate, minimum or threshold becomes
a website rule. Every output includes a `Submitted order` sheet with reference,
UTC time, saved company/customer number/email/tier, every line, saved case counts,
prices and totals. Availability/final charges are handled offline; editing a
downloaded workbook does not update the website's saved order.

If any ordered key is absent or ambiguous in the mapping, the entire export is a
complete **snapshot fallback** (`MISSING_MAPPING`). No item is omitted and another
tier's template is never substituted. No-template and legacy fallbacks are also
explicitly labeled. When any amount cannot survive both JavaScript round-trip and
Excel's 15-significant-digit numeric limit, **all monetary values are exact text**
with an explanation. Existing 250-line/999-case/maximum-price limits are unchanged.

One immutable ready artifact is stored per order, with kind, diagnostic code,
checksum, generator version and timestamp. Download GETs serve those bytes only;
they never generate. Database triggers prevent version updates, changing pinned
export inputs and overwriting a ready artifact.

## Notifications and manual recovery

Generation completes outside the order transaction, before the existing staff
Resend request. Its JSON attachment contains a reference-based filename and base64
bytes, never a URL. The existing recipient, sender, secret, plain-text protections,
10-second provider timeout and order-reference idempotency key remain unchanged.
No customer receives a spreadsheet or email. Provider payloads/private cells are
not logged. Submission replay returns the existing reference without generating
or notifying again, including after a lost response.

Generation failure leaves the authoritative order saved. The original plain-text
notification is attempted with a staff follow-up note. Notification acceptance and
export state are tracked separately, including whether the accepted email had an
attachment; a later successful retry does not change that historical fact.

On the admin order detail, use **Generate/retry Excel** for pending/failed exports
or legacy orders. It claims generation atomically. A process interruption leaves a
claim recoverable after **two minutes**; competing requests cannot overwrite the
winner. It reuses pinned inputs, never creates another order, changes templates,
overwrites a ready fallback or resends email. Failed notification delivery remains
manual staff follow-up. There is no queue, unattended retry or unawaited durable
background-work claim. Hosting must allow the bounded subprocess plus database and
provider time; interrupted requests can be recovered using the saved admin order.

Every page/action/admin service/download has a fresh `requireAdmin` check. Admin
draft writes, activation/deactivation and recovery claims call `lockAdminActor`
first in their write transaction. A claim committed before revocation can finish;
later requests cannot create a new claim. File processing/provider I/O never holds
these authorization or order locks.

## Storage and resource limits

Originals, expiring drafts and generated files use private PostgreSQL Bytes behind
`lib/order-sheets/storage.ts`. Normal tier/order list queries and customer DTOs omit
binary fields. No filesystem persistence, Sanity upload or storage provider is used.
Retained files increase database size, WAL/replication traffic and backup/restore
costs: budget up to 2 MiB per retained template and 4 MiB per order, plus SQL/WAL
overhead. Backups contain private wholesale prices and customer data and need the
same access controls as the database. No automatic historical deletion is provided.
Expired drafts are removed on a subsequent successful upload; referenced versions
and ready exports are retained. A future retention/storage migration is separate work.

Central limits in `runtime/limits.mjs`: 2 MiB input, 128 ZIP entries, 8 MiB per
expanded entry and 16 MiB actual total expanded bytes, one worksheet, coordinates
within row 5,000/column 64, 40,000 populated value/formula elements, 150,000 formatted
cells, 4,096-character XML text/cell strings, and 4 MiB generated output.
At most 64 formatting-only column definitions may extend through Excel column
16,384, as in the supplied file; populated cells and ranges still stop at column 64.
ZIP signatures/central and local names/paths/duplicates/CRC/compression flags and
OOXML part allowlists are checked before ExcelJS. Native decompression's
`maxOutputLength` bounds actual expansion independently of ZIP size claims. SAX XML
validation rejects DTD/entities and unsafe content with bounded depth/attributes.
There is no formula interpreter or eval.

Parsing/writing run in a Node subprocess with a 192 MiB JS heap and a 20-second kill
deadline; CPU work cannot outlive an ordinary Promise timeout. Input/output pipes
are bounded and credentials are excluded from the subprocess environment. Two file
processors may run per application process; capacity failure stays recoverable.
Uploads are limited to five per administrator per ten minutes. The Server Action
body ceiling is 2,304 KiB to fit a 2 MiB file plus multipart fields. Framework
Origin/CSRF protections remain enabled with no additional allowed origins.

Runtime dependencies: exact ExcelJS 4.4.0 and saxes 6.0.0; ExcelJS-scoped uuid 11.1.1
override addresses [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
No existing package version changed. ExcelJS uses its in-memory XLSX path; no CSV or
temporary-file writer is invoked. Existing dependency advisories remain a separate
release review. Next externalizes the parser packages and explicitly traces the
runtime worker files. Verify the route `.nft.json` includes the worker and parser
dependencies when changing bundling/hosting; a production `next start` test exercises
the actual subprocess path.

## Local migration and verification

The additive migration is `20260929090000_order_sheets`. It adds template versions,
active pointers (same-tier composite FK and revision), expiring drafts, order exports,
and the notification attachment flag. Existing order data is not backfilled or
repriced. Build generates Prisma types but does not apply migrations.
The initial-bootstrap guard now expects seven reviewed migrations instead of six;
its exact migration names/checksums and target/confirmation safeguards remain intact.

For an explicitly selected disposable/local database only: set `DATABASE_URL` to
that local target, run `npm run db:generate`, then `npm run db:deploy`. Never point
this task's commands at a preview or production database. The repository's
`npm run test:integration` creates its own disposable PostgreSQL cluster, applies
all migrations, seeds fictional records, intercepts mail/catalog traffic, builds
and runs browsers. `node tests/security/run.mjs integration` additionally copies
tracked and nonignored new source into an isolated directory, suppresses private
env loading and blocks unintended outbound traffic. Lint, typecheck and build can
also run through that wrapper. No live migration or deployment is part of this feature.

Fixtures are generated from fictional content in `tests/fixtures/order-sheets.ts`.
Do not commit client workbooks, extracted prices, real generated orders or private
screenshots. See the final verification record below for actual runs.

## Supplied source inspection

The supplied `WHOLESALE LIST 2026 TIER 2 9-11-26.xlsx` was inspected in memory from
the explicitly provided Downloads path. It is 125,167 bytes, one Sheet1, formatted
through A1:Q1539. There are 598 product-like rows and 597 distinct normalized IDs;
the last product is row 631. Row 2 headers and summary labels are detected by the
same runtime parser used by uploads. The source's duplicate at rows **539 and 540**
blocks activation. Staff must correct the identifiers for those distinct products.
The composite ID on row 617 stays intact. Numeric/date packing produces warnings.
No real file, extracted price list or private screenshot was copied into tracked files.

The original subtotal omits row 631 and its weight formula omits later products.
Generated copies replace those calculations under the documented rules and clear
the source tax/card-fee amounts. The only supplied source is Tier 2: Tier 1 remains
a complete snapshot fallback until staff supplies and activates its own template.
No comparison to live catalog/prices or real activation was performed.

An explicitly fictional correction to the duplicate was made **in memory only**
for a generation round-trip test. The corrected copy validated and generated a
populated workbook with fictional saved values in its first/last product rows.
Checks confirmed retained merges/column width/landscape setup, a subtotal including
row 631 with the verified cached result, blank fees, uncalculated weight and the
Submitted order sheet. Neither that corrected copy nor its output was saved. The
real source still needs the client's correct identifier and has not been activated.

## Verification record (2026-09-29)

- `npm run lint`: passed. `npm test`: 400 tests across 18 files passed.
- `node tests/security/run.mjs typecheck`: Prisma generation, Next route types and
  TypeScript passed with fictional configuration and private env loading blocked.
- `node tests/security/run.mjs integration`: all seven migrations applied to the
  disposable local database; 659 unit/integration/security tests across 32 files
  passed. Both production builds passed. Browser passes completed with 29 tests
  in the unconfigured-catalog phase and 26 in the configured phase (50 Chromium
  and 5 Firefox executions total). The first phase intentionally skipped 22 tests
  that require configured catalog content.
- The first sandboxed integration attempt completed its database tests and builds,
  but Firefox failed before navigation with the repository's previously documented
  Windows sandbox launch limitation. The complete isolated harness was rerun
  outside that sandbox and all browser tests passed. Mail and catalog interception,
  private-env exclusion and outbound guards remained enabled.
- `node tests/bootstrap/run.mjs`: 98 disposable-database/bootstrap tests passed,
  together with its lint and typecheck. The new seventh migration is accepted by
  the existing reviewed-migration guard without weakening its checks.
- `node tests/security/run.mjs build`: Prisma generation and the production build
  passed. Route tracing includes the worker, ExcelJS and saxes with no missing
  traced files. Production-path browser tests exercised parsing/generation and
  verified decoded email attachment bytes equal the protected download.
- Fictional preview/order screens were visually inspected at 390, 768 and 1,440 px;
  responsive checks found no horizontal overflow. The final visual adjustment
  separates the original-template link from the saved-export download.
- A final focused run of the same isolated harness passed 36 order-sheet
  unit/integration tests, the configured production build (including TypeScript)
  and both staff browser workflows. All six fresh responsive screenshots were
  inspected. A subsequent archive-signature guard passed the 12 focused unit
  cases and the real-source in-memory compatibility round-trip.
- `git diff --check` passed. Dependency review found no changed versions of existing
  packages and no advisory on newly added dependency paths. The existing audit
  baseline remains 19 findings (10 moderate, 9 high), outside this feature's scope.

Coverage includes exact-money text fallback, malformed/unsafe archives, the actual
source's layout through fictional fixtures, duplicate/composite identifiers, stale
and concurrent activation, revocation, tier isolation, immutable old exports during
catalog outage, legacy/no-template/missing-mapping fallbacks, concurrent/replayed
submission, failed generation/email, interrupted claims and retry without mail.
Source compatibility checks above used the real supplied workbook in memory;
automated regression data and captured attachments were fictional. No live data,
production configuration, remote migration, real email or deployment was changed.
