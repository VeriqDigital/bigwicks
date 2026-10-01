# Public catalog — PR #32 corrections

No production content, prices, accounts, orders or templates were changed. Public routes remain `/products` and `/products/[slug]`.

## Independent visibility and rollout default

`available` retains its original **Visible in wholesale catalog** meaning. It alone controls wholesale visibility/order eligibility, with a valid saved price for the customer's tier still required. Public visibility does not alter ordering.

New Sanity boolean `publiclyVisible` controls public catalog listings, detail pages, homepage category discovery and sitemap entries:

| Publicly visible | Wholesale available | Public website | Wholesale portal with valid tier price |
| --- | --- | --- | --- |
| true | true | Listed and accessible | Listed and orderable |
| true | false | Listed and accessible | Excluded |
| false | true | Excluded; detail fails closed | Listed and orderable; no public-detail link |
| false | false | Excluded; detail fails closed | Excluded |

**Rollout default:** existing published products with a missing/null public flag remain publicly visible, independently of `available`. This avoids an empty legacy catalog without a mandatory backfill or production write. Explicit `false` hides content; malformed non-boolean values fail closed. New Studio products start with both flags explicitly `false`. Studio requires an explicit public choice when publishing edits to legacy documents.

Legacy wholesale-unavailable products can therefore appear publicly. Staff should review published products and explicitly hide anything unsuitable for the public website. API/import writers should explicitly set the new field for new content; omission uses the legacy compatibility default. No importer was changed or executed, no Excel-only products were created, and no SQL migration is required.

## Curated homepage cards

All eight curated images, labels, descriptions and crops remain in `data/fireworks.ts`. Product images are never used as category-card artwork.

Sanity categories now have an optional `homepageCard` selector with options sourced from those existing eight cards. Staff assign each card to one real category. The homepage resolves the actual category document ID from eligible public products and links to `/products?category=<id>`. Renaming a category preserves its mapping; the other categories remain available in the catalog filter.

Unmapped cards, categories without eligible public products and ambiguous mappings link to `/products` with a “Browse catalog” label. There is no guessed name matching or duplicated 17-category taxonomy. Staff must configure this small mapping to enable filtered homepage links.

## Packing, pricing and canonical links

The public DTO explicitly excludes `packing`, wholesale availability/control fields and all prices. Anonymous HTML, Flight, metadata and sitemap never receive packing. Product details show case packing only from the existing authorized customer catalog result. Products absent from that result do not show packing on their detail page, even to a customer.

Sanity's existing content dataset is public: this removes packing from anonymous website responses, not direct Sanity dataset queries. Sensitive prices remain exclusively in PostgreSQL.

Anonymous requests never call the price service or read `ProductPrice`. Approved customers use the existing independently authorized zero-input service, which resolves their current saved SQL tier and selects only that tier. Query strings cannot select a tier. Product responses remain dynamic/private/no-store; there is no shared price cache or new API. Metadata/sitemap use only the public content service, with no price/Offer JSON-LD.

Canonical links were possible without additional reads. New pure server helper `publicCatalogProducts` is the shared public eligibility, slug collision and projection resolver for both public and customer services. The customer DTO receives a canonical public `slug`, or `null` when no public page is eligible. Portal links use it directly, opening a separate tab to preserve quantities.

Missing slugs retain catalog-key URLs; old key bookmarks redirect to the canonical slug when configured. Explicitly invalid/duplicate slugs, hidden content and another product's key used as a slug fail closed, including through key aliases. Public slug problems do not prevent wholesale ordering. Keep published custom slugs stable; old custom-slug history is outside scope.

Videos retain the normalized YouTube/Vimeo allowlist, fixed HTTPS embeds, descriptive titles, lazy loading and sandboxing. No arbitrary HTML, autoplay, hosting/transcoding, new dependencies or new environment variables.

## Exact correction files

