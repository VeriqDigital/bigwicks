# Big Wicks Fireworks — SEO and public information architecture

Milestone 8B starts from main at `5110fba` (merged Milestone 8A / PR #24).
The approved 8A homepage/contact design remains the foundation. This milestone
adds two individually authored public pages, not a generated location-page system.

## Public routes and intent

Before 8B, the substantive indexable surface and sitemap contained only `/` and
`/contact`. After 8B, the exact canonical public surface is:

| Route | Visitor/search intent | Primary action |
| --- | --- | --- |
| `/` | Branded discovery and fireworks shopping in La Porte, near New Buffalo | Get Directions |
| `/contact` | Ask a question, call, find store details | Contact the team |
| `/fireworks-near-new-buffalo-mi` | Plan a nearby store visit from New Buffalo: distance, physical store, selection, assistance, hours and map | Get Directions |
| `/wholesale` | Understand approved-account case ordering; existing customers find sign-in and prospective buyers contact staff | Existing Customer Sign In → `/account` |

All four pages are server-rendered, index/follow, with one explicit canonical.
The two new pages are static/config-driven with no database, private catalog,
pricing service or authentication dependency. The contact form keeps its existing
server-side delivery/limiting behavior.

`/about` and `/services` remain permanent redirects to homepage sections. No
redirect, fragment, API, private/utility route or nonexistent product URL belongs
in the sitemap. `app/sitemap.ts` emits only the four canonical URLs, with no
invented modification dates. `app/robots.ts` retains every existing disallow and
its configured sitemap reference. Robots is not authorization; authentication,
private noindex and recovery-page response protections remain unchanged.

## Page strategy and internal links

New Buffalo merits one substantive page because the existing business positioning
explicitly says the store is **3 miles south of downtown New Buffalo, Michigan**.
The page answers travel/store questions, shows real storefront/interior photos,
describes the eight public category groups, offers a call before the trip, and
includes the configured address, full weekly hours, large map and directions.
It does not imply a New Buffalo physical address, live inventory or retail checkout.
No fireworks law, age, transport or usage advice is added.

The homepage's existing visit-proximity sentence links to the New Buffalo page;
the footer also links there. No new homepage section was added. Public navigation
and the footer link Wholesale to `/wholesale`. Homepage contact links remain.
New Buffalo links to `/#shop`, its own visit section, `/contact` and directions.
Wholesale links to the homepage, contact and `/account`; sign-in links explicitly
disable prefetch. The existing navigation's secondary wholesale styling is retained.

The New Buffalo page reuses the retail Directions/Call bar with menu/footer hiding.
Wholesale keeps sign-in in its first viewport and repeats it at the end; a fixed
retail bar would compete with that page's primary action, so it is not mounted.
No mobile action bar is mounted on private routes.

### Anti-doorway policy

No city arrays, city templates, keyword-swapped pages, Michigan City/South Bend
pages, La Porte duplicates or broad Indiana landing pages. Any future location
page needs separately justified geography, substantive information and a distinct
visitor need. Do not add city pages merely to grow the sitemap. This follows
Google's [doorway-abuse policy](https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse).

### Public wholesale boundary

Public information explains account approval, assigned pricing after sign-in,
full-case quantities, order requests and staff finalization. It explicitly states
that there is no public registration, no stock reservation/availability guarantee,
and no website payment. It does not promise historical invoices or accounting.
Actual prices, assignments, percentages, customer records, order records, internal
cost and private availability never enter public copy, metadata or schema.

## Metadata contract

`config/seo.ts` supplies the existing `getSiteUrl()` origin, a four-route allowlist,
and shared public social metadata. Root `metadataBase` uses `NEXT_PUBLIC_SITE_URL`.
The local fallback remains for development; a confirmed production origin is a
launch gate. No unconfirmed production or preview domain is hardcoded.

| Route / canonical path | Title |
| --- | --- |
| `/` | Big Wicks Fireworks \| La Porte, Indiana Fireworks Store |
| `/contact` | Contact & Visit \| Big Wicks Fireworks |
| `/fireworks-near-new-buffalo-mi` | Fireworks Near New Buffalo, MI \| Big Wicks Fireworks |
| `/wholesale` | Wholesale Fireworks Ordering \| Big Wicks Fireworks |

Descriptions:

- Home: “Shop a huge selection of fireworks with friendly, knowledgeable help at Big Wicks Fireworks in La Porte, Indiana—just minutes from New Buffalo, Michigan.” (unchanged `siteConfig.description`)
- Contact: “Contact Big Wicks Fireworks in La Porte, Indiana, call the store, view current hours, or get directions from New Buffalo and the surrounding area.” (unchanged)
- New Buffalo: “Visit Big Wicks Fireworks, 3 miles south of downtown New Buffalo on IN-39 in La Porte, Indiana. Explore the selection, check hours, and get directions.”
- Wholesale: “Learn how approved Big Wicks wholesale customers view assigned pricing, order full cases, and submit requests for staff review. Sign in or contact the team.”

Every public page explicitly supplies its own Open Graph title/description/URL,
site name/locale/type and Twitter title/description/card. Both social formats use
the existing real `/images/store/big-wicks-storefront-front.jpg`, resolved through
metadataBase. The strong homepage title/description are preserved; social titles
now agree with each page instead of inheriting the homepage slogan/contact mismatch.
Unique descriptive metadata follows Google's [title guidance](https://developers.google.com/search/docs/appearance/title-link)
and [description guidance](https://developers.google.com/search/docs/appearance/snippet).
Canonical and sitemap URLs agree with Google's [canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
Links are actual anchors with descriptive text, per [crawlable-link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

## Structured data

`config/structured-data.ts` builds testable objects; `JsonLd` serializes them with
`<` escaped to prevent script termination. All site URL fields derive from
`getSiteUrl()`. External map/social URLs come from the unchanged site configuration.

- **Store** remains the truthful LocalBusiness/Organization subtype. The root emits
  one entity with stable `/#store`, preserving name, description, phone, email,
  address, openingHours and sameAs. Added url, existing logo, storefront image and
  hasMap identify the same physical business. No invented fireworks-specific subtype
  or second conflicting Organization entity is introduced. See Google's
  [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)
  and [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization) guidance.
- **WebSite**, on the homepage only, has stable `/#website`, canonical URL,
  `Big Wicks Fireworks` name and a publisher reference to `/#store`, following
  [Google's site-name guidance](https://developers.google.com/search/docs/appearance/site-names).
  No speculative alternateName or SearchAction.
- **WebPage + BreadcrumbList** on each new page match visible Home → current page
  breadcrumbs and refer to the same site/store entities. No FAQ or Product markup.

No ratings, reviews, prices, offers, awards, founding dates, payment methods or
service areas are invented. Geo is deferred: no authoritative coordinates are
configured. Valid markup is not a promise of rich results or rankings.
Official Google Search Central references reviewed September 11, 2026.

## Future public retail catalog — deferred

Potential architecture: `/fireworks`, `/fireworks/[category]`,
`/fireworks/[category]/[product]`. None is implemented or linked as a live route.
The existing eight homepage cards keep their working in-store destinations.

Prerequisites: reviewed public product content; adequate images/descriptions;
explicit public availability semantics; prices kept private; no live-inventory
claim without a real integration; safe category slug/identity mapping.
`catalogKey` remains permanent internal product identity. SKU, name and category
slugs must never replace it as relational identity. No schema/migration is needed
for this SEO milestone.

## Verification

Use Node 24. Both runners copy tracked and non-ignored new source into an ignored
isolated directory without `.env*`, use fictional canonical configuration and an
unreachable loopback database, and block external traffic. No real accounts, mail,
database reads/writes, Rich Results requests or provider changes occur.

```text
node tests/public-site/verify.mjs --font-css .test-runtime/public-fonts.css
node tests/seo/verify.mjs --render-only <the printed public-source directory>
git diff --check
```

If the existing font fixture is missing, run `node tests/public-site/fonts.mjs`
first (downloads only the already-used Google Fonts). The full public runner runs
focused SEO unit tests, Prisma generation, ESLint, Next route typegen, TypeScript,
and a production build. It then verifies all four routes and the existing homepage/
contact interactions, assets, links, canonical/social data, schema, sitemap, robots,
redirects, private noindex and mobile-bar boundaries. Responsive checks cover
360, 390, 430, 768, 1024, 1440 and 1920px, with full-page and first-viewport captures
at 390/768/1440. Wholesale sign-in must fit in the first 900px-high viewport.
Native landing FAQs are keyboard-tested. `seo-report.json` and
`public-metrics.json` record rendered metadata and measurements.

Unit tests check multiple fictional canonical origins, schema facts/references,
unsupported-field exclusions, safe JSON serialization, and recursively reject
private operational imports in the new page dependency trees. Rendered checks
also reject private-data field names or price/discount amounts. These checks
complement the static architecture; they do not claim a scan of live private data.

The browser substitutes a local placeholder for Google Maps and uses actual font
bytes from the local fixture. Configured map destinations and dimensions are
checked; live Google Maps rendering, provider readiness and mail delivery require
separate verification. See `docs/SEO-8B-VERIFICATION.md` for this run's results.

## Client facts and manual post-deploy checklist

`config/site.ts` remains the factual source of truth. Business name, address,
phone, email, hours, proximity and social URLs were not changed. Existing launch
reconfirmation items remain: address, phone, email, weekly/seasonal hours, proximity,
social URLs, canonical slogan, current promotions/brand availability, final domain,
GBP URL and production contact recipient. No missing facts were filled from search.

After client sign-off and a separately authorized deployment:

- [ ] Verify the final HTTPS canonical domain and Production `NEXT_PUBLIC_SITE_URL`.
- [ ] Fetch `/sitemap.xml`: exactly the four canonical public URLs, no private routes.
- [ ] Check public 200/index-follow/canonicals, robots sitemap reference and private noindex.
- [ ] Add/verify the correct Search Console property if needed; submit the sitemap.
- [ ] Use URL Inspection for `/`, `/contact`, `/fireworks-near-new-buffalo-mi`, `/wholesale`.
- [ ] Use Google Rich Results Test where applicable; review rendered schema against visible facts.
- [ ] Request indexing once the production domain is final; monitor Google's selected canonicals.
- [ ] Confirm GBP website URL points to the canonical site.
- [ ] Confirm GBP name/address/phone/hours match the signed-off site.

These are manual launch steps only. No Search Console connection/submission,
Google Business Profile mutation, merge or deployment is performed by 8B.
