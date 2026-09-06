# Big Wicks Fireworks — Brand Guide

## 1. Brand snapshot

**Brand name:** Big Wicks Fireworks  
**Legal name currently used in repository:** Big Wicks Fireworks LLC  
**Existing slogan in current metadata:** “Drive By The Rest… Stop At The Best!”  
**Current hero adaptation:** “Skip the rest. Shop with the best.”

Use the exact final slogan only after the user/client confirms which wording should be canonical.

### Brand in one sentence

A bold, approachable local fireworks store that should feel exciting and high-energy without becoming cheap, chaotic, childish, or gimmicky.

### Core traits

- Bold
- Energetic
- Local
- Approachable
- Practical
- Confident

### The website should feel

- Like a real destination worth driving to
- More personal than a giant fireworks chain
- Easy to shop and understand
- Visually energetic but controlled
- Authentic to the physical store

### The website should NOT feel

- Generic SaaS/tech
- Luxury for luxury's sake
- Juvenile/cartoonish
- Casino-like
- Overly corporate
- Like an AI-generated fireworks template
- Like an endless wall of glowing/gradient cards

---

## 2. Logo

### Primary logo

**Asset:** `public/Big wicks logo background removed.png`

Use the supplied logo rather than recreating the mark.

### Supporting app/social assets

- `app/icon.jpg`
- `app/opengraph-image.png`

Verify final social/favicon usage before launch.

### Logo rules

- Preserve aspect ratio.
- Do not recolor unless an approved variant exists.
- Avoid unnecessary shadows/outlines/effects.
- Maintain legibility on dark and light surfaces.
- Do not redraw the logo with text/CSS.

---

## 3. Color system

Current implemented palette:

| Role | Value | Usage |
|---|---:|---|
| Primary red | `#d62935` | Main CTA, focus, emphasis |
| Red hover | `#b91f29` | Primary interaction hover |
| Light background | `#f4f4f1` | Primary page background |
| Surface | `#ffffff` | Cards/forms/light surfaces |
| Deep surface | `#151517` | Dark sections/nav/hero support |
| Main text | `#171719` | Light-background text |
| Muted text | `#62625f` | Secondary text |
| Border | `#d5d5d0` | Subtle separation |
| Light red accent currently used | around `#ff5963` / `#ff5a65` | Dark-background emphasis |

### Color hierarchy

- Off-white/light neutral should carry most public-page surface area.
- Dark charcoal/black creates dramatic store/fireworks contrast.
- Red is the action/emphasis color and should stay intentional.
- Do not introduce unrelated blues/purples or rainbow gradients merely because the product category is colorful.

---

## 4. Typography

### Headings

**Font:** Roboto Condensed  
**Current weights:** 400 / 500 / 700  
**Role:** H1/H2, major display copy, bold retail statements

### Body / UI

**Font:** Barlow  
**Current weights:** 400 / 500 / 600 / 700  
**Role:** Body copy, navigation, labels, forms, buttons

### Type personality

Condensed, direct, retail/industrial, energetic, highly readable.

### Rules

- Use size/weight/spacing before adding extra fonts.
- Uppercase is appropriate for major display headings and labels, not every paragraph.
- Keep portal/catalog body copy and data extremely readable.
- Avoid overly stylized display fonts that compete with product information.

---

## 5. Layout and shape language

### Public marketing site

- Strong full-bleed or large-format authentic imagery
- Bold typographic hierarchy
- Generous but not luxury-editorial whitespace
- Strong section contrast between light and dark
- Subtle radii; current implementation commonly uses ~7px
- Restrained shadows/effects
- Avoid cardifying every piece of information

### Customer portal

The portal is **not** a separate SaaS brand.

- Keep Big Wicks typography/colors.
- Favor utility and density.
- Product tables/grids must be quick to scan.
- Quantities/prices/line totals should align predictably.
- Use persistent order-summary affordances only if they help rather than obscure catalog browsing.
- Avoid decorative motion and oversized marketing sections after login.

---

## 6. Hero direction

### Objective

Within a few seconds, a retail visitor should know:

- This is Big Wicks Fireworks
- It is a real physical store in La Porte, Indiana
- The store has a broad fireworks selection
- The immediate action is to browse the offering or visit the store

### Current preferred structure

- Eyebrow: Big Wicks Fireworks · La Porte, Indiana
- Bold condensed H1
- One short supporting paragraph
- Primary CTA: Shop Fireworks / explore selection
- Secondary CTA: Visit the Store / directions
- Authentic storefront photography

