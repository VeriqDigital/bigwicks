# Catalog onboarding — Milestone 5A

Milestones 1 through 4A are complete and merged per the user. These are operator
tools, not application endpoints. No real client spreadsheet, column mapping,
product data, images or currency/unit semantics have been supplied. This milestone
defines an internal contract; map the client's actual columns deliberately later.
No remote writes or deployment were performed during implementation.

## Canonical file

Use comma-separated UTF-8 CSV, with exactly these unique headers (order may vary):

```csv
catalogKey,sku,name,category,description,available,tier1Price,tier2Price
```

| Field | Contract |
| --- | --- |
| catalogKey | Permanent canonical lowercase UUIDv4. Blank only when preparing initially. Never derive it from SKU/name or regenerate it on edits. |
| sku | Required, trimmed, at most 100 characters. Duplicate case/Unicode-normalized SKUs are errors, not identity matches. |
| name | Required, trimmed, at most 200 characters. Editable content. |
| category | Required name, at most 100 characters. Trim/collapse whitespace; category identity uses NFKC Unicode normalization and lowercase. |
| description | Optional plain text, at most 10,000 characters. Line endings normalize to LF; multiline quoted CSV is supported. |
| available | Explicit `true` or `false`, case-insensitive with outer whitespace trimmed. Blank, yes/no, numbers and stock inference are rejected. |
| tier1Price / tier2Price | Independent exact decimal text using existing `priceText()` rules, normalized to two decimals. Blank means no price. No symbols, negatives, exponents, excess scale or values above 9999999999.99. |

Human text is normalized to NFC. NUL/control characters and bidi overrides are
rejected; only description permits tabs/newlines. SKU/name/category are single-line.
Limits: 2 MiB source, 500 product rows, 12,000 characters per CSV record. Invalid
UTF-8, malformed quoting, unequal columns, repeated/missing/unknown headers,
duplicate identities and missing required content reject the entire file.
Errors identify logical CSV record number and field, never raw values. Up to 25
errors print per run. Warning counts indicate available products missing either
tier price; those customers will not see them until prices exist.

Generated CSV quotes fields and uses existing `spreadsheetText()` protection.
Canonical human-text cells accept a leading apostrophe as a formula escape when
the remainder would need escaping. A literal leading apostrophe must be doubled
where it would otherwise be interpreted as that escape. This is a canonical CSV
convention, not an inferred client spreadsheet convention. The writer/reader
round-trip these escapes without adding apostrophes to Sanity content. Preserve
UUIDs and exact text if editing files in spreadsheet software.

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
   catalogKey,sku,productName,category,available,tier1Price,tier2Price
   ```

   This reuses the existing pricing exporter/parser and exact-money utility.
   No ProductPrice mutation, database connection or alternate pricing importer
   exists in the onboarding tools. Blank prices mean no price/removal through the
   existing acknowledged workflow, never zero. Omitted products remain unchanged.
7. Re-run the audit and verify the customer catalog for both tiers. Images are
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

Local verification on 2026-09-07 passed lint, typecheck, 194 unit tests (including
43 onboarding checks), 110 isolated database tests, 34 Playwright scenarios
(29 Chromium, 5 Firefox), and the production build. The fictional prepare and
offline dry-run commands passed. Generated/source working paths are ignored,
the diff is clean, and application/domain code and dependencies are unchanged.
Sanity mutation tests exclude prices; the production client bundles contain
neither `SANITY_API_WRITE_TOKEN` nor the fictional token marker used for the scan.
No remote apply, remote database changes or deployment was performed.

Deferred: actual spreadsheet mapping, real data import, customer onboarding,
images, live remote apply verification, deletion, taxonomy redesign, inventory,
payments, deployments and changes to customer ordering.
