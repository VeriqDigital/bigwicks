<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repository uses Next.js 16.2.x. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework-sensitive code and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Veriq Client Website — Codex Instructions

## Purpose

This repository contains a client website built or maintained by Veriq.

Veriq's standard is custom, intentional, conversion-focused web work. Reuse proven architecture when it improves speed and reliability, but never let a reused codebase make the finished website feel like a reskin of another client.

The website must ultimately feel like the client's brand — not Veriq's brand and not the brand of the project this repository may have originated from.

## Read This First

Before substantial work, read the relevant project documentation:

- `docs/PROJECT.md` — scope, goals, pages, features, status, constraints, and legacy-client cleanup targets
- `docs/BRAND.md` — visual direction, colors, typography, imagery, and voice
- `docs/CONTENT.md` — approved client facts, services, contact information, copy, claims, and forms
- `docs/SEO.md` — target searches, metadata, local SEO, schema, and technical SEO requirements
- `docs/DECISIONS.md` — latest client feedback and project decisions

Do not treat placeholders, TODOs, examples, or unconfirmed notes in those files as client facts.

## Source-of-Truth Rules

When information conflicts, use this order:

1. The user's current task or explicit instruction
2. Confirmed information in the project documentation
3. The current repository implementation
4. Legacy content inherited from a previous project

Never guess missing business information.

If a fact affects public-facing copy, contact routing, pricing, legal claims, credentials, service areas, testimonials, or business identity and it is not confirmed, preserve a clearly marked placeholder or report the gap instead of inventing an answer.

## Veriq Build Principles

### 1. Client identity comes first

- Follow the client's actual brand, audience, market, and goals.
- Do not force Veriq colors, typography, slogan, or visual language onto client sites.
- Do not add Veriq attribution unless the project explicitly calls for it.
- Make each site look intentionally designed for that business.

### 2. Reuse systems, not identities

It is acceptable to reuse strong layout patterns, components, utilities, form infrastructure, animations, or page architecture from previous Veriq work.

It is not acceptable to carry over:

- Previous-client names or slogans
- Phone numbers, emails, addresses, hours, domains, or social links
- Logos, favicons, OG images, photography, testimonials, reviews, or staff names
- Service lists, pricing, guarantees, certifications, awards, or claims
- Previous-client metadata, JSON-LD, schema, alt text, analytics IDs, form recipients, or structured data
- Brand-specific copy disguised as generic copy

When `docs/PROJECT.md` lists legacy identifiers, search the entire repository for them before considering the task complete.

### 3. Conversion before decoration

Every important page should make the next action obvious.

Before substantially designing or restructuring a page, identify its primary job.

- Each page should have one dominant objective and primary CTA.
- Secondary actions may exist, but they should not compete visually with the primary action.
- Do not add buttons or CTAs simply because there is available space.
- Structure the page so each section helps the visitor understand, trust, or act on the primary objective.
- If an element does none of those things, question whether it belongs.

Prefer:

- Clear value proposition
- Strong information hierarchy
- Useful service explanations
- Visible trust signals that are actually supported
- Prominent, descriptive calls to action
- Simple paths to call, request a quote, book, visit, or contact
- Mobile-first usability

Avoid decoration that competes with comprehension or conversion.

### 4. Deliberate visual design

Aim for polished, credible work that feels specific to the client's brand. "Modern" is not automatically the correct aesthetic; follow the visual language appropriate to the business, audience, and positioning.

Premium design usually comes from restraint rather than accumulation. Prefer strong typography, intentional whitespace, composition, hierarchy, and authentic brand assets over additional decorative UI.

Every visual element should earn its place. Do not add sections, cards, animations, gradients, icons, or effects merely to make the site feel more designed.

Avoid default "AI website" aesthetics such as:

- Unnecessary gradient overload
- Generic purple/blue SaaS styling unrelated to the client
- Glassmorphism used without a brand reason
- Endless identical rounded cards
- Decorative pills everywhere
- Random glow effects
- Excessive animation
- Generic stock imagery when authentic client imagery is available

Use whitespace, type scale, contrast, imagery, and composition intentionally.

#### Visual hierarchy

Every important section should have an intentional attention order.

Use size, contrast, spacing, typography, and placement to make it clear what the visitor should notice first, second, and third.

- Important elements should not compete at equal visual weight.
- Headings, supporting copy, proof, and actions should be visually distinguishable.
- Give important elements enough surrounding space to establish emphasis.
- Maintain consistent alignment and spacing systems across related sections.
- Do not make every heading, card, statistic, or CTA visually loud.

