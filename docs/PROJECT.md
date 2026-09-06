# Big Wicks Fireworks — Project Brief

## 1. Project identity

**Client / business name:** Big Wicks Fireworks LLC  
**Public-facing name:** Big Wicks Fireworks  
**Project type:** Retail marketing website + potential protected B2B/customer ordering portal  
**Current stage:** Internal build/refinement started; final client option selection still needs to be treated as a gating decision for backend scope.

### Project summary

Big Wicks needs a polished public website that helps nearby retail shoppers discover the store and gives the business a substantially stronger digital presence. The project may also replace a manual customer-ordering workflow with a private portal for roughly 50 existing business/wholesale customers and a catalog of roughly 200 products.

The portal must stay intentionally narrower than a full ecommerce or inventory-management system. Big Wicks staff remain responsible for final availability, substitutions, final order amount, invoicing, and fulfillment.

---

## 2. Project goals

### Primary goals

1. Present Big Wicks as a credible, distinct local fireworks destination rather than a generic chain-style site.
2. Improve local discoverability for Big Wicks / fireworks searches around La Porte, Indiana and the nearby New Buffalo, Michigan market.
3. Make store visits, directions, calls, and contact easy for public retail shoppers.
4. If selected, make repeat customer ordering dramatically easier without forcing Big Wicks to adopt a full ecommerce or IMS replacement.

### Primary public conversion

**CTA:** Get Directions / Visit the Store  
**Destination:** Map/directions

### Primary portal conversion

**CTA:** Submit Order  
**Destination:** Authenticated order-request submission

### Success should feel like

A retail shopper can understand the store and get directions quickly. An approved account customer can sign in, see the correct prices, enter quantities, submit an order request, and then let the existing Big Wicks sales process take over.

---

## 3. Audience

### Public retail shopper

People shopping for fireworks in/around La Porte, Indiana and nearby New Buffalo, Michigan. They primarily care about selection, value, product guidance, location, hours, and confidence that the trip is worthwhile.

### Approved customer / wholesale account

Existing Big Wicks customers who already order through the business and need a faster way to view the catalog/pricing and communicate quantities.

### Internal Big Wicks staff

Staff need submitted orders to arrive in a practical form that fits their existing workflow. The current scope does **not** assume a full staff admin application.

---

## 4. Market

**Primary location:** La Porte, Indiana  
**Nearby market emphasized in current site:** New Buffalo, Michigan  
**Current store address in repository:** 10351 IN-39, La Porte, IN 46350 `[CONFIRM BEFORE LAUNCH]`

Do not create thin city pages or imply service/store presence in locations where Big Wicks is not actually located.

---

## 5. Current public-site scope

### Existing routes

| Page | Route | Purpose | Status |
|---|---|---|---|
| Home | `/` | Retail discovery, selection, trust, visit intent | Existing; refine |
| Contact | `/contact` | Contact + store information | Existing; refine |
| About | `/about` | Currently placeholder/minimal route | Re-evaluate |
| Services | `/services` | Currently placeholder/minimal route | Re-evaluate |

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

Do not keep sections merely because they already exist. During the carve-out pass, consolidate or remove anything that does not help retail discovery, trust, visit intent, or the portal transition.

---

## 6. Customer-ordering scope

The client has been presented with two conceptual levels. Do not collapse them into one commitment until the final selection is explicit.

### Option A — Customer portal + downloadable/manual order workflow

- Approved customer login
- Prices hidden from unauthenticated visitors
- Approximately 200 products
- Approximately 50 initial customer accounts/imports
- Two customer pricing tiers
- Customer sees only the price assigned to their tier
- Catalog can support quantity planning and/or downloadable spreadsheet/order sheet
- Big Wicks continues receiving/finalizing orders through the existing manual process
- No online payment
- No live inventory
- No customer-facing order-management system

### Option B — Managed online order submission

Includes the protected catalog/customer-pricing foundation plus:

- Customer enters quantities directly on the site
- Customer submits an order request
- Server creates an immutable submitted-order snapshot
- Big Wicks receives a detailed order notification/email
- Big Wicks salesperson handles stock issues, substitutions, price adjustments, invoicing, and fulfillment outside the site
- No full admin panel in the currently discussed scope
- No customer self-service editing after submission
- No payment processing
- No live inventory synchronization
- No BoxHero/IMS integration
- No promise that displayed catalog availability is real-time

### Pricing behavior

- Two pricing tiers are expected.
- Tier 2 has historically been discussed as approximately 10% lower on average, but exact product pricing must come from authoritative Big Wicks data rather than a hard-coded global discount unless the client confirms that rule.
- Product prices are private and should not be exposed in public HTML/API responses.
- The server, not the browser, determines the authenticated customer's tier and authoritative price.

### Order integrity requirements

For Option B:

- Client submits product IDs and quantities only.
- Server resolves authenticated customer identity.
- Server resolves pricing tier.
- Server looks up current authoritative prices.
- Server validates products and quantity bounds.
- Server calculates line totals and order total.
- Store product name/SKU/unit-price snapshots on submitted order items.
- Use a transaction for order + order items.
- Protect against accidental duplicate submissions.
- Customer A must never be able to read Customer B's protected data.

---

## 7. Explicitly out of scope unless separately approved

- Online card/payment processing
- Ecommerce checkout as final sale
- Real-time stock/inventory availability
- BoxHero integration
- Replacement inventory-management system
- Accounting/ERP integration
- Automatic invoicing
- Customer-facing invoice editing
- Automatic substitutions
- Final-order reconciliation after staff changes an order
- Full internal admin portal
- Full customer order-history system
- Shipping-rate engine
- Marketplace/multi-vendor functionality

If any of these is requested, treat it as a scope change.

---

## 8. Features and integrations

| Feature | Required now? | Status / notes |
|---|---:|---|
| Public marketing site | Yes | Existing |
| Contact form | Yes | Existing Resend implementation |
| Click-to-call/directions | Yes | Existing |
| SEO/local metadata | Yes | Existing foundation; improve |
| GBP support | Value-add / planned assistance | Do not claim changes until performed |
| Approved customer authentication | Depends on selected option | Planned |
| Protected pricing | Depends on selected option | Planned |
| Product catalog | Depends on selected option | Planned |
| Order submission | Option B only | Planned |
| Online payments | No | Out of scope |
| Live inventory / IMS | No | Out of scope |
| Admin portal | No in current Option B | Out of scope unless added |

---

## 9. Technical context

### Existing stack

- Next.js 16.2.9
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- App Router
- Vercel-oriented deployment
- Resend contact form

### Preferred portal stack if needed

- Auth.js for authentication/session management
- Prisma ORM
- PostgreSQL
- Zod or equivalent server-side schema validation
- Resend for order notifications

Do not build custom session/token cryptography when a proven authentication library covers the need.

### Repository-specific rule

The root `AGENTS.md` preserves the existing Next.js 16 warning: inspect the installed Next.js docs before assuming framework APIs or conventions.

---

## 10. Security invariants

If protected ordering is implemented:

- No public self-registration unless the user/client explicitly approves it.
- Accounts are created/imported/approved by Big Wicks or through an explicit invitation flow.
- Never trust customer ID, tier, unit price, line total, or order total from the client.
- Every protected mutation performs its own server-side auth check.
- Rate-limit credential login attempts.
- Deactivated accounts cannot authenticate/order.
- Do not leak pricing through metadata, static generation, public route data, logs, or browser bundles.
- Use server-only environment variables for secrets.
- Add focused authorization and tampering tests before launch.

---

## 11. Brand/design direction

The current retail design direction is active unless the user changes it:

- Black/off-white/red visual system
- Real Big Wicks storefront/interior photography
- Bold condensed headings
- Practical, energetic local-retail tone
- Minimal rounding and restrained effects
- Avoid generic SaaS UI aesthetics

The protected portal should feel like the same business, but prioritize clarity, speed, dense catalog usability, and error prevention over marketing decoration.

See `docs/BRAND.md`.

---

## 12. Current priority

1. Establish these source-of-truth docs.
2. Audit the current site and carve the page/section architecture into the strongest retail experience.
3. Keep the public site portal-ready.
4. Do **not** spend major effort on backend ordering until the final option is confirmed.

---

## 13. Open questions

### Blocks backend implementation

- [ ] Which customer-ordering option is final?
- [ ] What exact product-data source/format will Big Wicks provide?
- [ ] Are prices provided per product/per tier, or is Tier 2 derived by a consistent rule?
- [ ] What exact customer fields are included in the ~50-customer import?
- [ ] How should first-time password setup/invitations work?
- [ ] Which Big Wicks email(s) should receive submitted orders?
- [ ] Does the client want any customer order history in the final contracted scope?

### Can wait until later

- [ ] Production domain
- [ ] Analytics/Search Console ownership
- [ ] Final GBP access/cleanup actions
- [ ] Final promotion/deal content
- [ ] Final confirmation of store hours/contact/social links already present in the repo

---

## 14. Acceptance criteria

### Public site

- Correct Big Wicks identity and assets
- Clear retail value proposition and visit CTA
- Strong mobile/tablet/desktop experience
- Accurate location/contact information
- No unsupported claims
- Useful local SEO without keyword stuffing
- Fast enough to feel immediate
- No stale/demo metadata or broken routes

### Protected portal, if selected

- Approved users can authenticate
- Unauthenticated users cannot access private prices
- Each customer sees only their assigned pricing
- Submitted totals are calculated server-side
- Submitted order preserves price/product snapshots
- Duplicate/tampered requests are safely handled
- Big Wicks reliably receives the submitted order
- No payment/live-inventory behavior is implied
- Relevant tests/lint/build pass before launch