- `app/products/[slug]/page.tsx`
- `components/catalog/Catalog.tsx`
- `components/sections/CategorySection.tsx`
- `data/fireworks.ts`
- `lib/catalog/content.ts`
- `lib/catalog/normalize.ts`
- `lib/catalog/public.ts`
- `lib/catalog/public-products.ts` (new)
- `lib/catalog/homepage-categories.ts` (new)
- `lib/catalog/service.ts`
- `sanity/schemaTypes/product.ts`
- `sanity/schemaTypes/category.ts`
- `tests/unit/catalog-schema.test.ts`
- `tests/unit/public-catalog.test.ts`
- `tests/integration/catalog.test.ts`
- `tests/e2e/public-catalog.spec.ts`
- `docs/DECISIONS.md`
- `docs/PUBLIC-CATALOG.md`

Pricing authorization/query logic, order services, snapshots, replay handling, Excel template pinning/generation/downloads and mail behavior are unchanged.

## Validation against corrected implementation

Runs use existing sanitized isolated runners, fictional Sanity fixtures, disposable local PostgreSQL and intercepted email. No old build was reused.

- `node tests/security/run.mjs unit`: **453 passed**.
- `node tests/security/run.mjs lint`: **passed**.
- `node tests/security/run.mjs typecheck`: **passed**, including Prisma generation, Next route generation and `tsc --noEmit --incremental false`.
- `node tests/security/run.mjs integration`: **729 unit/database/security tests passed across 34 files** (includes the 453 unit tests above). Both unconfigured and fictional-Sanity-configured production builds passed. Unconfigured browser phase: **29 passed, 32 skipped** because catalog fixtures were not enabled in that phase. Configured browser phase: **31 Chromium passed, 5 Firefox setup failures**; the overall command exited **1** for those Firefox failures.
- All **9 public catalog browser tests passed**, including anonymous HTML/Flight, Tier 1/Tier 2 isolation and tampering, all four visibility combinations, hidden/invalid/duplicate slug rejection, curated homepage links, safe video embeds and responsive layouts. Existing Chromium pricing, orders and order-sheet suites all passed.
- All five Firefox order checks failed before loading the application with `browserContext.newPage: Cannot read properties of undefined (reading '_page')`. This matches the previously isolated local Firefox runtime failure, reproduced on a blank page with and without the test proxy. Firefox order behavior remains unverified; no dependency/browser changes were made as part of these catalog corrections.
- Visually reviewed the corrected catalog and detail screenshots at **390, 768 and 1440 px**. Layouts, missing-image fallback, filters, links and anonymous packing/price absence were sound. Videos use intercepted placeholders in the isolated run; actual third-party playback still needs the deployment smoke check.
- `git diff --check`: passed.

Full corrected-run log: `.test-runtime/pr32-corrections-integration.log`. Screenshots: `.test-runtime/security-source-usZkhI/test-results/public-catalog-public-cata-ccabe-e-tablet-and-desktop-widths-chromium/`. These ignored local artifacts are not included in the patch. The isolated builds emitted workspace-root warnings due to staged lockfiles; the browser runner also emitted a non-failing Gzip listener warning.

New tests cover all four flag combinations, legacy defaults, malformed visibility, packing absence from public DTO/HTML/Flight, authorized packing, canonical portal links, hidden/invalid public link suppression, curated images and explicit category mappings. Existing tier isolation, tampering, video safety and order/Excel regressions remain active.

## Staff actions after deployment

1. Review public flags, particularly legacy documents without an explicit value. Set `publiclyVisible=false` where needed. Change `available` only when wholesale availability should change.
2. Select each relevant category's **Homepage category card**, once per card, and verify filtered destinations.
3. Verify anonymous packing/price absence, both customer tiers, public-only and wholesale-only products with real accounts.
4. Smoke-test canonical links, real videos, sitemap and a controlled order through confirmation, admin view, Excel download and notification attachment.

No production migration, data write, merge or deployment was performed here.
