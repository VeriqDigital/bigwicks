# Independent application and readiness audit — 2026-09-19

Repository: `VeriqDigital/bigwicks`

Audited branch: `Site-Audit`

Audited HEAD: `46a54d86958f39b17bcaffbcb326c530d1ff20b2`

Mode: read-only investigation; this report is the only repository addition. No fixes were implemented.

## Executive verdict

**There is a small amount of worthwhile engineering work now. After those corrections, the substantial remaining work is client data and production operations. A rewrite or new portal features are not justified.**

| Readiness dimension | Assessment |
| --- | --- |
| Code | The authorized public site and private wholesale workflows are substantially implemented. Current authentication, tier isolation, order persistence, invitation coordination, and acting-admin revocation protections survived code review and isolated tests. Four findings remain: contact drafts disappear on returned errors; cross-page section links land at the top; the development seed can misidentify its database target; and three browser assertions still encode superseded public navigation. No new high/critical reachable application-security defect was established. |
| Client data/content | Not launch-ready on repository evidence. Approved assortment/content, independent tier prices, final currency, customer eligibility/tier assignments, mail identities/recipients, and final public business details remain approval gates. Documented nonproduction imports are not evidence of complete or approved production data. |
| Production configuration/operations | Not verified or certified. Provider configuration, target identity, runtime permissions, backups/restoration, migrations/bootstrap, mail deliverability, preview isolation, ingress trust, and staff monitoring require the existing configuration manifest and launch runbook. Tools and local rehearsals are present; actual deployment is a separate task. |
| Unverified | No live database, Sanity dataset, provider dashboard, real account, private environment file, or credential ledger was accessed. Full npm bulk auditing was blocked by network/approval restrictions; official advisory research was completed. Firefox fails before application navigation in this environment. Real Studio editing, deployed Linux/native dependencies, a clean dependency install, production browser behavior, and actual inbox delivery were not verified. |

The previous broad **“CODE READY — BLOCKED ON CLIENT/PRODUCTION CONFIG”** conclusion needs a qualification for the four current findings. This does not overturn the demonstrated security remediations or turn known content/configuration gates into missing application features.

## Baseline, authority, and scope

### Repository state

- The working tree was clean before investigation. Local `main`, cached `origin/main`, and read-only GitHub inspection of current `main` agreed with the audited HEAD; local ahead/behind counts were `0 / 0`.
- No open pull requests or relevant unmerged changes were found in the accessible repository inspection. The 25 enumerated GitHub branch tips were reconciled with available Git history; local `git branch -a --no-merged HEAD` was empty.
- `Milestone-8C` at `9fa1f3a0796cbf58c3dd0af6cd9187434e2a5626` is already merged by HEAD/PR #25. `main...Milestone-8C` reports `1 / 0`, with no tree difference. It is not an outstanding alternative implementation.
- All findings below concern the current checkout. No branch switching, fetching into local refs, merging, commits, PR creation, deployment, or application edits occurred.
- Before writing this report, SHA-256 comparison found **273 matching tracked files** in the disposable test copy, excluding environment files and the intentionally adapted test-isolation wrapper. Application source, existing assertions, schema, lockfile, and operator scripts were unchanged. The final working-tree change is this report only.

### Documentation and technical authorities

Read `AGENTS.md` and the required documents: `README.md`, `docs/PROJECT.md`, `docs/DECISIONS.md`, `docs/BRAND.md`, `docs/CONTENT.md`, `docs/SEO.md`, `docs/AUTH.md`, `docs/CATALOG.md`, `docs/ORDERING.md`, `docs/ONBOARDING.md`, `docs/SECURITY-AUDIT.md`, `docs/SECURITY-REMEDIATION.md`, `docs/PRODUCTION-READINESS.md`, `docs/PRODUCTION-CONFIGURATION.md`, and `docs/LAUNCH-RUNBOOK.md`. Also reviewed newer `docs/PUBLIC-DESIGN.md` and `docs/SEO-8B-VERIFICATION.md`. No applicable nested `AGENTS.md` was found.

Installed Next.js documentation under `node_modules/next/dist/docs/` was used for framework-sensitive review, including App Router authentication, forms/actions, navigation/Link scrolling, caching, metadata, images, and redirects. Sanity schema/GROQ guidance was applied to the content boundary. Current upstream security advisories were checked on **2026-09-19**, separately from historical audit statements.

Node was `24.20.0`. All 34 direct installed dependencies matched their locked resolutions. Important versions: Next.js/eslint-config-next `16.3.4`, React/react-dom `19.2.4`, Auth.js `5.0.0-beta.32` / core `0.41.3`, Prisma/client/adapter `7.10.0`, `pg` `8.23.0`, Sanity `6.12.0`, next-sanity `13.3.4`, sharp `0.35.4`, TypeScript `5.9.3`, Vitest `5.0.0`, and Playwright `1.63.0`. No dependencies were installed or upgraded in the checkout.

### Requirements-to-implementation map

