# Public catalog and product discovery

Implemented September 30, 2026. No production data, customer records, prices,
templates or provider settings were changed. This supersedes the earlier public
catalog deferral in SEO.md.

## Routes and architecture

- `/products`: server-rendered catalog with GET search (`q`) and category filtering
  (`category`, the actual Sanity category document ID).
- `/products/[slug]`: crawlable product details, optional demonstration, public
  metadata, canonical and social image. No price/Offer structured data.
- Products without a slug use their immutable `catalogKey`. That key URL redirects
  to the canonical slug after one is configured. Hidden/unknown products return
  the Next not-found boundary; ambiguous slugs are excluded. Custom slugs cannot
  hijack another product's permanent key URL, even through API-written content.
- `/sitemap.xml` includes the five public root routes and currently visible,
  unambiguous product URLs. Homepage and sitemap read no pricing or customer data.

The existing Sanity query and normalizer remain the single content source. The
public service explicitly constructs a content-only DTO. Products still join SQL
prices by `catalogKey`; SKU and slug are never price/order identities. Excel-only
rows are not imported, and website-only products are not removed.

Homepage cards now use the actual categories represented by visible products,
with links using their IDs. They use a category's available product image or the
authentic store overview. If content is unavailable or no categories are visible,
the existing eight marketing cards remain as a fallback and link to the catalog.
There is no guessed mapping between the eight marketing groups and 17 catalog
categories. Renaming a category does not break filtering.

## Pricing boundary and ordering

Anonymous visitors resolve no customer and never call the price service or query
`ProductPrice`. Approved customers pass through `getCurrentUser` and then the
existing zero-input `getAvailableCatalogForCustomer`, which independently calls
`requireCustomer`, reads the current saved SQL tier and selects only that tier's
prices. URL parameters do not influence authorization. No new pricing API exists.

Both product routes force dynamic rendering and return private/no-store responses.
There is no shared pricing cache. Only the authorized scalar price is rendered;
other tiers and private associations never reach HTML, Flight, client props or
metadata. Public metadata and sitemap use only the content service. React `cache`
deduplicates public reads within a render request, not across visitors.

Ordering stays in `/portal`, preserving its quantity/review/submission workflow.
Product pages link there. Portal product-detail links open a separate tab so the
existing in-memory quantities remain intact. Order services, snapshots, replay,
template pinning, Excel generation, downloads and notifications are unchanged.

## Studio and content actions

The existing product schema adds only optional `slug` and `videoUrl` fields.
The existing description, brand, packing and image fields are reused. Slugs use
Sanity's [native slug field and uniqueness validation](https://www.sanity.io/docs/studio/slug-type),
with lowercase URL validation and runtime collision protection.

The existing `available` flag is now labeled **Visible in public and wholesale
catalogs**. Its value is not changed automatically. Only published products with
`available=true` are listed; a missing price does not hide public product content.
This is manual visibility, not live inventory. Sanity's dataset was already public:
visibility hides products on the website, not from direct content-dataset queries.
Private prices remain exclusively in PostgreSQL.

Staff should review visibility before rollout, especially any products previously
visible only in the authenticated UI. Add real images/descriptions, generate stable
slugs if desired, and supply demonstration URLs. No required backfill or SQL/Sanity
migration. Changing an existing custom slug does not create an old-slug redirect;
keep published custom slugs stable. Catalog key links remain supported.

Video accepts HTTPS YouTube watch/share/shorts/embed and ordinary public Vimeo
video links. A shared parser validates Studio input and server data, extracts only
the provider video ID and reconstructs an allowlisted embed URL. Arbitrary HTML,
other hosts, credentials and non-HTTPS URLs are rejected. Invalid or absent videos
are omitted. Iframes have descriptive titles, lazy loading, no autoplay, limited
permissions and a sandbox. Videos must permit embedding. Vimeo unlisted hash URLs
and uploads/transcoding are intentionally outside this implementation.

No new environment variables or dependencies. Existing Sanity project/dataset,
canonical `NEXT_PUBLIC_SITE_URL`, Auth.js and database configuration still apply.

## Changed files

