# Milestone 8A — Public design and conversion

Baseline: updated main `0c2a9e2`. Scope is the public retail presentation only.
The existing logo, storefront/interior/category photography, fonts, color palette,
video and business facts are retained. No new imagery, dependency, tracking or
private application behavior is introduced.

## Design and page structure

The previous page repeated a large heading, explanatory paragraph and bordered
card grid across selection, deals, story and benefits. Three separate sections
made overlapping selection/local-service claims. Directions competed with a
primary button that only scrolled farther down the page.

| Before | After |
| --- | --- |
| Hero → trust strip → categories → deals → About → selection showcase → Why Big Wicks → video → location → FAQ → final CTA | Hero → quick facts → editorial selection → compact value band → visit → combined store story → portrait demo → compact FAQ → directions/call CTA |

- **Hero:** same slogan and real storefront; Get Directions is primary, Explore
  The Selection secondary. The sign stays visible; mobile gives the photo its own
  space above the message. Exact proximity comes from `config/site.ts`.
- **Navigation:** Fireworks, Deals, Visit, Contact, Wholesale, plus Get Directions.
  Wholesale has a separating rule and still links to `/account` without prefetch.
  The logo remains the home link; Escape returns focus to the mobile menu button.
- **Selection:** all eight categories remain. Four unequal large photo tiles and
  four smaller supporting images replace eight identical white cards. Category
  copy and the shared visit link describe in-store shopping, not online checkout.
- **Value:** a compact red composition replaces three generic deal cards. It invites
  shoppers to discuss a budget and ask about current deals without advertising an
  unconfirmed BOGO, discount, price or deadline.
- **Visit:** moves from ninth to fifth in the flow. Address, phone, all seven days
  of hours, directions, real storefront and a smaller lazy map sit together.
- **Story:** AboutSection now integrates SelectionShowcase and WhyChooseSection.
  The real interior photos do the proof work; unsupported customer-feedback
  framing, chain comparisons and age-of-business wording are removed. The two
  concise proof rows can accommodate approved reviews later; no testimonials or
  ratings are fabricated. Existing `#about` and `#why-big-wicks` links still work.
- **Video:** the original 576×1024 demonstration keeps its portrait proportions,
  native controls, inline playback and poster. `preload="none"` avoids fetching
  video data before interaction. It never autoplays.
- **FAQ/final CTA:** smaller heading scale and dividing rules replace repeated
  cards. Buttons retain expanded state, keyboard behavior and persistent answer
  targets. The final action is directions or a call.
- **Contact:** tighter intro with directions/call, the original form and validation,
  and a more compact photo/contact/hours sidebar. Form changes are introductory
  copy only; the server action, abuse limiter, recipient and Resend code are intact.
- **Copy:** the section containing “We carry everythin!” is rewritten; overbroad
  “We have it all,” repetitive copy and unsupported review themes are removed.

## Mobile behavior

The fixed action bar offers Directions and Call below 768px, with 44px minimum
targets and safe-area padding. Only Home and Contact mount it. It hides while the
menu is open, while a contact input is focused, and when the footer enters view.
Scroll padding protects focused/anchor content; footer padding provides a fallback.
The footer uses two columns on phones to reduce its height. No animation dependency
is added; existing reduced-motion behavior remains.

## Verification

Use Node 24 from the repository root:

```text
node tests/public-site/fonts.mjs
node tests/public-site/verify.mjs --font-css .test-runtime/public-fonts.css
git diff --check
```

The first command only downloads the existing Barlow and Roboto Condensed fonts
from Google Fonts into ignored local CSS. It is separate from the isolated test.
The verification runner copies reviewed source without `.env*`, uses fictional
configuration and an unreachable loopback database, and blocks external browser
traffic. It generates Prisma, runs the nine existing SEO tests, lint, route type
generation, TypeScript and a default Turbopack production build before browser checks.

The build reuses the existing font-transport stub; the browser receives the actual
font bytes from the local fixture for visual inspection. This avoids the installed
Turbopack's local-font-mock URL failure without changing production font loading.
The map is replaced **only in the test browser** by an isolated-preview placeholder.
Its real URL and directions links are preserved in the application. Live map
rendering, email delivery and live provider configuration are not verified here.

The browser checks both public routes at 360, 390, 430, 768, 1024, 1440 and 1920px:
overflow/clipping, image loads, navigation, actions, FAQ keyboard behavior, native
contact validity without submission, video metadata, links, and retail-action
absence on private/utility routes. Canonicals, metadata, Store JSON-LD, sitemap,
robots, redirects and private noindex/headers are checked as regressions.
Screenshots are saved at 390, 768 and 1440px for both pages, with desktop section
details and a JSON height/visit-position report under the printed isolated folder.
`--baseline` compares the current HEAD version; `--render-only FOLDER` rechecks an
existing build only when its source still matches the checkout.

## Facts and deferred work

The reviewed comparison at 390px reduces homepage height from 17,613px to 8,696px
(51% shorter) and moves the visit section from 11,914px to 3,062px. At 1440px,
homepage height drops from 10,201px to 5,944px (42% shorter); the visit section
moves from 6,702px to 2,372px. These are rendered-page measurements with the same
actual font fixture and default FAQ state, not performance or conversion-rate claims.

The values in `config/site.ts` are preserved as instructed. Client reconfirmation
is still needed for address, phone, email, hours, social URLs and the New Buffalo
proximity wording. Current promotions, brand availability and the final canonical
slogan also need confirmation before launch. No current promotion is invented.

Milestone 8B remains responsible for further SEO architecture/content strategy.
No new location pages, metadata rewrite, schema expansion, rating markup, analytics
or Search Console/GBP work is included. Root/contact canonicals, Store JSON-LD,
sitemap, robots, redirects and private indexing protections remain unchanged.
No merge, deployment, real account, database mutation or email is authorized by
this design milestone.

## Changed files

- `app/page.tsx`, `app/contact/page.tsx`, new `app/public.css`
- `components/layout/Navbar.tsx`, `Footer.tsx`, new `MobileActions.tsx`
- Existing public sections: Hero, TrustStrip, CategorySection, DealsSection,
  AboutSection, SelectionShowcase, WhyChooseSection, LocationSection, DemoSection,
  FAQ and ContactCtaSection
- `components/contact/ContactForm.tsx` (intro copy only)
- `config/site.ts` (navigation labels/links only), `data/fireworks.ts` (unused
  unsupported review themes removed), `data/faq.ts` (configured proximity reused)
- `tests/public-site/fonts.mjs`, `tests/public-site/verify.mjs`, this document