| Current authorized requirement | Current implementation/evidence | Scope or readiness distinction |
| --- | --- | --- |
| Retail site promotes store visits/contact; wholesale marketing is public | `/`, `/contact`, `/fireworks-near-new-buffalo-mi`, `/wholesale`; `config/site.ts`, public components, route metadata, sitemap | The newer four-page public scope supersedes older root/contact-only SEO records. `/about` and `/services` intentionally redirect to homepage sections. |
| Existing wholesale users sign in through account dispatch | `/wholesale` links to `/account`; SQL-resolved CUSTOMER goes to `/portal`, ADMIN to `/admin`, anonymous to `/login` | Public navigation now says “Wholesale.” It is not meant to link directly to the account dispatcher. Tests still expecting that old behavior are stale. |
| Private catalog prices use the customer's current tier | `lib/auth/principal.ts`, `lib/catalog/service.ts`, `lib/catalog/content.ts`, SQL `ProductPrice` | SQL owns prices/accounts/orders. Sanity owns public product content. No customer-selected identity/tier is trusted. |
| Stable product identities survive editable names/SKUs | Sanity `catalogKey`, normalization, SQL composite price keys, onboarding mapping | Permanent UUID `catalogKey` is distinct from generated Sanity document IDs and mutable SKU/name. |
| Whole cases and independent prices | `lib/orders/input.ts`, `lib/catalog/money.ts`, tier rank and dynamic tier queries | Packing is descriptive supplier notation. Internal Unit Cost is discarded. Source Selling Price maps explicitly to Tier 2. No approximate percentage is used to derive Tier 1. Application supports additional configured tiers. |
| Review and submit wholesale order requests | `/portal`, review action, confirmation route, `lib/orders/service.ts`, immutable SQL snapshots | This is not payments, stock reservation, invoicing, fulfillment, customer order history, or post-submission editing. Those are not missing authorized features. |
| Staff can see saved requests even if email fails | `/admin/orders` and `/admin/orders/[reference]`, persisted notification state | Read-only staff visibility is implemented; it is not a full order-management system. Provider acceptance is not proof of inbox delivery. |
| Limited admin customer/pricing/content maintenance | Protected customer create/edit/status, CSV price preview/confirmation/export, protected Studio entry | Old proposals saying no admin area are superseded. Studio's local ADMIN gate does not substitute for Sanity's own account/dataset permissions. |
| Create-only customer batches and separately selected invitations | `lib/admin/customer-import*.ts`, `customer-invitations.ts`, account-token transactions | Milestone 5B explicitly authorizes these. Import sends no invitation; invitation batches require selection/review/confirmation. |
| Offline BoxHero mapping and guarded catalog onboarding | `scripts/onboarding/*`, `docs/ONBOARDING.md` | File mapping/import preparation is not a live BoxHero API or inventory integration. Missing images/prices and intentionally unavailable products remain onboarding gates. |
| Safe production provisioning and additional ADMIN creation | `scripts/production/*`, six migrations, 7C bootstrap and 7E add-admin workflows | Tooling exists. Initial bootstrap defaults to a read-only plan. Add-admin intentionally uses explicit target acknowledgements and hidden password confirmation without a dry-run/apply split. Actual production execution was not authorized or performed. |

Latest explicit decisions take precedence over old status paragraphs. In particular, 6E supersedes older “SEC-04 open” statements inside the retained 6B/6C/6D chronology; 7C/7D establish completed tooling/manifest work without claiming live setup; 7E adds the separate additional-admin CLI; and the current public design/8B SEO work supersedes older navigation and sitemap assumptions. Unconfirmed facts were not inferred from examples or TODOs.

## Confirmed findings

Severity reflects practical impact under the stated preconditions. “Reproduced” means observed in the isolated local application or a specifically identified parser reproduction, not in production.

### UX-01 — Failed contact submissions erase the visitor's draft

- **Severity:** Medium, conversion/reliability. **Confidence:** High. **Status:** Newly identified existing defect; not a regression of SEC-03 abuse controls.
- **Locations:** `components/contact/ContactForm.tsx:14–28` (`ContactForm`, action wiring and success-only explicit reset); uncontrolled fields at `44–55`, `67–78`, `90–100`, `112–125`, and `138–148`. `app/contact/actions.ts:58–90,126–138` (`submitContactForm`, normally returned error states).
- **Preconditions/scenario:** A visitor completes the inquiry and submits. The server rejects the phone value, has incomplete mail configuration, or receives a mail-provider failure. These are handled failures, not a component crash.
- **Expected:** Show the error and retain the name, email, phone, inquiry selection, and message for correction/retry. Clear after confirmed success.
- **Actual:** The error is displayed but all entered fields reset to their empty defaults. React's form action resolves normally when the application returns `{status: "error"}`, so uncontrolled fields reset. The component's separate success-only `form.reset()` does not prevent React's reset. This is consistent with the [React form-action contract](https://react.dev/reference/react-dom/components/form#handle-form-submission-with-an-action-prop) and the installed React DOM implementation.
- **Evidence:** A Chromium production-build reproduction waited for the contact form's own error alert and the end of pending submission. Missing configuration cleared four populated fields. A second reproduction used intercepted provider HTTP 503 and server-side invalid-phone validation; all five populated fields were empty afterward, with no captured successful email. An initial broad alert selector completed prematurely; it was replaced with a form-scoped error wait before accepting this result.
- **Impact:** Lost inquiry text makes ordinary correction or retry expensive and can lose a retail/wholesale lead precisely when the mail service has a temporary problem. Server validation and abuse protections continue to operate.
- **Smallest fix:** Preserve submitted values through handled failures, using controlled state or sanitized returned values/defaults compatible with React action resets. Clear only on success. No dependency or form-library change is needed. Existing customer admin forms already restore their submitted values; do not apply a blanket rewrite there.
- **Regression test:** Fill every field, trigger validation failure, quota rejection, missing configuration, provider failure/timeout, and assert values remain while error/pending states are correct. Confirm a successful intercepted send clears the form. Keep existing honeypot, Origin, quota, and safe-log checks.

### UX-02 — Cross-page section links are overridden by global scroll-to-top

- **Severity:** Medium, public navigation/conversion. **Confidence:** High. **Status:** Newly identified existing defect; not a missing destination or new page requirement.
- **Locations:** `components/layout/ScrollToTop.tsx:6–17` (`ScrollToTop` pathname effect), mounted at `app/layout.tsx:59`; section links in `config/site.ts:20,54–56,64–65`; navigation rendered by `components/layout/Navbar.tsx:60–69,112–124`.
- **Preconditions/scenario:** From `/contact`, select “Fireworks” (`/#shop`); from `/wholesale`, select “Visit” (`/#visit`). Client navigation changes the pathname to `/` and supplies a valid fragment.
- **Expected:** The requested homepage section is visible below the sticky navigation.
- **Actual:** The URL has the correct fragment, but the pathname effect calls `window.scrollTo({top: 0, ...})` and returns the visitor to the hero.
- **Evidence:** Both transitions reproduced at **390, 768, and 1440 CSS pixels** in Chromium. All six settled at `scrollY = 0`. The shop section remained approximately 836–962 pixels below the viewport top; Visit remained approximately 2,445–3,440 pixels below it. A desktop transition from the New Buffalo page to Shop also reproduced. A same-page homepage-to-Shop control scrolled correctly (`scrollY` approximately 738, target approximately 148 pixels from the viewport top).
- **Impact:** Primary navigation and visit-related links fail to deliver their promised destination. The existing fragment-existence check passes because the IDs exist; it does not verify arrival position.
- **Smallest fix:** Remove the redundant global scroll override if Next's default behavior meets the intended navigation contract, or preserve fragment and history restoration explicitly. Keep the approved public layout and destinations.
- **Regression test:** From each public route, exercise the homepage Shop/Deals/Visit destinations at phone/tablet/desktop widths and assert actual target visibility. Include same-page fragments, ordinary no-fragment navigation, mobile-menu closure, and Back/Forward behavior. Avoid asserting only the URL hash.

