# Milestone 8B verification — September 11, 2026

Implemented on `Milestone-8B` from updated `origin/main` at `5110fba`, merged
Milestone 8A / PR #24. No commit, merge, deployment, provider mutation, real data
query or email was performed. The working diff is ready for review.

## Results

| Check | Result |
| --- | --- |
| Focused unit SEO suite | 13 tests passed |
| ESLint | Passed; final browser-test edits also linted |
| Prisma client generation | Passed locally; no migrations or database connection |
| Next route type generation + TypeScript `--noEmit` | Passed |
| Production build (Next 16.3.4 / Turbopack) | Passed; both new pages statically prerendered |
| Four public routes | 200, index/follow, one canonical each; unique titles/descriptions |
| Open Graph / Twitter | Page-specific titles/descriptions, canonical URLs and real storefront image on configured fictional origin |
| Structured data | One Store per page; homepage WebSite; new-page WebPage/BreadcrumbList; configured URL/fact checks and unsupported/private-field exclusions passed |
| Sitemap / robots | Exactly four public URLs, URL-only entries; all existing private disallows and sitemap reference retained |
| Redirects / private utility protections | Existing redirects, anonymous protected-route noindex/redirects and recovery headers passed |
| Public operational-data boundary | New page import trees are static/config-only; rendered private-field/price/discount checks passed |
| Links, assets, navigation | Passed, including public Wholesale destination, `/account` CTAs and local fragment targets |
| Existing public interactions | Homepage FAQ, portrait video, contact native validity/labels and mobile action visibility passed |
| New page interactions | Native FAQ keyboard expansion/collapse; wholesale sign-in visible in first 900px-high viewport |
| Responsive | Four pages at 360, 390, 430, 768, 1024, 1440 and 1920px; no horizontal overflow or clipped content |
| Browser runtime errors | None |
| Diff whitespace | `git diff --check` passed |

## Commands and artifacts

```text
node tests/public-site/verify.mjs --font-css .test-runtime/public-fonts.css
node tests/public-site/verify.mjs --font-css .test-runtime/public-fonts.css --render-only .test-runtime/public-source-vaja2a
node tests/seo/verify.mjs --render-only .test-runtime/public-source-vaja2a
node node_modules/eslint/bin/eslint.js tests/public-site/verify.mjs tests/seo/verify.mjs tests/seo/assertions.mjs
git diff --check
```

The full runner executes these inside its isolated source copy:

```text
node node_modules/prisma/build/index.js generate
node node_modules/vitest/vitest.mjs run tests/unit/seo.test.ts
node node_modules/eslint/bin/eslint.js
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
```

The first browser pass exposed an overly broad test regex that mistook CSS `100%`
for a discount. The check was corrected to examine visible text for amounts and
retain HTML checks for private field names. Both browser runners then passed
against the same unchanged production build. Render-only runs verify that current
application build inputs still match the isolated source copy.

Non-blocking tool warnings: existing Vitest/Vite CommonJS configuration warning;
Next workspace-root warning caused by the isolated copy's additional lockfile.
No application dependency or production configuration was changed to hide them.

Artifacts are ignored local files under `.test-runtime/public-source-vaja2a/`:

- `seo-report.json`: exact rendered titles, descriptions and configured canonicals.
- `public-metrics.json`: responsive measurements for every page/width.
- `after-fireworks-near-new-buffalo-mi-{390,768,1440}.png` and corresponding
  `-viewport.png`: reviewed full pages and first viewports.
- `after-wholesale-{390,768,1440}.png` and corresponding `-viewport.png`:
  reviewed full pages and first viewports.
- Homepage/contact captures and homepage section details provide regression evidence.

Reviewed new-page crops preserve the storefront sign and real store interior;
headings and content fit phone/tablet/desktop widths. The phone wholesale sign-in
is prominent above the image. The retail mobile bar hides for the menu/footer;
it is absent on wholesale and private routes. The approved homepage section order,
eight equal category cards, video and visit layout remain intact. Its desktop
height remains 6,503px; the phone footer is slightly taller due to useful new links.

## Scope and limits

`git diff` confirms no changes to auth, account/portal/admin/studio behavior,
Prisma schema/migrations, pricing/ordering/import/invitation services, dependencies,
or contact delivery. `config/site.ts` changes only navigation/footer entries;
all business facts are preserved. `app/public.css` is unchanged.

`docs/PROJECT.md` contains no named legacy-client identifiers or inherited-client
cleanup list. Reviewed changed public copy, metadata, schema, assets and links use
Big Wicks configuration/existing assets. No previous-client identity was introduced.
The existing Veriq footer credit is unchanged.

Tests use a fictional HTTPS origin, unreachable loopback database and no private
environment files. Google Maps is blocked/substituted in the isolated browser;
its actual configured URL and layout are checked, but live map rendering is not.
No live Rich Results, Search Console, GBP, delivery or authenticated production
checks occurred. Massive private auth/order suites were not rerun because those
systems were not modified. The historical `--baseline` path was retained but was
not rerun; current-page acceptance and render-only paths were exercised.

Client fact confirmation, the final canonical domain and manual post-deploy
Search Console/GBP checks remain in [SEO.md](SEO.md). The future public retail
catalog remains deferred with its content, imagery, availability and identity
prerequisites documented there.