### Current hero asset

`public/images/store/big-wicks-storefront-front.jpg`

Preserve the storefront/sign as the visual focal point across breakpoints.

### Avoid

- Generic fireworks stock hero replacing authentic store imagery
- Excess copy
- Multiple competing CTA colors
- Firework-explosion overlays just for spectacle
- Autoplay video in the hero unless it materially improves the page and does not reintroduce flashing/FOUC/performance issues

---

## 7. Photography and imagery

Priority:

1. Authentic Big Wicks storefront/interior/product photography
2. Existing client/product demonstration assets
3. Carefully chosen supporting imagery only if necessary

Current authentic assets include:

- `public/images/store/big-wicks-storefront-front.jpg`
- `public/images/store/big-wicks-storefront-night.jpg`
- `public/images/store/big-wicks-interior-overview.jpg`
- `public/images/store/big-wicks-interior-aisle-cakes.jpg`
- Category images under `public/images/categories/`
- `public/videos/product-demo.mp4`
- `public/images/store/product-demo-poster.png`

Do not replace strong real photos with generic stock imagery for visual uniformity.

---

## 8. UI components

### Buttons

Primary:
- Solid Big Wicks red
- Strong readable label
- Minimal rounding
- Clear hover/focus state

Secondary:
- Neutral/dark/light outline treatment depending on background
- Must remain visually subordinate to primary CTA

### Cards

Use when they genuinely group categories, promotions, products, or actionable information. Avoid endless identical cards.

### Navigation

Public navigation should stay straightforward and local-retail oriented.

If a customer portal is added:
- “Customer Login” / “Account” should be visually discoverable without dominating the retail navigation.
- Logged-in portal navigation should prioritize Catalog, current order/cart/request state, account/help, and sign out.

### Forms

- Clean, obvious labels
- Strong error states
- Large touch targets
- No hidden essential instructions
- Order-entry fields should support keyboard-heavy desktop use as well as mobile

---

## 9. Motion

**Motion level:** Subtle

Allowed:
- Hover/focus feedback
- Small state transitions
- Useful form/order feedback
- Gentle reveal only where it helps page flow

Avoid:
- Scroll hijacking
- Long transitions
- Autoplay effects that delay content
- Motion on every section
- Large parallax on mobile
- Anything that makes a 200-product catalog harder to use

Respect reduced-motion preferences.

---

## 10. Voice and tone

### Voice

Direct, energetic, practical, friendly, confident.

### Copy should sound like

- People who actually work in a fireworks store
- A local business that knows the products
- Helpful without overexplaining
- Excited without sounding reckless or juvenile

### Copy should not sound like

- A B2B software company
- A generic ecommerce template
- An AI-generated brochure
- Aggressive hype with unsupported superiority claims
- Legal/safety promises that have not been supplied by the client

### Portal terminology

Prefer:
- Customer account
- Catalog
- Your price
- Quantity
- Order request / Submit order
- Big Wicks will confirm the order

Avoid calling the submission a completed “purchase” or implying payment/stock confirmation when those are not part of the system.

---

## 11. Responsive priorities

### Mobile

- Hero storefront focal point survives crop
- Visit/directions CTA remains easy to reach
- Navigation remains simple
- Catalog search/filter and quantity entry stay usable
- Order summary does not cover product controls
- No horizontal overflow

### Tablet

Pay special attention to:
- Nav transition
- Product grid/table breakpoints
- Quantity controls
- Sticky summaries
- Long product names/SKUs

### Desktop

Use width for:
- Better product scanning
- Dense but readable catalog data
- Fast keyboard/mouse quantity entry
- Strong photography and layout composition on public pages

---

## 12. Accessibility

- Preserve visible focus states.
- Maintain red/text contrast across light and dark backgrounds.
- Use semantic headings and labels.
- Do not rely on color alone for pricing/order/error states.
- Quantity controls and dialogs must be keyboard accessible.
- Announce order-submission errors/success appropriately.
- Respect reduced motion.

---

## 13. Final brand check

Before approval:

- [ ] Big Wicks logo/assets are used correctly
- [ ] Palette stays consistent
- [ ] Roboto Condensed + Barlow remain intentional
- [ ] Public site feels like a fireworks retailer, not SaaS
- [ ] Portal feels like Big Wicks, not a separate app template
- [ ] Authentic imagery remains the visual foundation
- [ ] No random glow/gradient/card overload
- [ ] Responsive crops and utility layouts are verified