### OPS-SEED-01 — Development seed's loopback check differs from the database driver's target

- **Severity:** Low, operator safety with privileged credentials required. **Confidence:** High. **Status:** New guard defect, separate from historical bootstrap OPS-01 and the documented tunnel caveat.
- **Locations:** `prisma/seed.ts:7–13` (`main`, opt-in/production refusal and hostname check), `14–21` (hashes and unchanged connection string), `23–40` (fixture transaction). Installed driver chain: `node_modules/pg-connection-string/index.js:39–42,53–64`, `node_modules/pg/lib/connection-parameters.js:57–71`, `node_modules/@prisma/adapter-pg/dist/index.js:794–812`. Claims/tests: `docs/AUTH.md:232–235`, `docs/PRODUCTION-READINESS.md:139,197`, `tests/bootstrap/database.test.ts:187–194`.
- **Preconditions/scenario:** An operator explicitly enables `ALLOW_DEVELOPMENT_SEED`, runs outside production `NODE_ENV`, provides valid fixture passwords, and supplies usable database write credentials. A connection URI has a loopback authority but a different `host` query parameter.
- **Expected:** The local-only seed guard checks the effective target actually used by `pg`, rejecting a non-loopback target before connecting.
- **Actual:** The guard checks `new URL(connectionString).hostname`, while `pg-connection-string` lets the query `host` override that authority. The unchanged URI then reaches `PrismaPg`/`pg.Pool`.
- **Evidence:** A pure local parser reproduction disabled socket connect, DNS lookup, and fetch; it made no network request or database mutation. For `postgresql://fictional:fictional@localhost/fictional_seed?host=remote.example.test`, the application guard accepts `localhost`, but `pg` resolves the effective host to `remote.example.test`. An encoded query host with a `127.0.0.1` authority behaved the same. A plain loopback URI was the control. Subsequent fixture creation is established by code inspection, not by a remote seed attempt.
- **Impact:** With the above operator prerequisites, an unintended remote target could receive active fictional ADMIN/CUSTOMER accounts and initial tiers. Existing records are preserved by the upserts. This is not an anonymous web exploit, does not bypass the production-mode/opt-in checks, and is not invoked by build/startup.
- **Smallest fix:** Reject routing overrides with a narrow connection-query allowlist or validate the same normalized connection configuration passed to the driver. Check before hashing/connecting. The strict production target parser provides an existing pattern; avoid a new provisioning subsystem.
- **Regression test:** Cover plain, encoded, and duplicate `host` query parameters and relevant port/socket routing forms; normal loopback connections; production refusal; missing opt-in; and fixture-preserving reruns. Assert rejection occurs before any connection or write. Adjust the local-only documentation claim alongside the fix.

### TEST-01 — Browser tests retain the superseded wholesale navigation contract

- **Severity:** Low, verification/maintenance. **Confidence:** High. **Status:** Test regression following the authorized public navigation changes; not a demonstrated sign-in regression.
- **Locations:** `tests/e2e/auth.spec.ts:16–68` (two public navigation/dispatcher tests); `tests/e2e/catalog-ui.spec.ts:60–64,88` (public-prefetch exclusion and empty request assertion); `tests/run-integration.ts:64–70,128–142` (a failed first browser phase prevents the configured phase). Current implementation: `components/layout/Navbar.tsx:60–76,112–124`, `config/site.ts:54–58`, `app/wholesale/page.tsx`.
- **Preconditions/scenario:** Run the existing isolated browser integration flow against the current approved public site.
- **Expected:** Tests exercise “Wholesale” to `/wholesale`, then explicit existing-customer sign-in to `/account`, using the current 1024-pixel desktop breakpoint. Catalog interaction tests distinguish approved public route prefetch from catalog/auth requests.
- **Actual:** Two tests seek the removed “Wholesale Portal” direct-account link and use the old 1280-pixel breakpoint/old navigation assumptions. The catalog test permits public prefetch only for `/` and `/contact`; current `/wholesale` prefetch is recorded as forbidden interaction traffic.
- **Evidence:** Unconfigured Chromium pass: **17 passed, 2 failed, 15 intentionally skipped**; the two failures are the old navigation selectors. Configured pass, run separately in scratch to avoid that early stop: **18 passed, 1 failed**. The latter recorded three public `/wholesale?_rsc=...` requests at the final request-array assertion; preceding search/filter/sort checks passed. A new scratch check following the actual public flow passed for anonymous, CUSTOMER, and ADMIN, including absence of auth/account prefetch before clicking sign-in.
- **Impact:** The normal integration command is red and stops before configured coverage, reducing confidence in future changes and obscuring meaningful failures. Ignoring the entire suite or reverting the approved public page would both be inappropriate.
- **Smallest fix:** Update only the obsolete navigation selectors, flow, breakpoint, and explicit public-prefetch allowlist. Preserve direct-route authorization, role dispatch, no-auth-prefetch, and no-catalog-network assertions.
- **Regression test:** Run both original integration phases with updated expectations; require all Chromium assertions to pass. Add UX-02's arrival-position checks with the same navigation work. Track Firefox's independent startup limitation separately.

## End-to-end assessment and retained protections

### Authentication, authorization, and abuse

