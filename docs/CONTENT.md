# Big Wicks Fireworks — Approved / Working Client Content

> Public-facing facts in this file are either from prior project discussions or the current repository. Values marked `[CONFIRM BEFORE LAUNCH]` are already implemented but should be re-confirmed with the client before final production launch.

## 1. Business identity

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

These are category-level marketing groupings, not yet the authoritative ~200-product portal catalog.

---

## 6. Customer / wholesale portal facts

Current discussed requirements:

- Approximately 50 initial customer accounts
- Approximately 200 products
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
- Do not describe Tier 2 as an exact universal percentage discount unless Big Wicks confirms that rule.
- The working understanding is that Tier 2 averages roughly 10% lower than Tier 1, but product-level authoritative data controls.
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
- [ ] Authoritative product list
- [ ] Product SKUs/categories/descriptions/images
- [ ] Tier 1 and Tier 2 price source
- [ ] Customer import fields
- [ ] Order notification recipient
- [ ] Password/invitation wording
- [ ] Final production domain
- [ ] Re-confirm phone/email/address/hours/social URLs
- [ ] Confirm canonical slogan
- [ ] Confirm current deals/promotions before launch