#### Typography

Typography should reinforce the client's positioning while remaining highly readable.

- Prefer one or two type families when they provide enough range.
- Avoid exceeding three type families unless the client's established brand system requires it.
- Use size, weight, spacing, line height, and contrast to create hierarchy before adding more fonts.
- Display typography may carry personality.
- Body typography should prioritize effortless reading.
- Do not choose a typeface because it is fashionable if it communicates the wrong character for the business.

#### Motion and interaction

Motion should support comprehension, feedback, hierarchy, or interaction — not become the experience itself.

Prefer subtle micro-interactions such as:

- Clear hover/focus feedback
- Small state changes
- Gentle entrance transitions when they improve flow
- Useful form and interaction feedback

Avoid:

- Scroll hijacking
- Animations that delay access to content
- Long page transitions
- Motion that forces the visitor to wait
- Elements flying in merely for spectacle
- Animation whose primary purpose is demonstrating technical ability

If removing an animation makes the page easier or faster to use without losing meaningful communication, remove it.

### 5. Responsive by default

The site must work well across phone, tablet, laptop, and large desktop widths.

Do not solve one breakpoint by breaking another.

Responsive design is not merely scaling the desktop layout down. At smaller viewports:

- Reconsider content order based on importance.
- Stack or restructure layouts when side-by-side composition no longer serves the hierarchy.
- Do not rely on hover to reveal essential information or actions.
- Keep important actions reachable and touch-friendly.
- Remove or simplify nonessential decorative elements when they create clutter.
- Preserve the intended attention order even when the layout changes substantially.

Pay special attention to:

- Navigation
- Hero cropping
- CTA visibility
- Long headings
- Card grids
- Forms
- Image focal points
- Horizontal overflow
- Sticky/fixed UI
- Tablet widths, not only phone and desktop

### 6. Performance and maintainability

Respect the repository's existing stack and package versions unless the user asks for a migration.

- Inspect `package.json` before assuming commands or versions.
- Prefer existing dependencies and patterns over adding new packages.
- Do not upgrade framework major versions as part of unrelated work.
- Prefer server-rendered/server components where appropriate.
- Keep client-side JavaScript purposeful.
- Optimize images and use the framework's image tooling when practical.
- Avoid duplicated components and duplicated content sources.
- Keep implementation understandable for future Veriq maintenance.
- Do not rewrite working architecture merely to make it different.

### 7. Accessibility is part of quality

Use semantic HTML and preserve keyboard and screen-reader usability.

At minimum:

- Logical heading hierarchy
- Meaningful link/button labels
- Form labels and helpful validation
- Alt text based on actual image purpose
- Adequate contrast
- Visible focus states
- Keyboard-accessible navigation and interactive elements
- Respect reduced-motion preferences when motion is substantial

### 8. Truthful client marketing

Never fabricate or imply unsupported facts.

Do not invent:

- "Best", "#1", "top-rated", or similar superiority claims
- Review counts or ratings
- Years in business
- Licenses, insurance, certifications, memberships, or awards
- Guarantees or warranties
- Service locations
- Prices or discounts
- Team members
- Testimonials
- Availability or response-time promises

Use only confirmed claims from `docs/CONTENT.md` or the user's current instruction.

### Trust and proof placement

Treat confirmed social proof as evidence supporting the claims made by the page.

When legitimate proof exists, place it near the point where it resolves uncertainty rather than automatically isolating all proof in one testimonial section.

Useful proof can include:

- Testimonials
- Reviews
- Specific customer outcomes
- Case studies
- Before/after work
- Client or partner logos
- Relevant project imagery
- Confirmed statistics or credentials

Strong claims should ideally have supporting evidence nearby when that evidence exists.

Never manufacture proof merely because the layout would benefit from it.

## Page Strategy and Information Architecture

For substantial new pages or major redesigns, establish the communication strategy before decorating the page.

Before choosing layout, determine:

1. What is this page's primary job?
2. Who is the intended visitor?
3. What does that visitor need to understand immediately?
4. What is the main value proposition or promise?
5. What proof is available to support it?
6. What should the visitor do next?

For important landing pages, especially the homepage, the first viewport should make it reasonably clear:

- Where the visitor is
- What the business offers
- Who or what it is for when relevant
- Why the visitor should care
- What action they should take next

