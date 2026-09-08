# Big Wicks Fireworks — Approved / Working Client Content

> Public-facing facts in this file are either from prior project discussions or the current repository. Values marked `[CONFIRM BEFORE LAUNCH]` are already implemented but should be re-confirmed with the client before final production launch.

## 1. Business identity

### Confirmed wholesale semantics (Milestone 5A.1)

Customers order complete cases. Packing describes one case's contents and remains
supplier notation, without mathematical interpretation. BoxHero Selling Price is
the Tier 2 case price; Unit Cost is Big Wicks' confidential internal case cost and
must never appear in customer content or pricing artifacts. Item Number is the
customer-facing SKU; catalogKey remains permanent identity. Brand is optional
customer-visible metadata. Tier 1 is cheapest; higher ranks represent more
expensive customer groups with independently supplied prices per product and no
percentage formula. BoxHero quantities are not website availability. Tier 1 source
and initial visibility still require review; current non-production onboarding
and remaining pricing/content gaps are recorded in [ONBOARDING.md](ONBOARDING.md#current-status).
These rules supersede earlier unconfirmed unit/source/tier notes.

**Public business name:** Big Wicks Fireworks  
**Legal/business name currently used:** Big Wicks Fireworks LLC  
**Current descriptor:** Fireworks store / retail fireworks destination  
**Existing slogan in metadata:** “Drive By The Rest… Stop At The Best!” `[CONFIRM canonical wording]`  
**Current hero adaptation:** “Skip the rest. Shop with the best.”

### Working one-line description

Big Wicks Fireworks is a local fireworks store in La Porte, Indiana with a broad in-store selection and staff who can help customers choose products for celebrations of different sizes.

Do not strengthen this into “best,” “largest,” “cheapest,” etc. without specific client-approved proof.

---

## 2. Contact information

Current repository values:

**Phone:** (219) 380-5149 `[CONFIRM BEFORE LAUNCH]`  
**Email:** bigwicksfireworks@gmail.com `[CONFIRM BEFORE LAUNCH]`  
**Address:** 10351 IN-39, La Porte, IN 46350 `[CONFIRM BEFORE LAUNCH]`  
**Nearby-market wording:** 3 miles south of downtown New Buffalo, Michigan `[CONFIRM BEFORE LAUNCH]`

### Social links currently implemented

**Facebook:** `https://www.facebook.com/profile.php?id=100094070160648` `[CONFIRM BEFORE LAUNCH]`  
**Instagram:** `https://www.instagram.com/bigwicksfireworks/` `[CONFIRM BEFORE LAUNCH]`

---

## 3. Hours

Current repository hours; re-confirm before production launch:

| Day | Hours |
|---|---|
| Monday | 8 AM–10 PM |
| Tuesday | 8 AM–10 PM |
| Wednesday | 7 AM–10 PM |
| Thursday | 7 AM–11 PM |
| Friday | 7 AM–11 PM |
| Saturday | 7 AM–11 PM |
| Sunday | 8 AM–5 PM |

Do not infer seasonal/holiday hours.

---

## 4. Public retail value proposition

### Main customer need

Shoppers need confidence that Big Wicks is worth the trip, has a broad range of fireworks, and can help them choose suitable products.

### Current supported themes

- Broad in-store selection
- Helpful/knowledgeable staff
- Local alternative to large chain stores
- Convenient proximity to New Buffalo
- Physical store shoppers can visit

Treat stronger pricing/value claims as marketing copy that needs client confirmation if they become specific.

### Primary public CTA

**Get Directions / Visit the Store**

Secondary actions:
- Browse product categories
- Contact Big Wicks
- Call the store

---

## 5. Current product categories

The existing site presents:

1. 500 Gram Cakes
2. 200 Gram Cakes
3. Artillery Shells
4. Fountains
5. Firecrackers
6. Roman Candles
7. Novelties
8. Assortments & Kits

These are category-level marketing groupings, separate from the 302-product,
17-category catalog now imported into non-production Sanity.

---

## 6. Customer / wholesale portal facts

Current discussed requirements:

- Approximately 50 initial customer accounts
- 302 real products imported into non-production Sanity, all `available=false`
- Customer accounts are approved/provisioned rather than open public registration
- Product prices are hidden until login
- Two pricing tiers
- Customer sees pricing for their assigned tier
- Customer enters quantities against products
- If managed online ordering is selected, the website submits an **order request** to Big Wicks
- Big Wicks staff/salesperson finalizes the order after submission
- Availability may require substitutions/removals
- Final amount/invoice can differ from the submitted request
- The site is not the inventory source of truth
- The site does not process payment in the current scope

### Required customer-facing wording principle

Do not imply that submitting an order means:

- inventory is reserved,
- every item is in stock,
- payment has been collected,
- the final invoice is guaranteed to equal the submitted request,
- or the order is fully accepted.

A safe working concept is:

**“Submit your order request. Big Wicks will review availability and confirm the final order with you.”**

Final wording should be approved before launch.

---

## 7. Pricing content

Pricing is private customer/account information.

Rules:

- Do not publish wholesale/account prices in public-page copy, metadata, schema, static HTML, or social previews.
- Tier 1 is the cheapest tier; higher ranks represent more expensive groups, as confirmed in Milestone 5A.1.
- Each tier's per-product case price must be supplied independently. Never derive prices from percentages, Unit Cost, packing or another tier.
- Do not expose internal customer tier labels publicly unless useful/approved.

---

## 8. Ordering process

### Option A / manual completion

1. Customer signs in.
2. Customer views the protected catalog and assigned pricing.
3. Customer prepares quantities/order information.
4. Existing Big Wicks process handles actual submission/finalization.

### Option B / managed online order request

1. Customer signs in.
2. Customer browses protected catalog.
3. Customer enters quantities.
4. Site displays a server-authoritative calculated request total.
5. Customer submits the order request.
6. Big Wicks receives the order details.
7. Salesperson reviews stock, substitutions, and final amount.
8. Big Wicks confirms/finalizes outside the website.

Do not invent additional steps such as online payment or warehouse picking automation.

---

## 9. Forms

### Contact form

**Purpose:** General public inquiry  
**Current status:** Implemented with server-side Resend delivery  
**Recipient:** Environment-configured `CONTACT_TO_EMAIL`; production recipient must be confirmed  
**Spam/validation:** Preserve existing validation/spam protection unless intentionally improved

### Order request

**Purpose:** Authenticated customer order submission  
**Status:** Milestone 4A implements the Website Ordering option authorized by the user

**Recipient:** `[CONFIRM]`  
**Core data:** authenticated customer, product snapshots, quantities, prices, calculated totals, submission timestamp, optional customer note if approved

Do not allow the client to submit authoritative prices/customer IDs/tier values.

---

## 10. Public imagery currently approved by use in the repo

Authentic store assets:

- `public/images/store/big-wicks-storefront-front.jpg`
- `public/images/store/big-wicks-storefront-night.jpg`
- `public/images/store/big-wicks-interior-overview.jpg`
- `public/images/store/big-wicks-interior-aisle-cakes.jpg`
- category photography in `public/images/categories/`
- `public/videos/product-demo.mp4`
- `public/images/store/product-demo-poster.png`

Do not label unrelated stock imagery as Big Wicks inventory or store photography.

---

## 11. Explicitly unapproved / do not say

Do not state without confirmation:

- “#1 fireworks store”
- “largest selection”
- “lowest prices”
- guaranteed product availability
- guaranteed order total
- same-day fulfillment
- 24/7 availability
- specific warranty/guarantee
- licensed/certified claims
- exact years in business
- exact retail/wholesale discount percentages as universal rules
- that the portal is connected to live inventory
- that submitted orders are paid/complete/final

---

## 12. Content gaps

- [x] Website Ordering authorized for Milestone 4A implementation by the user
- [x] Real product list, SKUs and categories imported into non-production (302 products, 17 categories)
- [ ] Product descriptions/images and availability review
- [x] 280 real Tier 2 prices imported into Preview Postgres
- [ ] 22 unresolved/blank Tier 2 prices and client Tier 1 source (currently 0 Tier 1 prices)
- [ ] Production Sanity catalog and Postgres pricing imports
- [ ] Customer import fields
- [ ] Order notification recipient
- [ ] Password/invitation wording
- [ ] Final production domain
- [ ] Re-confirm phone/email/address/hours/social URLs
- [ ] Confirm canonical slogan
- [ ] Confirm current deals/promotions before launch
