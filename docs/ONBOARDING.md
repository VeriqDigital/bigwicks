# Catalog and customer onboarding

Milestones through 5A.2 are complete and merged per the user. Milestone 5B adds
the separate [customer import and invitation workflow](#customer-onboarding--milestone-5b)
below. Catalog mapping behavior is unchanged by 5B.

Milestones through 5A are complete and merged per the user. These are operator
tools, not application endpoints. The real BoxHero XLSX was inspected read-only
for 5A.1; no real source or product rows are committed. Customers order complete
cases. Selling Price is the Tier 2 case price; Unit Cost is confidential internal
case cost. Item Number supplies the customer-facing SKU, never permanent identity.
Currency and Tier 1 source still need confirmation. No remote writes or deployment
were performed during the 5A.1 implementation task; subsequent onboarding is recorded below.

## Current status

User-confirmed state following the Milestone 5B implementation, before PR #13 merge:

- **Non-production Sanity:** project `sim96pgy`, dataset `development` contains
  302 real Big Wicks products and 17 real categories. Catalog import verification
  returned **302 unchanged / 0 new / 0 updates / 0 errors**.
- **Preview Postgres:** 280 real Tier 2 ProductPrice rows are imported;
  22 Tier 2 prices remain unresolved/blank. Tier 1 has 0 prices and awaits the
  client source. No replacement prices are derived.
- **Content readiness:** all 302 imported products remain `available=false`.
  Descriptions and images remain missing.
- **Production:** no Sanity catalog import or Postgres pricing import has been performed.
- **Customers:** no real customer import has been performed and no real customer
  invitations have been sent.

The verification records below describe earlier implementation tasks, not this
subsequent non-production onboarding. This status correction records the user's
report; it performs no remote verification or writes.

## Canonical file

Use comma-separated UTF-8 CSV, with these content headers and dynamic tier columns (order may vary; example for the initial tiers):

```csv
catalogKey,sku,name,category,brand,packing,description,available,price:1:Tier 1,price:2:Tier 2
```

| Field | Contract |
| --- | --- |
| catalogKey | Permanent canonical lowercase UUIDv4. Blank only when preparing initially. Never derive it from SKU/name or regenerate it on edits. |
| sku | Required, trimmed, at most 100 characters. Duplicate case/Unicode-normalized SKUs are errors, not identity matches. |
| name | Required, trimmed, at most 200 characters. Editable content. |
| category | Required name, at most 100 characters. Trim/collapse whitespace; category identity uses NFKC Unicode normalization and lowercase. |
| brand / packing | Optional plain single-line text, at most 100 characters each. Packing describes one case; preserve notation without arithmetic. |
| description | Optional plain text, at most 10,000 characters. Line endings normalize to LF; multiline quoted CSV is supported. |
| available | Explicit `true` or `false`, case-insensitive with outer whitespace trimmed. Blank, yes/no, numbers and stock inference are rejected. |
| price:rank:name columns | Independent exact decimal text using existing `priceText()` rules, normalized to two decimals. Blank means no price. No symbols, negatives, exponents, excess scale or values above 9999999999.99. |

Human text is normalized to NFC. NUL/control characters and bidi overrides are
rejected; only description permits tabs/newlines. SKU/name/category/brand/packing are single-line.
Limits: 2 MiB source, 500 product rows, 12,000 characters per CSV record. Invalid
UTF-8, malformed quoting, unequal columns, repeated/missing/unknown headers,
duplicate identities and missing required content reject the entire file.
Errors identify logical CSV record number and field, never raw values. Up to 25
errors print per run. Warning counts indicate available products missing any configured
tier price; those customers will not see them until prices exist.

Generated CSV quotes fields and uses existing `spreadsheetText()` protection.
Canonical human-text cells accept a leading apostrophe as a formula escape when
the remainder would need escaping. A literal leading apostrophe must be doubled
where it would otherwise be interpreted as that escape. This is a canonical CSV
convention, not an inferred client spreadsheet convention. The writer/reader
round-trip these escapes without adding apostrophes to Sanity content. Preserve
UUIDs and exact text if editing files in spreadsheet software.


## BoxHero mapping before preparation

Use `catalog:map-boxhero` for the received ten-column BoxHero structure:
SKU, Item Name, Unit Cost, Selling Price, Packing, Type, Brand, Item Number,
Quantity, Qty(Warehouse). This is a file mapper, not a live BoxHero integration.

Direct XLSX support uses pinned development dependencies `read-excel-file@9.3.10`
and `fflate@0.8.3`. In Milestone 5A.2, numeric XLSX cells in Selling Price,
Quantity and Qty(Warehouse) are normalized through `Number(raw)` then
`String(number)` before mapper validation. This uses the ordinary shortest numeric
representation, not fixed-decimal rounding: `75.489999999999995` becomes `75.49`,
while `1.001` remains invalid as a price. Text cells and CSV values are not
numeric-coerced; numeric identifier cells retain raw text without guessed formatting
or lost integer precision. CatalogKey remains identity. The ZIP dependency provides archive preflight.
They are imported only by operator code. The reader runs in a credential-free
subprocess with a 128 MiB JS heap and 15-second deadline. Input is bounded to
2 MiB, 64 ZIP entries, 4 MiB per expanded entry and 8 MiB total expansion. Require
exactly one sheet named BoxHero, at most 500 rows/10 columns, and no formulas,
DTD/entity declarations or oversized sparse cell coordinates. Parser errors never
dump source contents. CSV UTF-8 with the same headers is also supported.
See the [reader documentation](https://github.com/catamphetamine/read-excel-file)
for the numeric parsing API. The XLSX subprocess discards Unit Cost and BoxHero
SKU before returning data; neither field participates in canonical mapping.

Create an ignored operator JSON configuration. Start from the intended environment's
current PricingTier ranks/names (check its admin export), not guessed tier definitions:

```json
{
  "tiers": [{ "rank": 1, "name": "Tier 1" }, { "rank": 2, "name": "Tier 2" }],
  "categories": {},
  "rows": []
}
```

```text
npm run catalog:map-boxhero -- data/onboarding/source.xlsx data/onboarding/mapping.json
```

Mapping is dry-run by default and never opens Sanity or PostgreSQL. It prints a
source hash, plan hash, counts and logical source row numbers with issue codes;
no names, source IDs, costs or price lists. It maps Item Name/name, Item Number/sku,
Type/category, Brand/brand, Packing/packing, and Selling Price/rank 2 case price.
All other tiers stay blank. Available is always false, regardless of positive,
zero, negative or mismatched inventory. Visibility is approved separately later.
Zero BoxHero selling prices mean unresolved customer pricing: Tier 2 stays blank
and the mapper emits `zero_selling_price`. Acknowledging that warning allows the
row to proceed unpriced, never with `0.00`. Supply a positive explicit
`sellingPrice` row override, exclude the row, or acknowledge that it remains
unpriced. This source-specific rule does not change the shared ProductPrice rule
allowing explicit zero elsewhere. Malformed/excess-scale prices block the row.
No rounding, discount, margin, cost or packing-based price formula exists.

Every source Type should be reviewed. `categories` maps exact source labels to
approved display text; mapping a label to itself explicitly approves retaining it.
Unmapped labels remain intact and produce an unacknowledged warning. No proposed
500G/500 Gram or similar cleanup is built in.

Missing item numbers/categories and duplicate normalized item numbers block rows.
Duplicate names, missing brand/packing, zero price, negative/mismatched inventory,
unmapped categories and suspected operational names require review. The mapper
does not merge or silently exclude any record. Fix source data or add explicit
row decisions bound to `sourceHash` from that exact file. A decision can supply
sku/name/category/brand/packing/sellingPrice, acknowledge warning codes, or exclude
the row with a nonempty reason. Example with fictional values:

```json
{
  "row": 2,
  "sku": "FICTIONAL-CORRECTION",
  "acknowledge": ["missing_brand", "missing_packing"]
}
```

Put decisions in the configuration's `rows` array and the exact `sourceHash`
at the top level. An exclusion is `{"row":3,"exclude":"Reviewed operational record"}`.
Line numbers are for this source review only, never product identity. Altering the
workbook invalidates row decisions; altering either file changes the reviewed plan.
The SHA-256 `planHash` binds the source hash, validated review configuration and
actual derived plan: every candidate's canonical content and tier prices,
exclusions, acknowledgements, warnings and errors. The domain is
`big-wicks/boxhero-mapping/v2`; source row order and issue order are deterministic,
with no timestamps or generated identities. Mapper output changes invalidate old
reviews even when source and configuration are unchanged. Private prices are
hashed internally, never printed. Unit Cost and BoxHero SKU are absent from the
derived plan; changing any original file bytes still changes its opaque source hash.
`--write` requires the exact current plan hash and all existing review checks;
run a fresh dry-run after upgrading the mapper before writing.
When all included rows validate and every warning is acknowledged, review again:

```text
npm run catalog:map-boxhero -- data/onboarding/source.xlsx data/onboarding/mapping.json --write data/onboarding/mapped.csv --reviewed PLAN_HASH
npm run catalog:prepare -- data/onboarding/mapped.csv data/onboarding/resolved.csv
```

Mapping writes only a canonical candidate with blank keys; prepare assigns UUIDs
and creates the pricing CSV using the existing 5A workflow. Both commands refuse
overwrites. Never re-map a later BoxHero export as an update with new blank keys:
reconcile against the preserved resolved catalogKey mapping explicitly first.
The mapper never matches existing products by BoxHero SKU, item number or row.

Read-only inspection of the received workbook found 311 rows, 7 missing item
numbers, 5 missing categories, 7 missing brands, 7 missing packing values,
29 zero selling prices, 13 negative inventory rows, 3 duplicate item-number groups
(6 rows), 3 duplicate-name groups (6 rows), and no warehouse quantity mismatches.
The original raw-text mapper also reported 14 `invalid_selling_price` false
positives caused by XLSX floating storage artifacts, confirmed by the user's
investigation. Milestone 5A.2 corrects that interpretation with numeric parsing;
these are not established source pricing errors. Four suspected operational
records also required review, and categories had not yet been approved/normalized
at that inspection. These historical diagnostics are not decisions to delete,
merge, round or publish products; see [current status](#current-status) for the
subsequent onboarding outcome.

## Dynamic tier contract

Price columns are `price:<positive rank>:<exact current name>`, e.g.
`price:1:Tier 1` and `price:2:Tier 2`; future configured tiers add columns.
All CSV headers are quoted on output, including names containing commas. Tier 1
is cheapest; higher ranks represent progressively more expensive groups. Each
product's prices remain independently supplied; no automatic derivation or
cross-tier numeric ordering rule is imposed by this import tool.

Offline canonical preparation validates column syntax/uniqueness but never defines
database tiers. The ADMIN importer resolves every column against current SQL tiers,
requires every configured column exactly once and rejects unknown, omitted,
duplicate, renamed or reordered-rank definitions. A name/rank/ID change after
preview invalidates confirmation. Export again after tier configuration changes;
old `tier1Price`/`tier2Price` files are rejected, not silently reinterpreted.
Earlier eight-column resolved files must be deliberately converted with their
existing catalogKeys preserved, adding blank brand/packing and new price headers.
Keep a backup and prepare into a new filename. Brand/packing blanks intentionally
clear those fields on import; omitted products and existing images are preserved.
Pricing previews are capped at 512,000 token characters; split unusually large
files across product rows if the bounded preview cannot be generated.

## Workflow

1. Map the actual client spreadsheet into this contract. Preserve any already
   assigned catalogKeys. Do not treat a new export with blank keys as an update.
   Keep real source files and generated artifacts in ignored `data/onboarding/`.
2. Prepare locally (PowerShell can use `npm.cmd`):

   ```text
   npm run catalog:prepare -- data/onboarding/mapped.csv data/onboarding/resolved.csv
   ```

   This makes **no network calls**, validates all rows, generates random UUIDv4
   keys only where blank, and validates both outputs before writing. Supplied
   valid keys are preserved. Outputs are `resolved.csv` and
   `resolved.pricing.csv`. Existing files are never overwritten. Use a new simple
   filename directly inside `data/onboarding/` on each preparation. Symlink/junction
   output directories and public/arbitrary output locations are rejected.

   The resolved file is the permanent identity mapping. Re-preparing it preserves
   identities and content. Re-preparing the original blank-key file creates new
   identities and is **not** an update workflow; SKU collision checks help reject
   accidental import of those new identities into an existing catalog.

3. Review counts, missing-price warnings, identities and content in the resolved
   file. Its prices are private operator data. The pricing output must also fit
   the existing 256 KiB/500-row/4,096-character pricing contract or preparation
   fails before writing. Keep a secure backup of the identity mapping.
4. With separate authorization for the intended environment, configure a
   dataset-scoped CLI token and run an online dry-run:

   ```text
   npm run catalog:import -- data/onboarding/resolved.csv --project PROJECT --dataset DATASET
   ```

   Project and dataset must be supplied explicitly; there is no implicit fallback
   to the website's configured target. Default mode reads only. It prints the
   exact target, whether production safeguards apply, counts and a plan hash.
   It never prints full rows or prices. Inspect the resolved file and plan together.

   After review, apply that exact plan:

   ```text
   npm run catalog:import -- data/onboarding/resolved.csv --project PROJECT --dataset DATASET --apply REVIEWED_PLAN_HASH --confirm PROJECT/DATASET
   ```

   Apply requires existing UUIDs and never generates product identity. It reads
   current content again, rebuilds the complete plan, and rejects a changed file,
   target or remote revision before writing. The hash binds content and remote
   revisions, not private prices, which this command never imports.
5. Run the existing `npm run catalog:audit` with its Sanity and PostgreSQL
   environment deliberately aligned to the same target. Missing-price findings
   are expected until the pricing step; resolve identity/content errors first.
6. Sign in as ADMIN to the corresponding environment. Upload
   `resolved.pricing.csv` at `/admin/pricing`, review warnings/changes, acknowledge
   removals when needed and explicitly confirm. The exact output headers are:

   ```csv
   catalogKey,sku,productName,category,available,price:1:Tier 1,price:2:Tier 2
   ```

   This reuses the existing pricing exporter/parser and exact-money utility.
   No ProductPrice mutation, database connection or alternate pricing importer
   exists in the onboarding tools. Blank prices mean no price/removal through the
   existing acknowledged workflow, never zero. Omitted products remain unchanged.
7. Re-run the audit and verify the customer catalog for every configured tier. Images are
   optional here: new products have none, and updates preserve existing images.
   Image onboarding depends on the client's eventual source and is deferred.

Later production imports repeat this process intentionally, with separate
authorization, production-specific review, token permissions and backups.

## Environment safeguards

Server/CLI-only settings, never `NEXT_PUBLIC`:

- `SANITY_API_WRITE_TOKEN`: needed for remote dry-run and apply so the raw read can
  see drafts/releases as well as published content. Scope access to the intended
  dataset and ensure full read access to product/category identities. Prefer a
  read-only credential for planning and a write credential only during apply.
- `SANITY_CATALOG_NON_PRODUCTION_TARGET`: an explicitly verified `project/dataset`
  pair. Empty by default, so **every target is production-guarded**. Do not label a
  production dataset as non-production. Names alone cannot establish environment
  intent; no hardcoded development/production dataset-name guess is made.
- `ALLOW_PRODUCTION_CATALOG_IMPORT`: false by default. A production-guarded apply
  additionally needs this set to exactly `true` **and** the `--allow-production`
  flag, along with the reviewed hash and exact target confirmation above.

The CLI loads `.env.local`, then `.env`, without overriding process settings. It
does not modify Vercel settings or write credentials anywhere. Preparation and
offline dry-run do not load these files. CLI modules are outside application code
and marked server-only. Never place real artifacts in `public/`, tests or commits;
gitignore is a guardrail, not protection against an intentional force-add. Local
filesystem access/backup permissions remain the operator's responsibility.

## Content identity and transaction limits

The full bounded raw product/category snapshot is read from the Sanity origin
(no CDN). More than 1,500 existing or projected documents, malformed identities/revisions, duplicate
catalogKeys, ambiguous normalized categories, or any product/category drafts or
release versions block all writes. Resolve drafts/releases before onboarding so
a later publish cannot silently overwrite imported content. Published document
IDs remain unchanged. Products match **only** catalogKey. SKU/name changes are
ordinary updates. New-key collisions with another product's normalized SKU fail
instead of silently duplicating or matching that record. Nothing is deleted.

Category names lack a catalogKey. Initial matching uses trimmed, whitespace-
collapsed, NFKC-normalized lowercase names. One unambiguous category is reused;
missing categories are planned once. New category display spelling is selected
deterministically from the file. Existing spelling is preserved. Category renames
are not inferred from old names; they may create a new category and reassign
imported products while leaving omitted products unchanged.

Following Sanity's ID guidance, ordinary new document `_id` values are generated
by Sanity, not from catalogKey/SKU/name. Relationships use actual returned IDs.
After validating the entire plan and a conservative 3 MiB mutation budget:

1. If categories are missing, create all of them in one atomic transaction.
2. Re-read and verify the snapshot matches the prior documents plus the returned
   categories. Drift stops before any product writes.
3. Create/update all changed products in one atomic transaction, guarding existing
   product and reused-category revisions. Only allowed product content fields are
   sent. Existing images and unrelated fields are preserved. No prices are sent.

There is no chunk loop leaving partially updated products. Category creation and
the product transaction are separate: a failure can leave unused new categories,
but not half of the product transaction. Sanity's [transaction and consistency
documentation](https://www.sanity.io/docs/content-lake/transactions) explains atomic
mutations, eventual query consistency and revision preconditions. Commits use
`visibility: "sync"`; no automatic network retries are enabled.

**Run a single operator and pause concurrent catalog edits/imports.** Sanity does
not enforce uniqueness on catalogKey/category-name fields. Revision guards protect
existing documents, but another writer can create a colliding identity between a
query and commit. This tool does not claim a distributed lock or cross-system
transaction. After timeouts/uncertain commits, inspect the target and run a fresh
dry-run/audit before retrying. Successful reruns reuse identities and unchanged
content performs no writes; do not reuse an old plan hash after remote changes.

Artifact creation validates both outputs and removes its newly created files if
writing fails. It never overwrites existing files. OS/process interruption between
the two file writes can leave one output: preserve the resolved identity file and
prepare it again to new filenames rather than generating keys from the original.

## Isolated verification

Milestone 5A.1 local verification: 210 unit tests, 114 isolated database tests,
all six migrations on a fresh isolated database, and 35 Playwright scenarios
(30 Chromium, 5 Firefox). Lint, Prisma generation, typecheck and production build
passed. Reviewed phone/tablet/desktop catalog, order-review and pricing screenshots.
The fictional map → prepare → offline import dry-run passed. Source/artifact paths
are ignored and no XLSX is tracked. Client bundle scans found no CLI parser,
write-token marker or fictional internal-cost marker. Mutation/artifact/customer
DTO tests exclude internal cost, and Sanity mutations exclude private prices.
The real workbook was inspected in memory only; no remote writes or deployment.
Dependency audit reports 15 advisories in existing stack packages (6 moderate,
9 high), none in the added XLSX/ZIP parser packages. No unrelated dependency
upgrades were made.

```text
npm run catalog:prepare -- tests/fixtures/onboarding.csv data/onboarding/fictional-resolved.csv
npm run catalog:import -- data/onboarding/fictional-resolved.csv --project testonly --dataset test --snapshot tests/fixtures/onboarding-empty.json
```

`--snapshot` is explicitly **offline dry-run only** and is rejected with `--apply`.
The sample is fictional, never a client catalog. Tests use an in-memory Sanity
boundary and CLI subprocesses with networking disabled. They cover validation,
privacy, category/product planning, revision failures, zero-write rejection,
safe reruns, output preservation and production safeguards. No live Sanity project
or PostgreSQL database is required by these tests.

Previous Milestone 5A verification on 2026-09-07 passed lint, typecheck, 194 unit tests (including
43 onboarding checks), 110 isolated database tests, 34 Playwright scenarios
(29 Chromium, 5 Firefox), and the production build. The fictional prepare and
offline dry-run commands passed. Generated/source working paths are ignored,
the diff is clean, and application/domain code and dependencies are unchanged.
Sanity mutation tests exclude prices; the production client bundles contain
neither `SANITY_API_WRITE_TOKEN` nor the fictional token marker used for the scan.
No remote apply, remote database changes or deployment was performed during that
Milestone 5A verification task.

Currently pending: production catalog/pricing imports, the 22 unresolved Tier 2
prices, the Tier 1 client source, descriptions/images, real customer imports and
real invitations. Non-production catalog/pricing onboarding is recorded in
[current status](#current-status). Deletion, taxonomy redesign, inventory,
payments, deployments and changes to customer ordering remain outside this tooling's scope.

## Customer onboarding — Milestone 5B

ADMIN-only `/admin/customers/import` creates new wholesale accounts from CSV.
Download the header-only UTF-8 template from that page. Canonical columns:

```csv
companyName,customerNumber,email,pricingTier,active
Fictional Fireworks LLC,FF-001,buyer@example.test,Tier 1,true
Demo Retail Group,DR-002,orders@example.test,Tier 2,false
```

All five fields are required. Company names trim using individual creation's
200-character limit. Customer numbers trim, remain case-sensitive, and use the
existing 100-character limit; never invent missing numbers. Emails use the existing
trim/lowercase/auth email validator and 254-character limit. Tier names trim and
must match exactly one current database name, case-sensitively. IDs and roles are
never accepted from the file. Future configured tiers work without code changes.
Active accepts exactly `true` or `false`. Maximum 128 KiB, 250 data rows and 2,048
characters per record; UTF-8, comma-separated with normal CSV quoting. Field
limits also bound raw input. Inappropriate controls/bidi overrides are rejected.
No password, hash, token, sessionVersion or other extra columns are allowed.

Duplicate normalized emails/customer numbers within the file, collisions with
any existing User (including ADMIN) or Customer, invalid fields, and unknown tiers
block the whole batch. This is **create-only**: matching existing data never
authorizes an update. Use individual customer management for edits. Preview shows
row/field errors, proposed recipients and counts; it performs no database writes.
The only CSV download is the header-only template, so no customer text is exported
as spreadsheet formulas. Preview text is rendered as escaped React text.

Confirmation requires a checked acknowledgement and an AES-256-GCM preview sealed
with a separate domain and existing AUTH_SECRET. It binds normalized rows, the
current ADMIN/sessionVersion, a ten-minute expiry and a deterministic snapshot of
current tiers plus user/customer identities, account/business state and update timestamps. Changes to any
user/customer or tier require a fresh preview. Snapshot reads fail closed above
5,000 users/customers. All creation occurs in one SERIALIZABLE transaction with
an in-transaction ADMIN recheck/lock, fresh snapshot and tier resolution. It uses
the shared individual-creation primitive. Unique constraints and serialization
failures roll back the entire batch. Successful replay fails on changed state;
concurrent confirmation creates at most one batch. A lost response requires
checking the customer list before re-uploading, never assuming nothing committed.

New User records always have CUSTOMER role, null passwordHash and default
sessionVersion 0. User.active and Customer.active agree. **No invitations or
AccountTokens are created during import.** The result explicitly reports accounts,
tiers, active/inactive counts and zero invitations.

### Separate invitation operation

`/admin/customers/invitations` lists active CUSTOMER accounts with active Customer
records and null password hashes. Nothing is preselected. Select up to **25** per
batch, review company/customer number/email, then explicitly confirm sending.
Existing accepted setup links are indicated; resending supersedes older links.
Disabled accounts may still be invited individually under the existing policy,
but are intentionally excluded from bulk invitations. The list is capped at 500;
use individual management for accounts outside that list.

An encrypted ten-minute recipient preview binds admin/session, selected IDs and
current recipient/token state. Before sending, the service rechecks the snapshot,
claims a one-use preview bucket atomically across instances, and re-resolves admin
and recipient state for every send. Changed/ineligible recipients fail closed.
Milestone 6D adds an atomic claim of the reviewed setup-token state under the
existing User lock. The server fingerprint includes user/customer identity,
email, role, password-set state, both active flags, sessionVersion and the latest
setup token's identity/lifecycle (or explicit no-token state). The bulk snapshot
binds this projection; each recipient must still match it when issuance takes the
lock, even after earlier recipients have sent. Only the winner can supersede/create
a token and attempt email. Competing distinct previews and overlapping individual
sends return stale/not-attempted results instead of replacing the winner's link.
An individual action reviews current state server-side without a new review screen.
Existing AccountToken and Resend delivery semantics apply:
raw tokens never enter staff UI/logs, and deliveredAt means provider acceptance,
not inbox delivery. Results distinguish acceptance, account changed/not attempted,
quota or ineligibility/not attempted, and acceptance not confirmed. Refresh and
review changed accounts before retrying; a fresh intentional resend still works.
Failed sends remain unusable, including when cleanup cannot be recorded; a fresh
review can retry within quota. Earlier links may already have been superseded.

Sends are sequential with 600 ms between attempts, at most 100 bulk attempts/hour
globally, sharing the existing 3-per-customer/15-minute bucket with individual
invitations. The existing individual global cap remains 30/hour. After comparing
reviewed state and eligibility under the lock, issuance consumes the channel-global
bucket, then the shared per-customer bucket, then creates the token in the same
transaction. Stale losers spend no send quota. A global admission remains spent
if the recipient is capped, so repeated capped requests remain bounded; this can
underutilize global allowance. Provider failure does not refund committed quotas.
SQL insertion failure rolls back quota and token changes. Limits use
PostgreSQL, not browser headers or in-memory counters. No background job or automatic
retry exists. The page requests a 300-second action duration; verify deployment
platform support before live use. After interruption, refresh, inspect accepted
link status, and explicitly review any retry; the original preview cannot replay.
Accounts are retained regardless of email outcome. Smaller batches reduce timeout
risk. Real delivery and hosting limits remain separately verified operational work.

Provider I/O is outside every SQL transaction. Delivery marking/failed-token cleanup
use short User-locked transactions. Only a still-current valid token can be marked
delivered. A fresh action can review a newly committed token and intentionally
resend while its previous provider call is in flight; the earlier email cannot be
recalled and may contain a superseded link. Account changes after the claim have
the same external boundary. This is not exactly-once delivery or an SQL/Resend
distributed transaction. No migration is needed. See the [REL-01 design, regression
evidence and limitations](SECURITY-REMEDIATION.md#milestone-6d-invitation-concurrency--rel-01).
SEC-04 remains open; dependency and deployment gates are separate.

### Initial customer onboarding steps

1. With separate authorization for the target environment, obtain the real customer
   list and current tier names. Keep real CSVs untracked and outside public assets.
2. Fill the downloaded template, explicitly choosing active state and matching
   exact current tier names. About 50 customers fit one import batch.
3. Upload, resolve all errors, review every proposed identity/tier, and confirm.
4. Verify the created customer list and the result showing no invitations sent.
5. Separately select/review/confirm invitations in batches of up to 25. Check each
   result; handle unconfirmed sends through a fresh review. Customers choose their
   own passwords via existing setup links.

No new environment variables, dependencies, schema changes or migrations. Tests
use fictional fixtures and isolated PostgreSQL; email is mocked/intercepted at the
transport boundary. This implementation task does not import real customers, send
real email, mutate remote data, change deployment settings or deploy. Bulk updates,
deletion, automatic invitation blasts and public registration remain excluded.

Milestone 5B verification: lint, typecheck/Prisma generation, 269 unit tests,
133 isolated database tests and 39 Playwright executions (34 Chromium, 5 Firefox)
passed. All six existing migrations applied to a fresh isolated database. Both
configured and unconfigured production builds passed. The new browser flows run
in both catalog modes, including fictional 50-customer imports and a future tier,
no-mail import assertions, direct unauthorized action replay, and invitation
failure/retry. Phone/tablet/desktop previews were inspected at 390/768/1440px.
Email remained mocked/intercepted; no remote writes or real customer imports ran.