Code traces covered anonymous, CUSTOMER, ADMIN, disabled, stale-version, and same-tier-but-different-customer paths. `auth.ts:16–28` keeps the browser session to identity/version, resolves authorization from current SQL state, ignores forged role/tier updates, and funnels redirects through `/account`. `lib/auth/principal.ts` and `authorization.ts` protect reads independently of menus. Email/password/status changes invalidate the appropriate sessions/tokens; a tier change uses current SQL on the next protected operation rather than trusting the JWT's historical tier. Re-enabling a disabled account does not restore the old cookie.

Direct Auth.js callbacks, missing CSRF, forged claims, login throttling, protected mutations, revoked-admin reads, and customer ownership were exercised locally. Protected order confirmations reject another customer even when both customers share a pricing tier. Authorization failure does not expose order snapshots or another tier's prices.

`lib/auth/admin-transaction.ts:13–19` rechecks and SHARE-locks the acting administrator in protected mutation transactions. The reviewed customer/pricing/import callers retain that boundary. `lib/auth/account-tokens.ts:60–94` claims recipient state under lock after actor authorization; token consumption at `137–158` rechecks and invalidates appropriately. Tokens are random, stored hashed, bounded by expiry/use, and invalidated on relevant account changes. Invitation preview sealing, replay claims, recipient fingerprints, global/recipient quotas, and per-recipient result states remain present. Dedicated revocation and invitation concurrency tests passed.

The contact path now uses shared SQL quotas, fails closed when quota storage fails, bounds mail transport to ten seconds, and logs fixed/status-only diagnostics. Valid direct HTTP replay is limited; null/mismatched Origins are rejected. These protections do not depend on the honeypot or disabled submit button. Trusted ingress/client-IP configuration and upstream traffic capacity remain production checks, not repository-proven facts. The new contact finding concerns draft retention only.

### Catalog, prices, imports, and privacy

`lib/catalog/content.ts:7–21` selects explicit published content fields with no-store behavior and a bounded Sanity request; `normalize.ts:28–55` rejects invalid/duplicate permanent keys. `service.ts:14–42` resolves the current authorized tier and returns an explicit customer DTO. Unavailable and missing-price products are withheld; malformed content is not promoted into an orderable product. Missing content/configuration produces an honest unavailable/empty state.

Sanity schemas and onboarding public payloads do not contain private price/cost fields. BoxHero mapping discards internal cost and separates the approved public product artifact from private tier pricing. SQL pricing and order routes remain protected. Inspected public source/asset/import paths, local public HTML/RSC/metadata checks, customer HTML/RSC, exports, and direct route responses did not expose fictional private markers or unauthorized associations. This does not certify data already stored in an uninspected live public dataset.

Money conversion uses integer cents/BigInt and SQL Decimal storage, not floating-point accumulation. Whole-case quantities are bounded, item count is limited, and totals are constrained to the database precision. Tier prices are independent. Blank/remove, explicit zero, omitted rows, unknown products, duplicate keys, dynamic tiers, and stale/tampered previews have distinct handling. Pricing CSV validation limits file size, row count, and record length; spreadsheet-compatible exports escape formula-leading fields. Preview confirmation is actor-bound, current-state checked, and atomic; explicit removals require acknowledgement.

No new pricing-isolation, rounding, public price leak, or unsupported tier-derivation defect was established. The configured browser catalog request assertion failed for stale public prefetch expectations as TEST-01 describes, not because filtering contacted a private-price API.

### Orders and notification failure

`lib/orders/service.ts:21–63,71–120`, `review-token.ts:6–40`, `input.ts`, `reads.ts:16–42`, and the order migration were traced together. Review/submission resolves identity, active state, current tier, catalog availability, and prices on the server. Sealed review state binds the caller/customer/version and expiry; tampering and changed review inputs do not authorize a write. Submission locks/rechecks SQL state, uses a transaction and unique customer/submission identity, persists immutable line/account/price snapshots, and handles duplicate/recovery paths without trusting a client total.

All five configured order browser tests passed: normal submission, recovery after a lost response without a global error flash, immutable persisted confirmation/staff visibility, changed-price review and unavailable-item rejection, and email failure after persistence. Concurrent/replay/ownership invariants also passed at the database layer. A saved order remains available to staff when email fails; the UI does not tell the customer to recreate an already saved request merely because notification failed.

Sanity and SQL are not a distributed transaction, and email provider acceptance is not exactly-once inbox delivery. Those are documented system boundaries, not newly discovered defects. A deliberately new invitation can supersede an earlier in-flight message. Recovery ownership and staff monitoring must be established before customer access.

### Admin and operator tooling

Customer CSV import is bounded, normalized, create-only, and separate from sending invitations; arbitrary roles/passwords cannot be supplied through the public form schema. Selected invitation batches are limited to 25, preview/confirmation is sealed and time-bounded, and eligibility/state is rechecked per recipient. Browser tests covered 50 fictional imports without email, dynamic tiers, stale recipients, actor revocation during a provider call, accepted-versus-not-attempted results, and retryable failures.

Onboarding CSV/XLSX parsing, allowlisted public output, private pricing artifacts, no-overwrite checks, target acknowledgements, production opt-in, manifest hashes, and import planning were reviewed. Separate category/product commits and exclusive-writer assumptions are documented; no live Sanity write or atomic cross-provider guarantee was tested or claimed.

Production bootstrap checks target/TLS/query configuration, six migration records/checksums, empty/compatible state, table locks, hidden password handling, and create-only atomic initial tiers/ADMIN. Exact completed state is a no-op; unsafe/partially populated states are refused. Additional-admin tooling deliberately operates on a running database with explicit target/identity acknowledgements and preserves unrelated business records. **98 bootstrap/add-admin tests passed.** The seed target parser mismatch is narrower and separate. Build/start scripts contain no migration, seed, bootstrap, or invitation side effect.

### Public experience, accessibility, SEO, and performance

The approved red/black retail design, actual supplied imagery, typography, and store-visit/contact hierarchy were preserved. Public asset references and internal destinations resolved in local verification. No concrete legacy-client identifier list is supplied by `docs/PROJECT.md`; a repository-wide tracked filename/text scan, covering source, metadata/schema, assets, forms, docs, examples, and tests, found no identifiable previous-client residue. Existing Veriq attribution was not changed or treated as an unsolicited addition.