| Area | Files |
| --- | --- |
| Public routes | `app/products/page.tsx`, `app/products/[slug]/page.tsx`, `app/products/layout.tsx`, `app/products/error.tsx`, `app/products/products.css` |
| Content and pricing boundaries | `lib/catalog/content.ts`, `lib/catalog/normalize.ts`, `lib/catalog/public.ts`, `lib/catalog/visitor.ts`, `lib/catalog/urls.ts`, `lib/catalog/video.ts` |
| Studio | `sanity/schemaTypes/product.ts` |
| Navigation/UI | `app/page.tsx`, `components/sections/CategorySection.tsx`, `components/catalog/WholesaleAccess.tsx`, `components/catalog/Catalog.tsx`, `data/fireworks.ts` |
| SEO | `app/sitemap.ts`, `config/seo.ts` |
| Tests | `tests/unit/public-catalog.test.ts`, `tests/unit/seo.test.ts`, `tests/integration/catalog.test.ts`, `tests/e2e/public-catalog.spec.ts`, `tests/run-integration.ts`, `tests/seo/assertions.mjs`, `tests/public-site/verify.mjs` |
| Documentation | `docs/PUBLIC-CATALOG.md`, `docs/SEO.md`, `docs/DECISIONS.md` |

## Validation and production smoke checks

Tests cover public HTML and RSC secrecy, both saved tiers, tampered tier inputs,
hidden/draft/ambiguous slugs, key redirects, category navigation, optional content,
safe/invalid videos, sitemap/metadata and 390/768/1440px layouts. Integration tests
also verify anonymous price reads are skipped and tier edits/session revocation
take effect. Existing order and Excel suites remain part of the regression run.

Tests use the repository's isolated runners: disposable local PostgreSQL,
fictional products, intercepted Sanity/email, sanitized environment and blocked
external network.

Commands run:

- `node tests/security/run.mjs unit`: **437 passed** on the final source.
- `node tests/security/run.mjs lint`: passed. Final source also passed ESLint in
  the public-site runner below.
- `node tests/security/run.mjs typecheck`: passed (Prisma generation, Next route
  type generation, `tsc --noEmit --incremental false`). Final source also passed
  these checks in the public-site runner.
- `node tests/public-site/verify.mjs --font-css .test-runtime/public-fonts.css`:
  all assertions passed, including its checked production `next build`, SEO unit
  tests, lint, typecheck and five public routes at 360/390/430/768/1024/1440/1920px.
  Screenshots use the actual local Barlow/Roboto Condensed font fixture.
- `node tests/public-site/verify.mjs --font-css .test-runtime/public-fonts.css --render-only .test-runtime/public-source-uG00Zk`:
  clean exit 0; all public render/link/SEO/responsive assertions passed again
  against the same final build. The earlier redirected invocation had a
  PowerShell native-stderr warning status despite completing its assertions.
- `node tests/security/run.mjs integration`: final database/security/unit phase
  **708 passed**, including the new anonymous-query/tier-change/revocation test.
  This runner also creates unconfigured and fictional configured production
  builds and executes the existing browser suites; browser results follow below.
- `git diff --check`: passed. Scope review confirms no changes to Prisma,
  authentication/pricing/order/export services, dependencies or lockfile. No
  legacy-client identifier list exists in PROJECT.md; no legacy assets or business
  identities were added.

The first browser pass exposed a test expectation error: Next's navigation payload
echoes query parameters intentionally supplied by the test. Tests now separately
reject tier IDs on ordinary requests and unauthorized price values on tampered
requests. The public-site runner's older mobile-action assumption was also updated
to apply only to the three existing retail pages that mount that bar.

Firefox tooling limitation: the local Playwright Firefox runtime fails at
`browser.newPage()` with `Cannot read properties of undefined (reading '_page')`.
A standalone `firefox.launch()` / `newPage()` / `goto('about:blank')` probe fails
both with and without the isolated proxy, before any application navigation.
This prevents the five Firefox order checks from running; no application change
was made to work around the browser runtime.

After separately authorized deployment:

1. Review Studio's visibility label and confirm only intended products appear.
2. In a signed-out/private window, follow homepage category links, browse/filter,
   open products and inspect HTML/Flight/network responses for price absence.
3. Sign in with one account per tier; confirm assigned prices on catalog/detail,
   then test account tier changes, disablement and sign-out with a fresh request.
4. Test a real YouTube/Vimeo embed on phone and desktop; provider playback and
   embedding restrictions cannot be certified by isolated fixtures.
5. Submit a controlled order through the existing review flow. Check quantities,
   confirmation, admin record, pinned Excel export and notification attachment.
6. Verify canonical origin, product social metadata, hidden-product not-found
   behavior and sitemap. Recheck real product photos/crops and missing content.

Limits: no public retail prices/checkout, separate public-vs-wholesale visibility,
cart persistence changes, automatic content import or video hosting. A Sanity
outage displays a catalog fallback; product detail uses a retry error boundary.
Public pages currently read the catalog per request; pagination is deferred for
the current approximately 302-product scale.