Write or establish the important messaging before building layout around it. Design should strengthen the message, hierarchy, and action rather than compensate for unclear copy.

Do not generate sections merely to make a page feel complete. Each section should have a communication or conversion purpose and should appear in a deliberate order.

## Strategic Judgment

Do not treat every requested design idea as automatically beneficial to the website.

The user's explicit instruction remains authoritative, but when a proposed change appears to conflict with the confirmed brand, usability, accessibility, conversion goal, or project requirements:

1. Identify the concern briefly.
2. Explain the tradeoff concretely.
3. Recommend the stronger approach.
4. Follow the user's final decision.

Do not create disagreement over subjective preferences that have no meaningful downside. Reserve pushback for decisions that materially affect the site's goals or quality.

When evaluating a design decision, ask why it exists, what it helps the visitor understand, trust, or do, and whether it helps the right person take the right action.

## Content and Copy

Write like a strong local business website, not a brochure full of filler.

Prefer copy that is:

- Specific
- Useful
- Natural
- Easy to scan
- Focused on what the customer needs to know
- Consistent with the client's voice

Avoid:

- Empty buzzwords
- Overuse of em dashes
- Repeating the same benefit in every section
- Keyword stuffing
- Generic phrases that could describe any business
- Making the client sound larger, older, or more established than confirmed facts support

If existing copy is already approved, do not rewrite it without a reason tied to the task.

## Images and Assets

- Prefer authentic client-provided imagery when it is good enough for the placement.
- Preserve important subjects through responsive object positioning/cropping.
- Do not replace a strong real photo with stock photography merely for visual uniformity.
- Do not use another client's photos as temporary production content.
- Keep filenames understandable when adding or replacing assets.
- Remove unused legacy brand assets when safe to do so.
- Do not alter the client's logo unless specifically requested.

## Forms, Integrations, and Data

- Confirm the intended recipient or destination before routing production submissions.
- Never leave a previous client's email, phone number, API endpoint, calendar, analytics ID, or integration identifier in place.
- Never commit secrets or private credentials.
- Use environment variables for secrets and environment-specific values.
- Preserve spam prevention and validation already in use unless the task requires changes.
- If a form is intentionally non-functional in a demo, make that state explicit in project documentation and do not silently pretend it is live.

## SEO Standards

Follow `docs/SEO.md`.

At minimum, verify relevant pages have intentional:

- Title metadata
- Meta descriptions
- Canonicals where appropriate
- Open Graph/social metadata
- Semantic headings
- Internal links
- Useful alt text
- Sitemap/robots behavior
- Structured data only when the underlying facts are confirmed

For local businesses, write for real service intent and real geography. Do not create thin doorway pages or fake location coverage.

## Repository Hygiene

Do not make unrelated changes.

Do not:

- Reformat the entire repository for a small task
- Rename large numbers of files without benefit
- Replace lockfiles unnecessarily
- Delete working functionality merely because it is unused in the current screenshot
- Deploy, publish, transfer domains, change DNS, or alter production credentials unless explicitly requested

Keep temporary debugging code, logs, and throwaway assets out of the final patch.

## Required Legacy-Client Audit

For repurposed repositories, check more than visible page copy.

Search for legacy identifiers in:

- Source files
- Components
- Metadata
- `layout` files
- JSON/JSON-LD
- Manifests
- Sitemap/robots configuration
- Public assets and filenames
- Image alt text
- Email/form code
- Environment-variable examples
- Analytics/tracking setup
- README/docs
- Tests and fixtures

The list in `docs/PROJECT.md` is the primary cleanup checklist.

## Verification

Before finishing a meaningful implementation task:

1. Review the diff for accidental scope creep.
2. Run the repository's applicable lint, type-check, test, and/or build commands if available.
3. Fix issues introduced by the task.
4. Search for listed legacy-client identifiers when this is a repurposed build.
5. Check for obvious broken links, invalid routes, missing assets, and stale metadata.
6. If browser/preview tooling is available, inspect the changed UI at representative phone, tablet, and desktop widths.
7. Report anything that could not be verified.

Do not claim a check passed if it was not run.

## Definition of Done

A task is done when:

- The requested change is implemented
- The result matches the confirmed project and brand direction
- No unsupported client claims were introduced
- Relevant old-client residue has been removed
- Responsive behavior remains sound
- Accessibility and SEO have not been carelessly regressed
- Applicable validation passes, or failures are clearly explained
- The final summary is concise and states what changed, what was verified, and any remaining decisions the user needs to make