The four public pages have intentional unique metadata/canonicals and current public-only sitemap entries. `/about` and `/services` return 308 redirects to the intended homepage fragments. Protected/utility routes and token pages retain noindex behavior and appropriate headers; robots exclusions are not treated as access control. Store structured data uses public business content rather than private catalog/prices or invented ratings. Production origin, preview noindex/access protection, and final public fact approval remain separate gates.

Chromium checks covered mobile navigation and Escape/focus behavior, headings/labels/native form validation, FAQ keyboard behavior, video controls with no autoplay and `preload="none"`, sticky mobile action boundaries, image loading, and document overflow. No new broad responsive failure was identified. UX-01/02 are substantive exceptions. This was not a complete assistive-technology/WCAG certification or field performance audit; no real-device Core Web Vitals or production network measurements were taken.

Private catalog search/filter/sort is local after authorized data loading. The 200-product quantity/pricing cases fit the tested phone/tablet/desktop layouts, and the focused quantity input remained usable above the fixed summary. Scrollable pricing tables intentionally retain their columns. No evidence warrants new virtualization, a data-layer rewrite, or a redesign at this size.

### Reliability and environment separation

Database pool/connect limits, bounded Sanity/email operations, transaction timeouts, safe errors, shared SQL rate limits, and explicit configuration failures were reviewed. Outage tests fail closed for authorization/quotas, avoid pretending an unavailable catalog is complete, and preserve saved orders across notification failure. Logs in the exercised failure paths used fixed diagnostic categories/statuses rather than credentials, tokens, customer messages, or nested connection errors.

Preview configuration is not an automatic mail-recipient sandbox. The existing manifest's instruction to omit mail credentials by default and keep real customer data out of unapproved environments remains necessary. Real provider scopes, ingress trust, cookie behavior behind the deployed proxy, function durations for deferred reset mail, SQL limits/maintenance, backup retention, and recovery/monitoring ownership require operator verification. Source controls cannot establish those facts.

## Dependency assessment — checked 2026-09-19

A new bulk npm result was **not obtained**. The sandbox attempt returned a network access failure; an escalated attempt was rejected by automatic approval review because sending the repository's package names/versions to the public npm registry discloses dependency metadata. Explicit permission was requested and remained pending when this report was completed. No alternate bulk upload was attempted. The failed JSON is not a zero-vulnerability result.

Targeted official advisory research and locked/installed package inspection support the following narrower conclusions:

| Dependency/path | Current assessment and primary source |
| --- | --- |
| Next.js `16.3.4` | Outside the affected versions for the reviewed [Windows request-processing RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [Server Action CPU denial of service](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj), and [AVIF processing advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4). The first and AVIF fixes landed by 16.3.3; the action fix by 16.2.11. No later applicable Next advisory was identified in this review. This is not exhaustive proof against unknown issues. |
| sharp `0.35.4`, Windows libheif `1.23.2` | Resolutions include fixes for the reviewed [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) and [libheif advisory](https://github.com/strukturag/libheif/security/advisories/GHSA-g89c-p67h-r497). [Next 16.3.4's image change](https://github.com/vercel/next.js/pull/97949) and installed native metadata were checked. Local WebP/benign AVIF processing passed; malicious-image exploitation and deployment-platform native binaries were not tested. |
| React Server Components | The reviewed [React advisory](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g) applies to the named server-dom packages, not simply any package named React at `19.2.4`. Next vendors its RSC implementation; inspected compiled manifests reference `19.3.0-canary-cbb046ab-20260731` within the stable Next package. Do not raise a root-React vulnerability solely by comparing unrelated version strings. |
| `brace-expansion` `1.1.15` / `5.0.7` | Known affected transitive copies remain under development lint/minimatch paths; [official advisory](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-rgw5-rvv9-x895). No application request-to-attacker-controlled-glob path was found. A separate `5.0.9` copy is patched. |
| `js-yaml` `3.13.1` / `4.3.0` | Known affected transitive tooling/config paths; [official advisory](https://github.com/nodeca/js-yaml/security/advisories/GHSA-5p4m-2wfm-xmqj), fixes `3.15.1` / `4.3.1`. The public app does not accept YAML uploads; reviewed reachability is local configuration/framework detection. |
| `smol-toml` nested `1.5.2` | Affected transitive framework/config parser; root `1.8.0` is outside the [advisory's affected range](https://github.com/squirrelchat/smol-toml/security/advisories/GHSA-v3rj-xjv7-4jmq). No request-controlled TOML path was established. |
| `deepmerge-ts` `7.1.5` | Affected transitive Prisma/config dependency per [official advisory](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx). Reviewed use is configuration merging, not untrusted cyclic request graphs. |
| `mysql2` `3.15.3` | Transitive Prisma tooling includes affected code, but the application uses PostgreSQL and no MySQL connection path was found. Current official [authentication](https://github.com/sidorares/node-mysql2/security/advisories/GHSA-3f6p-5ww8-9rcr) and [compression](https://github.com/sidorares/node-mysql2/security/advisories/GHSA-rgwj-5xj2-c3m3) advisories were checked. The current authentication entry lists no patched version; do not repeat the historical report's claimed fixed-version boundary as current fact. |
| `uuid` `10.0.0` under `typeid-js` | Affected package copy exists, but the inspected caller uses v7, not the affected v3/v5/v6 buffer operations in the [official advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq). Other resolved copies are newer. |

These residual families remain dependency-maintenance items with conditional/local-tooling exposure, not six newly proven Internet-exploitable defects. No forced upgrade, automatic audit fix, or dependency churn is justified by a scanner count alone. A deliberate follow-up can remove affected transitive copies when supported and validate the owning toolchain.

The existing Sanity compatibility follow-up also remains open: installed Portable Text editor `8.1.2` declares React `^19.2.8`, while root React is `19.2.4`; the range does not match. Builds and intercepted Studio login mounting passed. Authenticated rich-text/image editing was not exercised, so neither “fully compatible” nor “editor broken” is established. Validate actual editing before staff handoff and then choose a supported version alignment if needed; do not treat this peer mismatch as a demonstrated security exploit.

## Reconciliation with previous audits

| Earlier item/conclusion | Current classification | Independent evidence / qualification |
| --- | --- | --- |
| SEC-01 / SEC-02 framework vulnerabilities | Still resolved for reviewed advisory ranges | Current pinned/installed Next 16.3.4, official sources above, successful production builds and focused framework requests. Actual deployed artifact/OS still unknown. |
| SEC-03 unrestricted contact email attempts | Still resolved | Shared SQL pre-send allowance, timeout/fail-closed source trace, 25 contact security cases, and direct HTTP replay/Origin tests passed. UX-01 is a separate form-state defect. |
| REL-01 competing invitation claims | Still resolved within documented contract | Recipient state/lock boundary traced; 30 dedicated concurrency cases and browser stale-recipient/partial-result cases passed. No claim of exactly-once inbox delivery or cancellation after provider acceptance. |
| SEC-04 acting-admin revocation gap | Still resolved | Transactional actor lock/recheck in current callers; 39 dedicated cases passed. Latest 6E record supersedes older retained “open” text. |
| Order submission navigation/lost-response correction | Still resolved | Both normal and lost-response browser submissions reached confirmation without the former global error flash; remaining order cases passed. |
| CODE-01 canonical/sitemap | Still resolved, older route inventory superseded | Rendered canonical/social/schema/robots/sitemap checks passed for four current public pages. Old two-route acceptance text is historical, not a demand to remove the newer pages. Fragment existence alone did not cover UX-02. |
| OPS-01 initial bootstrap tooling missing | Tooling/rehearsal resolved; production execution open | Current guarded CLI plus 98 bootstrap/add-admin tests. New OPS-SEED-01 concerns a different development command. |
| DEP-01 residual families | Still conditionally open | Current official sources and resolved paths above. Full refreshed bulk enumeration unavailable; applicability is not inferred from severity counts. |
| Sanity/React peer compatibility | Still open/unverified for real editing | Declared range mismatch confirmed; intercepted login mount is insufficient to prove editing compatibility. |
| CONFIG-01/02, DATA-01/02, OPS-02/03/04 | Still open or not verifiable here | No live provisioning, mail/DNS/preview inspection, complete client dataset, restore rehearsal, staff process, or permanent private mapping artifact was accessed. |
| Broad “no code work remains” interpretation | Superseded by this audit's narrow findings | UX-01/02 and OPS-SEED-01 merit fixes; TEST-01 makes the current browser gate red. No earlier fixed security finding was reopened solely from historical text. |

## Action classification

| Classification | Concrete work |
| --- | --- |
| **Fix now** | UX-01 draft retention; UX-02 section arrival; TEST-01 navigation/prefetch expectations; OPS-SEED-01 effective-target validation and focused regression tests. These need no client pricing/content decision. |
| **Before launch** | Include/recheck the fixes; establish a passing current Chromium gate; rebuild the reviewed lockfile on the actual deployment platform; complete the existing production configuration/runbook checks; validate real Studio editing if staff will use it; verify private access/indexing, mail smoke flows, order persistence/notification recovery, backups and rollback responsibility on the approved target. |
| **Waiting on client/operator** | Approved assortment and product content/images; final currency and independent complete tier prices; customer eligibility/tier data; permanent approved mapping/exclusions; public contact/address/hours/social/promotion sign-off; production origin and mail From/To identities, including staff order recipient; provider/DB/Sanity roles, target ownership, restore evidence, monitoring and invitation schedule. Missing inputs are not speculative coding tasks. |
| **Optional / can wait** | Bounded transitive dependency cleanup after supported-version research; consolidate superseded status summaries when their owners next update them; broader cross-browser/assistive-technology/performance measurements beyond the focused release checks. Firefox tooling investigation can proceed separately if that browser is a required acceptance target. |
| **Leave alone** | Current SQL/Sanity separation, permanent UUID identity, independent/dynamic tier pricing, case quantities, conservative missing-price/unavailable filtering, sealed previews, create-only imports, invitation claim semantics, saved-order snapshots/read-only staff visibility, and explicit operator CLIs. Do not add payments, stock sync/reservations, invoicing, fulfillment, order history/editing, or a general admin redesign without new authorization. |

The documentation records a nonproduction baseline of 302 products in 17 categories, all unavailable, 280 Tier 2 prices and 22 blanks, no Tier 1 price import, and missing product content/images. Those are **documented historical aggregates, not newly verified remote facts**. They explain why an intentionally empty customer assortment must not be “fixed” by making every product available or inventing prices.

## Verification log

### Isolation and scratch changes

All runners were inspected before execution. The audit copy was created from tracked files, omitting private environment files; only `.env.example` was read for configuration review. Scratch root:

```text
C:\Users\Micke\AppData\Local\Temp\bigwicks-audit-2026-09-19-k1ZJKe
```

In the commands below, `$A` denotes that exact path and `$S` denotes `$A\source`. These names are report shorthand, not production environment variables.

`$A\runner.cjs` launches Node in `$S` with an OS-only environment allowlist, random fictional authentication/fixture secrets, `.test` mail addresses, a dummy unreachable loopback database for non-database commands, blank Sanity configuration by default, fictional public origin, telemetry disabled, and `NODE_OPTIONS` loading `tests/security/isolation.cjs`. The preload prevents private `.env*` reads and external sockets/fetch; inspected mail/catalog/font interceptors supply local fixtures. Browsers use an unreachable loopback proxy with localhost bypass and intercepted external content. The public map was replaced at the network boundary with a local placeholder. No real email or client-service request was made.

Database runners allocated fresh random-port loopback PostgreSQL clusters, applied the six repository migrations, created fictional fixtures, and stopped only their own clusters using the inspected Windows cleanup path. They never reused an existing database. The bootstrap runner omitted application auth/mail configuration entirely. Actual public font CSS already available locally was used for the public screenshots; private integration builds used the existing font stub, so those screenshots do not prove private-page production typography.

The initial dependency junction was replaced by a full copy of installed `node_modules` into scratch after Turbopack rejected an out-of-root symlink. Generated Prisma files/build output remained in scratch. A read-only public asset junction was used; no assets were edited.

Temporary adaptations, all outside the checkout:

- `runner.cjs`: sanitized environment, exact executable dispatch, captured logs.
- `tests/security/isolation.cjs`: retained the existing security integration/configuration interception and selected Chromium after Firefox's independent smoke failure.
- `tests/audit-integration.ts`: copy of the inspected integration runner with a `--configured-only` continuation to run its otherwise blocked second phase. Existing application/test assertions were unchanged.
- `tests/public-site/audit-verify.mjs` and `audit-focused.mjs`: reused the disposable source/build, ran existing public checks, and added settled fragment-position/contact-state probes.
- `tests/security/audit-focused.ts`, `audit.config.ts`, and `audit.spec.ts`: existing focused framework/HTTP checks plus contact-failure reproductions and a check of the current wholesale dispatcher flow. The wholesale check's initial ambiguous repeated-CTA locator was narrowed to the hero, then rerun successfully.
- A network-disabled inline `pg-connection-string` parser probe established OPS-SEED-01 without opening a connection. No malicious payload, real target, or destructive test was used.

### Commands and outcomes

Commands are shown as invoked through the sanitized wrapper. The mapping to the repository executables is included so a passed subcommand is not confused with a wholly passing end-to-end integration run.

| Exact command/check | Ran/result | What it establishes / limit |
| --- | --- | --- |
| `git status --short`; `git rev-parse --abbrev-ref HEAD`; `git rev-parse HEAD`; `git rev-list --left-right --count HEAD...main`; `git rev-list --left-right --count HEAD...origin/main`; `git branch -a --no-merged HEAD`; GitHub read-only main/branch/open-PR inspection | PASS | Baseline and accessible-ref comparison above; no live application access. |
| `git rev-list --left-right --count main...Milestone-8C`; `git diff main...Milestone-8C` | PASS | Milestone already merged/no outstanding tree change. |
| `rg --files`; scoped `rg -n` searches across tracked source/docs/tests/assets and configuration; `git ls-files` inventory | Ran | Route, asset, legacy-identity, data-boundary, script and configuration inspection. No private environment values were read. |
| `node "$A\runner.cjs" generate` | PASS | Runs `node node_modules/prisma/build/index.js generate`; Prisma client generation without contacting a database. |
| `node "$A\runner.cjs" lint` | PASS | Runs `node node_modules/eslint/bin/eslint.js`; no application lint errors. |
| `node "$A\runner.cjs" typecheck` | PASS | Runs `next typegen` then `tsc --noEmit --incremental false`, after generation. No application type errors. |
| `node "$A\runner.cjs" unit` | PASS: 16 files, 322 tests | Runs `node node_modules/vitest/vitest.mjs run`; pure/unit behavior, not production connectivity. |
| `node "$A\runner.cjs" integration` | Database phase PASS: 28 files, 555 tests; initial build blocked by scratch dependency symlink | Runs `node --import tsx tests/run-integration.ts`; isolation substitutes `tests/security/integration.config.ts`, adding retained security reproductions to the base suite. Total comprises 322 unit, 133 integration, and 100 security tests, not 555 additional unique unit tests. Fresh migrations/fictional seed passed. Turbopack failure was the initial audit-copy layout, not application source. |
| `node "$A\runner.cjs" bootstrap` | First attempt 97/98 due audit harness injecting `AUTH_SECRET`; corrected harness rerun PASS: 3 files, 98 tests | Runs `node --import tsx tests/bootstrap/postgres.ts`; 40 unit and 58 database cases across bootstrap/add-admin, including concurrency, refusal, rollback, no-overwrite, migration and secrecy checks. The initial failure correctly caught test-environment contamination. Real interactive Windows TTY behavior was not freshly rehearsed. |
| `robocopy node_modules "$S\node_modules" /E /COPY:DAT /DCOPY:T /R:1 /W:1 /XJ /NFL /NDL /NJH /NJS /NP` | Completed; exit 1 means files copied | Replaced only the verified scratch dependency junction with local package copies. No install/upgrade or checkout dependency change. |
| `node "$A\runner.cjs" build` | PASS | Runs `node node_modules/next/dist/bin/next build` in production mode; Turbopack/static generation and dynamic private routes succeeded with mocked fonts and no live content. Configured fictional-Sanity build also passed in the later integration phase. |
| `node "$A\runner.cjs" tests/public-site/audit-verify.mjs --font-css "$A\public-fonts.css" --render-only "$S"` | Existing public checks PASS | Four public pages, metadata/indexing/assets/layout/interactions. Additional probes suggested UX-01/02; contact observation was repeated with a correct settled-error wait before inclusion. |
| `node "$A\runner.cjs" tests/public-site/audit-focused.mjs --font-css "$A\public-fonts.css" --render-only "$S"` | Reproduced UX-01/02 | Six cross-page transitions, same-page control, and missing-mail-config contact error. A passing defect-observation script is not a safety verdict. |
| `node "$A\runner.cjs" tests/security/browser-smoke.mjs` | BLOCKED: Firefox startup/tooling | Blank-page context creation fails with `Cannot read properties of undefined (reading '_page')` before navigating to the app. Do not attribute this to an application route. |
| `node "$A\runner.cjs" --import tsx tests/run-integration.ts --resume-isolated-browser-checks` | Chromium: 17 passed, 2 failed, 15 skipped | First/unconfigured pass. Both failures are TEST-01; skips explicitly require configured fixtures. Default full integration gate is not green. |
| `node "$A\runner.cjs" --import tsx tests/audit-integration.ts --resume-isolated-browser-checks --configured-only` | Configured build PASS; Chromium: 18 passed, 1 failed | Second phase independently exercised despite earlier failure. All five order, four pricing and four customer-batch checks passed; five of six catalog checks passed, with the remaining assertion described by TEST-01. |
| `node "$A\runner.cjs" --import tsx tests/security/audit-focused.ts --orders` | 5 passed, 1 scratch-selector failure | Existing two framework and two HTTP checks passed. New contact reproduction passed. New wholesale probe initially selected two intentional repeated CTAs; no application failure was inferred. |
| `node "$A\runner.cjs" --import tsx tests/security/audit-focused.ts --orders --wholesale-only` | PASS: 1 test, three roles | Corrected hero-scoped locator; anonymous/customer/admin public flow and no premature auth prefetch passed. |
| Inline Node `new URL(uri).hostname` versus `require('pg-connection-string').parse(uri).host`, with socket/DNS/fetch disabled and fictional URIs | Reproduced OPS-SEED-01 | Proves parser/guard disagreement only. No remote connection or remote fixture write was performed. |
| `npm.cmd audit --package-lock-only --json --ignore-scripts --registry=https://registry.npmjs.org --cache="$A\npm-cache"`, sanitized with empty user/global npm configuration | BLOCKED | Sandbox attempt failed network access. Escalation rejected by automatic approval review for dependency-metadata disclosure. No usable bulk result; public official advisory research continued without uploading the inventory. |
| Tracked-file SHA-256 comparison of checkout and `$S`, excluding environment files and intentional scratch isolation adaptation | PASS: 273 matching files | Confirms tested application/schema/package sources match the checkout. Additional scratch probes were not added to existing repository tests. |
| `git diff --check`; final `git status --short`; report whitespace/path checks | PASS; report only | No tracked implementation changes. No fixes are included in this audit. |

The first direct `npm --version` through PowerShell was refused by the local `npm.ps1` execution policy; executable paths were used afterward. Embedded PostgreSQL logged a restricted-token startup warning before its successful fallback. A known non-failing Node Gzip listener warning and Vitest config deprecation warning also appeared. These were not counted as application defects. No new clean `npm ci`, production deployment, or full cross-browser green run is claimed.

### Browser coverage actually exercised

| Surface / roles | Routes and states | Viewports/evidence |
| --- | --- | --- |
| Public anonymous retail/marketing | `/`, `/contact`, `/fireworks-near-new-buffalo-mi`, `/wholesale`; loaded assets, menu/focus/Escape, FAQ, video, labels/native validation, mobile action placement, links and metadata | Chromium at 360, 390, 430, 768, 1024, 1440, 1920 pixels wide, 900 high; overflow and page metrics captured. Metadata render checks at 390/768/1440. Cross-page fragment reproduction at 390/768/1440. |
| Public contact error paths | Missing mail config, provider 503, server-invalid phone; direct quota replay and bad Origins | Settled form values inspected in local production builds; all mail intercepted. Quota/timeout/fail-closed variants also covered at the server-test layer. |
| Anonymous/customer/admin auth | Login, `/account` dispatch, protected redirects, CSRF/forged claims, setup/reset, invalid/reused tokens, failed invitation, disabled/re-enabled and stale-session behavior | Existing Chromium auth/customer/token checks; responsive login/protected shells at phone/tablet/desktop. Old nav test failed early, so its full legacy width loop is not claimed as passed. New current-flow probe covered all three roles. |
| CUSTOMER catalog and orders | Configured/unconfigured/failing content; authorized tier, missing image/description, unavailable/unpriced/long products, query tampering, tier switch and cache behavior; quantity/review/confirmation, lost response, stale prices, unavailable item, failed notification | Catalog 390/768/1440/1920; order 390/768/1440, including 200 products and practical focused quantity entry. Same-tier ownership and revoked-admin reads covered directly over HTTP. |
| ADMIN customers/pricing/orders | Customer create/edit/conflict/status, import/template/preview, invitations/partial results; price export/import/stale/tampered previews, Tier 3 and 200 products; saved order list/detail | 390/768/1440 responsive browser assertions; pricing tables use intentional internal scrolling. Existing server/database tests cover mutation races beyond the UI. |
| Studio | Anonymous/customer denied, admin fallback without project; fictional configured Studio mounted to intercepted login-provider selection | 390/768/1440; no page error in checked mount. No real Sanity login, document editing, upload, or permissions validation. |
| Framework image route | Local optimization, invalid/missing/disallowed source, benign AVIF processing | Local HTTP only; no exploit payloads or production-native verification. |

Screenshots were manually inspected for homepage at 390/768/1440, contact at 390/768, New Buffalo at 1440, wholesale at 390/1440, order quantity entry at 390, order review at 768, pricing table at 1440, and stale invitation results at 390. Other listed sizes were exercised by browser assertions/captures, not all manually reviewed. Private screenshots used fictional data and the integration font stub. Scratch logs, traces, and images remain outside the repository and are not a durable production evidence archive.

## Recommended next work

Only these three small remediation batches are justified now:

1. **Contact error-state retention — UX-01.** Preserve the submitted draft through handled failures and clear after success. Acceptance: populated-field browser assertions for validation/configuration/quota/provider failures and success; unchanged server abuse/Origin/timeout tests; lint/typecheck and a production build.
2. **Section navigation and current browser contract — UX-02 + TEST-01.** Correct the global scroll behavior and align obsolete selectors/public-prefetch exclusions with the approved wholesale page. Acceptance: actual section visibility across all public entry routes at phone/tablet/desktop, same-page/no-hash/history controls, correct role dispatch with no auth prefetch, and both full Chromium integration phases passing. Keep Firefox startup work separate unless needed for the release acceptance target.
3. **Development seed effective-target guard — OPS-SEED-01.** Normalize/restrict the connection target before any connection, retain existing seed invariants, and update the narrow documentation claim. Acceptance: network-free hostile-query refusal tests, safe loopback control, production/opt-in refusal, unchanged fixture-preserving reruns, and the existing bootstrap/add-admin suite.

After those batches, **no further feature work, broad refactor, or redesign is justified by this audit**. Continue with the approved client-data checklist and production launch runbook; resolve dependency/editor compatibility through a bounded supported-version check rather than an automatic upgrade campaign. Do not interpret repository test success as authorization to provision, import, email, or launch.
