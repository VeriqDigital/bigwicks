# Big Wicks Fireworks — SEO Plan

## 1. SEO objective

### Primary objective

Make Big Wicks easier to discover for real fireworks-shopping intent around La Porte, Indiana and the nearby New Buffalo, Michigan market, while converting that traffic into store visits, directions, calls, and contact.

### Secondary objective

Strengthen branded search results and connect the website cleanly with Big Wicks' Google Business Profile and social presence.

### Portal SEO principle

Authenticated customer/catalog/order pages are utility pages, not acquisition landing pages. Private pricing/catalog/account routes should not be indexed.

---

## 2. Current business / NAP data

Current repository values; confirm before final launch:

**Business name:** Big Wicks Fireworks LLC / Big Wicks Fireworks  
**Address:** 10351 IN-39, La Porte, IN 46350 `[CONFIRM]`  
**Phone:** (219) 380-5149 `[CONFIRM]`  
**Email:** bigwicksfireworks@gmail.com `[CONFIRM]`  
**Production domain:** `[CONFIRM]`  
**Google Business Profile URL:** `[CONFIRM]`

Visible contact data, GBP, and structured data should agree.

---

## 3. Search themes

### Highest priority

- Big Wicks
- Big Wicks Fireworks
- fireworks La Porte Indiana
- fireworks store La Porte Indiana
- fireworks near New Buffalo Michigan
- fireworks store near New Buffalo
- fireworks near me (supported through local relevance, not keyword stuffing)

### Product/category themes

Use naturally where real content exists:

- 500 gram cakes
- 200 gram cakes
- artillery shells
- fountains
- firecrackers
- Roman candles
- fireworks assortments
- novelty fireworks

### Wholesale/account search

Do not build thin public pages around wholesale keywords unless Big Wicks explicitly wants to acquire new wholesale customers online. The current portal is primarily for approved existing customers.

---

## 4. Page map

| Page | Route | Primary intent | Indexing |
|---|---|---|---|
| Home | `/` | Local retail discovery + branded search | Index |
| Contact | `/contact` | Contact / location / store info | Index |
| About | `/about` if retained | Brand/local trust | Index if substantive |
| Public wholesale/customer info | `/wholesale` or similar if approved | Explain account ordering | Index only if meant for public acquisition |
| Login | `/login` | Account utility | Noindex |
| Protected catalog | `/portal` | Customer utility | Noindex/auth |
| Order request pages | protected | Customer utility | Noindex/auth |
| Account pages | protected | Customer utility | Noindex/auth |

Do not force exact-match keywords into every heading.

---

## 5. Homepage direction

The homepage should make the following crawlable and obvious:

- Big Wicks Fireworks
- La Porte, Indiana location
- Proximity to New Buffalo when confirmed/useful
- Fireworks-store/category offering
- Authentic store identity and imagery
- Directions/contact CTA

Avoid giant keyword blocks or repetitive city lists.

---

## 6. Local strategy

### Real location

La Porte, Indiana.

### Nearby market

New Buffalo, Michigan is currently emphasized because the store is described as roughly three miles south of downtown New Buffalo. Re-confirm that wording before launch.

### Location pages

Do **not** create a network of thin swapped-city pages.

Only create dedicated location content if:
- the geography is genuinely relevant,
- there is unique useful content,
- and the user explicitly wants the strategy.

---

## 7. Metadata

### Current metadata foundation

The root layout currently targets phrases around:

- fireworks store La Porte Indiana
- fireworks near New Buffalo Michigan
- Big Wicks Fireworks
- Indiana fireworks

During refinement:

- Keep titles human-readable.
- Avoid a `keywords` array as a substitute for useful page content.
- Give important pages unique titles/descriptions.
- Use the production domain for canonical/social URLs.
- Remove staging/localhost fallback from public canonical behavior at production launch.
- Keep wholesale prices/customer data out of metadata.

---

## 8. Structured data

### Public pages

Candidate schema:

- `Store` / appropriate `LocalBusiness` subtype
- `Organization`
- `WebSite`
- `BreadcrumbList` where useful

The existing layout already emits `Store` JSON-LD based on `siteConfig`. Before launch, verify every value against confirmed business data.

### Do not include

- aggregate ratings unless requirements/data are satisfied
- invented price ranges
- unsupported awards/certifications
- private customer pricing
- fake areas served
- unconfirmed seasonal hours

---

## 9. Technical SEO

Verify before launch:

- [ ] Production canonical domain is correct
- [ ] `robots.txt` is intentional
- [ ] Sitemap includes only canonical public pages
- [ ] Login/account/catalog/order routes are noindex and protected
- [ ] No private pricing appears in static source or public API payloads
- [ ] No staging domain remains in metadata
- [ ] No broken placeholder `/about` or `/services` routes remain if they are not substantive
- [ ] Important public content is server-rendered/crawlable
- [ ] Images are optimized
- [ ] Video does not degrade Core Web Vitals/initial rendering
- [ ] Mobile usability is sound
- [ ] Heading hierarchy is semantic
- [ ] Internal links match the final carved-out IA

---

## 10. Google Business Profile support

Veriq intends to over-deliver on Big Wicks' broader digital presence, but do not claim work is complete until it is actually performed.

Potential value-add work:

- Confirm ownership/access
- Correct website link
- Confirm primary/additional categories
- Align name/address/phone/hours
- Add current website/social links where supported
- Replace/update stale photography
- Improve photo coverage
- Review service/product information
- Establish a reasonable posting/update process
- Connect site and GBP consistently

**Current access/status:** `[CONFIRM]`

---

## 11. Social/profile alignment

Current repo links:

- Facebook: `https://www.facebook.com/profile.php?id=100094070160648`
- Instagram: `https://www.instagram.com/bigwicksfireworks/`

Confirm both before launch and make sure the website/GBP/social profiles cross-reference one another where appropriate.

---

## 12. Analytics / search tools

**Analytics:** `[CONFIRM]`  
**Search Console:** `[CONFIRM]`

Useful events:

- Get Directions click
- Phone click
- Contact form submit
- Customer Login click
- Successful login
- Catalog search/filter use
- Order request submit (if Option B)

Do not place private order values/customer identities into analytics events unless explicitly needed and privacy-reviewed.

---

## 13. Content gaps

- [ ] Production domain
- [ ] GBP URL/access
- [ ] Confirm NAP/hours
- [ ] Decide whether public wholesale acquisition is desired
- [ ] Confirm whether `/about` and `/services` survive carve-out
- [ ] Confirm final deals/promotions
- [ ] Confirm analytics/Search Console setup

---

## 14. Pre-launch SEO audit

- [ ] Correct Big Wicks name in titles/social metadata
- [ ] Production domain in canonical metadata
- [ ] Public page titles/descriptions are intentional
- [ ] Sitemap/robots are correct
- [ ] Protected routes are not indexable
- [ ] Structured data contains only confirmed facts
- [ ] No private prices/customer data leak
- [ ] Main retail categories have useful crawlable context
- [ ] Internal links are valid
- [ ] Images have appropriate alt behavior
- [ ] No thin/spammy location pages
- [ ] GBP/site NAP is aligned
