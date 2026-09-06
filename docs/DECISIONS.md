# Big Wicks Fireworks — Project Decisions Log

> `PROJECT.md`, `BRAND.md`, `CONTENT.md`, and `SEO.md` describe the current working state. This file records how the project got there and prevents older directions from resurfacing accidentally.

## Current priority

**Optimize for:**  
Refine/carve the existing public site into the strongest Big Wicks retail experience while keeping the architecture ready for the final selected customer-ordering option.

**Waiting on:**

- Final client option selection
- Authoritative product/pricing data
- Customer import details
- Final production-domain / launch details

**Do not work on yet:**

- Live inventory / BoxHero integration
- Payment processing
- Full admin portal
- Full invoice/order-reconciliation system
- Major backend implementation that depends on a not-yet-final option

---

## Decision log

### 2026-09-06 — Start internal build before final sign-off

**Source:** User / Veriq  
**Status:** Active

**Decision:**

Begin productive work now because the project is highly likely to proceed. Use the time first on project documentation and public-site architecture/refinement rather than prematurely committing to backend scope that may still change.

**Affected areas:**

- Project-wide
- Documentation
- Site architecture
- Development sequencing

**Implementation notes:**

- Establish `/docs` source-of-truth files.
- Preserve the existing Next.js-specific AGENTS rule.
- Carve/refine the marketing site next.
- Keep the project portal-ready.

**Supersedes:** None

---

### 2026-08-25 — Constrain customer ordering to a managed request workflow

**Source:** Client discussion relayed by user / Veriq  
**Status:** Active

**Decision:**

The intended online-ordering concept is not a full ecommerce, payment, inventory, invoicing, or IMS replacement. Approved customers may view protected pricing and enter quantities; if the managed ordering option is selected, the site submits an order request and Big Wicks staff finalize availability, substitutions, final amount, invoice, and fulfillment outside the website.

**Affected areas:**

- Authentication
- Catalog
- Pricing
- Orders
- Scope
- Security

**Implementation notes:**

- Approximately 200 products.
- Approximately 50 initial customers.
- Two pricing tiers.
- Prices hidden until authentication.
- No public self-registration in the current concept.
- No payment processing.
- No BoxHero integration.
- No live inventory promise.
- No full admin panel in the currently discussed managed-ordering scope.

**Supersedes:** Earlier exploratory ideas that drifted toward a broader inventory/admin/ecommerce system.

---

### 2026-08-23 — Preserve two functional proposal levels

**Source:** User / Veriq  
**Status:** Active pending final client selection

**Decision:**

Present a simpler customer-portal/manual-ordering level and a more involved managed online-order-submission level as distinct choices. Do not make the more complex option appear artificially necessary.

**Affected areas:**

- Scope
- Proposal
- Architecture
- Development sequencing

**Implementation notes:**

- Shared foundation can include account login, protected catalog, and customer-specific pricing.
- Managed submission adds persistence/order request creation and notification.
- Functionality unique to the more complex option should not be built merely because it may increase project value.

**Supersedes:** Any assumption that only the most complex option should be proposed.

---

### 2026-08-21 — Establish current public-site visual direction

**Source:** User / Veriq design work  
**Status:** Active

**Decision:**

Use Big Wicks' real storefront/interior imagery and a bold black/off-white/red visual system. The current typography uses Barlow for body/UI and Roboto Condensed for headings.

**Affected areas:**

- Brand
- Homepage
- Responsive design
- Assets

**Implementation notes:**

- Avoid generic AI-site styling.
- Keep the physical store and selection central to the retail experience.
- Portal UI should inherit the Big Wicks identity without becoming a marketing-heavy dashboard.

**Supersedes:** Earlier generic/template directions.
