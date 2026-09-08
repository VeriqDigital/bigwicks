# Security remediation record

## Milestone 6C: public contact abuse protection

Remediation date: **2026-09-07**. SEC-03 is implemented locally for review from
PR #15's merged main, `eba664ea4be5a2dfdcd6b5158cdac0fc53100c60`. HEAD, local main,
origin/main and read-only `git ls-remote origin refs/heads/main` agreed. No merge
or deployment is part of this record. The [historical audit](SECURITY-AUDIT.md)
is unchanged; the dated Milestone 6B record below describes its earlier state.

### Abuse control and failure behavior

| Dimension | Identity before existing HMAC-SHA256 | Allowance |
| --- | --- | --- |
| Aggregate contact | `contact:global` | 30 attempts / 3,600 seconds |
| Validated email | `contact:email:` + trimmed, lowercased email | 3 attempts / 900 seconds |
| Source/IP | None asserted by application | Live ingress configuration gate |

Values and the **10,000 ms** transport timeout are centralized in
`lib/contact/policy.ts`. `lib/contact/rate-limit.ts` reuses `consumeBucket` and
the existing `LoginRateLimit` table; there is no schema, dependency, vendor or
environment-variable addition. SQL upserts atomically arbitrate each allowance
across processes sharing PostgreSQL and AUTH_SECRET. PostgreSQL time determines
fixed windows beginning with the first admitted attempt. These are not rolling
windows: adjacent windows permit a boundary burst. Three messages in 15 minutes
permits ordinary followups; 30/hour gives a small local-business form headroom
while bounding rotating-address transport attempts. Review against real usage
before release; neither number is a claim about measured traffic or provider quota.

Order is honeypot, unchanged field validation, mail configuration, global bucket,
expired-row cleanup, normalized-email bucket, then Resend. Malformed forms and
honeypots do **no database or transport work**. Missing mail configuration returns
the existing unavailable response without spending buckets. Global admission
counts even if the email bucket rejects, cleanup fails, or delivery fails. Counters
are not refunded and the two bucket operations are intentionally not a combined
transaction; this can underutilize allowances, never authorize extra sends.

Database/cleanup failure or absent/invalid AUTH_SECRET fails closed with the safe
unavailable response and existing phone fallback. A denied allowance returns the
same non-technical wait/retry/call message for either dimension, without limits
or bucket names. Existing field errors, honeypot apparent success, fixed configured
sender/recipient, validated submitted reply_to and plain-text mail remain intact.
Lowercasing applies to the limiter identity; reply_to retains the validated,
trimmed submitted address. No submitted recipient/from/reply_to override is used.

Resend uses `AbortSignal.timeout(10_000)`, matching account-mail convention. A
stalled fetch aborts with the same generic failure as network/HTTP errors. The
deadline covers outbound fetch, not total action time including database work;
it cannot retract mail already accepted by the provider. The action logs only
fixed messages or the numeric HTTP status, never caught Error objects/messages,
response bodies, keys, limiter identities, customer payloads or message contents.
Unique random idempotency keys remain for admitted messages and later followups;
idempotency is not treated as abuse control. No automatic send retry was added.

### Source trust, cleanup and production gates

Installed Next.js 16.3.4 guides `01-app/02-guides/data-security.md` and
`01-app/03-api-reference/04-functions/headers.md` were reviewed, together with
`dist/server/app-render/action-handler.js`. Reading incoming headers does not
establish trustworthy source identity. No live ingress configuration was inspected
or changed; no assumption is made that Vercel or another proxy overwrites a
particular IP header. The action consumes none of `x-forwarded-for`, `forwarded`
or `x-real-ip`. HTTP tests rotate these forged values without bypassing allowance.

Framework Origin protections/configuration are unchanged. Mismatched and literal
`Origin: null` are rejected before bucket/mail work in the local production test.
An omitted Origin is distinct: Next permits it with its existing warning path;
the test checks that application throttling still applies. This is not a new
Origin exemption and no `allowedOrigins` expansion was made.

Previously, login's admitted global attempts performed indexed expired-row
deletion. That exact SQL is now exported as `cleanupExpiredBuckets` and reused
by contact after global admission, preserving login behavior. Global-first
ordering limits contact email-row creation to at most 30/hour, even when addresses
rotate, and bounds cleanup invocations to the same allowance. Contact-only traffic
therefore cleans old rows without waiting for a login. On inactivity, a finite
expired residue can remain until the next globally admitted contact/login; it does
not grow without traffic. No scheduled cleanup or limiter rewrite is introduced.
Cleanup errors deny sending; tests preserve unexpired unrelated buckets.

Remaining limitations and release gates:

- An attacker can spend the shared allowance or target another email's bucket,
  temporarily denying legitimate inquiries. Email identity is not proof of mailbox
  ownership. Rotating identities cannot evade the aggregate cap.
- Rejected valid requests still cost application/database work. This bounds this
  email path, not arbitrary request volume, all Resend usage, DDoS, bots or spam.
  It guarantees neither availability nor inbox delivery.
- Before production, separately verify ingress/WAF per-source limits covering
  direct contact Server Action POSTs, trusted forwarding/host handling and Origin
  behavior over actual TLS. Establish request/body/duration limits and monitoring
  without customer payloads. No IP throttling is claimed here.
- Verify shared PostgreSQL/AUTH_SECRET configuration across instances, stable
  secret handling (rotation changes HMAC identities), provider quotas and confirmed
  contact routing. Tune allowance headroom using approved operational evidence.
- **REL-01 and SEC-04 remain open**, as do residual DEP-01 families, the Sanity
  peer warning and unrelated release gates. Their observation tests still describe
  those outstanding findings. No authentication, invitation, order or catalog
  behavior was redesigned.
- Existing UX limitation observed in browser verification: the uncontrolled form
  resets after a resolved action, including the new rate-limit error. The form
  component is unchanged; retaining drafts on failure is separate UX work.

### Verification

All application checks run through the existing isolated security wrapper with
fictional data, a fresh disposable loopback PostgreSQL cluster, sanitized source
copies/environment, intercepted email/Sanity and mocked build fonts. Browser egress
uses the existing blocked proxy. No real email, private environment file, customer
data, remote database/dataset, deployment, hosting/Resend/DNS configuration or
remote environment variable was accessed or changed.

- `node tests/security/run.mjs contact`: new scoped mode runs the existing full
  unit/database configuration, a fresh configured production build and only the
  contact HTTP/browser scenario. The database phase passed **433 tests in 24 files**,
  including 25 new contact cases and the inverted six-request SEC-03 reproduction.
  Login, reset, individual/bulk invitation and shared limiter tests passed.
  Source copy: `.test-runtime/security-source-ZqfxTr`. Its configured Next 16.3.4
  production build passed. The first browser run confirmed bounded HTTP replay
  and both Origin rejections, then failed on a new test selector matching both
  the form alert and Next's route announcer. Overall initial command exit was 1.
- `node tests/security/run.mjs focused .test-runtime/security-source-ZqfxTr`:
  **passed, exit 0**, final copy `.test-runtime/security-source-0kPvfy`. Reused the
  checked, unchanged application build with a fresh disposable database; **31
  security tests and all four HTTP/framework tests passed**. The selector is now
  scoped to the form. One browser submit plus six simultaneous captured POSTs
  yielded exactly three intercepted emails, then omitted-Origin and three
  viewport form retries added zero. Mismatched/literal-null Origins produced
  HTTP 500 without any bucket changes. Same-tier ownership/revoked admin reads
  and the existing image/Studio checks also passed. No unrelated full browser
  or Firefox order suite was rerun.
- `node tests/security/run.mjs lint`: passed.
- `node tests/security/run.mjs typecheck`: passed, including Prisma generation,
  Next route types and `tsc --noEmit --incremental false`.
- `git diff --check`: passed. Historical audit, package manifests/lockfile,
  framework configuration and public form component are unchanged. Project docs
  specify no previous-client identifier list for this patch; no brand assets or
  public business facts changed.

All three saved contact-alert screenshots (390/768/1440 widths) were visually
inspected; text is readable and automated horizontal-overflow assertions passed.
Existing Vite config-loader and nested-source workspace-root warnings remain.
External fonts/maps/provider delivery and live ingress are not verified by this
local intercepted harness. Build/test artifacts remain only under ignored paths.

Regression coverage includes normalized HMAC identity, sequential and simultaneous
same/rotating-email submissions with actual fetch-count assertions, validation,
honeypot, all limiter failure stages, expired-row cleanup/window reuse, fixed
recipient/reply_to, non-2xx/network safety, and an actual approximately ten-second
stalled-transport abort. No fake clock or sleep-only concurrency assertion is used.
The historical six-request reproduction now requires only three outbound attempts.
The HTTP scenario uses a real captured production Server Action body, concurrent
replays, Origin checks, and the existing rate-limit alert UI at 390/768/1440 widths.

## Milestone 6B: framework security remediation

## 2026-09-07 — Next.js 16.3.4

Scope: SEC-01, SEC-02 and the Next.js/sharp/PostCSS portions of DEP-01.
This is a local patch and verification record, not evidence of deployment.
The [Milestone 6A audit](SECURITY-AUDIT.md) remains unchanged as the historical
16.2.9 baseline. SEC-03, REL-01 and SEC-04 remain open.

The selected framework and its audited image/PostCSS dependencies are patched.
Both sanitized production builds, all applicable browser scenarios across the
targeted runs, lint/typecheck and the 408-test unit/database suite passed after
the test protocol corrections below. No application failure remains in the
completed checks; the separate release gates at the end remain outstanding.

### Starting point and target selection

- Started with a clean `Milestone-6B` branch at
  `032128b6b2a87005070714322ebd5243660c1719`, the merge of audit PR #14.
  Local `main`, `origin/main` and a read-only `git ls-remote origin refs/heads/main`
  check agreed on that commit. No audit work was implemented from an unmerged branch.
- Independently checked the [official advisory index](https://github.com/vercel/next.js/security/advisories),
  [July security release](https://nextjs.org/blog/july-2026-security-release),
  [August security release](https://nextjs.org/blog/august-2026-security-release),
  [16.3.4 release notes](https://github.com/vercel/next.js/releases/tag/v16.3.4)
  and public npm package metadata. As checked on this date, **16.3.4** was the
  latest stable Next.js release; no later published Next.js security fix was found.
  Next.js 16 is [Active LTS](https://nextjs.org/support-policy).
- Selected 16.3.4 instead of stopping at the audit's 16.3.3 minimum. The August
  emergency release disabled AVIF processing; the subsequent stable release
  [restores it with sharp >=0.35.4](https://github.com/vercel/next.js/pull/97949).
  It also includes the release's build/manifest fixes. The application still uses
  the default WebP output format and its existing image qualities.

### Addressed advisories

These are package-remediation conclusions from maintainer fixes and the inspected
installed tree. No destructive CPU, RCE or malicious native-image payload was run.
The audit's conditional reachability distinctions still apply.

| Audit item | Advisory | Resolution in this patch |
| --- | --- | --- |
| SEC-01 | [GHSA-p293-qw3h-jr36 / CVE-2026-75604](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) | Includes the 16.3.3 Windows-hosting fix. Deployment OS remains unverified. |
| SEC-02 | [GHSA-m99w-x7hq-7vfj](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj) | Includes the July Server Action CPU denial-of-service fix, first shipped in 16.2.11 and included in stable 16.3. |
| DEP-01, AVIF | [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), upstream [GHSA-g89c-p67h-r497](https://github.com/strukturag/libheif/security/advisories/GHSA-g89c-p67h-r497) | Updated Next-supported sharp/native tree; Windows runtime reports libheif 1.23.2. |
| DEP-01, sharp | [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) | sharp 0.35.4 with libvips 8.18.6 on the tested platform, beyond the audited vulnerable range. |
| DEP-01, proxy and rewrites | [GHSA-6gpp-xcg3-4w24](https://github.com/vercel/next.js/security/advisories/GHSA-6gpp-xcg3-4w24), [GHSA-p9j2-gv94-2wf4](https://github.com/vercel/next.js/security/advisories/GHSA-p9j2-gv94-2wf4) | Includes the July fixes; no proxy authorization or arbitrary rewrite destination introduced. |
| DEP-01, custom server and images | [GHSA-89xv-2m56-2m9x](https://github.com/vercel/next.js/security/advisories/GHSA-89xv-2m56-2m9x), [GHSA-q8wf-6r8g-63ch](https://github.com/vercel/next.js/security/advisories/GHSA-q8wf-6r8g-63ch) | Includes the July fixes; retains `next start`, local optimizer sources and the separate Sanity image loader. |
| DEP-01, actions | [GHSA-4c39-4ccg-62r3](https://github.com/vercel/next.js/security/advisories/GHSA-4c39-4ccg-62r3), [GHSA-955p-x3mx-jcvp](https://github.com/vercel/next.js/security/advisories/GHSA-955p-x3mx-jcvp) | Includes July action-body and endpoint-disclosure fixes; service authorization remains independent of action identifiers. |
| DEP-01, fetch cache | [GHSA-68g3-v927-f742](https://github.com/vercel/next.js/security/advisories/GHSA-68g3-v927-f742), [GHSA-4633-3j49-mh5q](https://github.com/vercel/next.js/security/advisories/GHSA-4633-3j49-mh5q) | Includes July body/cache fixes; private SQL and no-store catalog reads remain unchanged. |
| DEP-01, nested PostCSS | [GHSA-qx2v-qp2m-jg93](https://github.com/postcss/postcss/security/advisories/GHSA-qx2v-qp2m-jg93), [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q), [GHSA-r28c-9q8g-f849](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849), [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) | Next's nested 8.4.31 becomes 8.5.23, satisfying all four audited fixed ranges. |

### Resolved dependencies inspected

Paths below are relative to the repository. Both lock entries and installed
packages were inspected; `createRequire` from `next/package.json` confirmed what
Next actually resolves. Optional platform packages were inspected in the lockfile;
only the Windows x64 native binary was executed.

| Path | Before | After / evidence |
| --- | --- | --- |
| `package.json`: `next`, `eslint-config-next` | Exact 16.2.9 each | Exact **16.3.4** each; installed and locked versions agree |
| `node_modules/next`; `node_modules/eslint-config-next` | 16.2.9 | 16.3.4 |
| `node_modules/@next/env`, `@next/eslint-plugin-next`, `@next/swc-*` | 16.2.9 | 16.3.4; Windows x64 SWC exercised by both Turbopack builds |
| `node_modules/next/node_modules/postcss` | 8.4.31 | **8.5.23**, required exactly by Next |
| `node_modules/postcss` | 8.5.28 | 8.5.28, unchanged; this is a separate Tailwind/Vite resolution |
| `node_modules/sharp` | 0.34.5 | **0.35.4**, Next's optional requirement is `^0.35.4`; no override |
| `node_modules/@img/sharp-*` | 0.34.5 | 0.35.4; includes Windows x64 and the lock's platform variants |
| `node_modules/@img/sharp-libvips-*` | 1.2.4 | 1.3.3; matches [sharp's release](https://github.com/lovell/sharp/releases/tag/v0.35.4) |
| Native libraries loaded through sharp | Previous tree replaced | Windows reports **vips 8.18.6, heif 1.23.2** |
| `node_modules/@swc/helpers`; `node_modules/@emnapi/runtime` | 0.5.15; 1.11.1 | 0.5.23; 1.11.3, required transitive refresh for the selected framework/native tree |
| Root `react`, `react-dom`; Sanity packages | 19.2.4; existing pins | Unchanged |

Bundled RSC was inspected separately in both
`node_modules/next/dist/compiled/react-server-dom-turbopack/package.json` and
`react-server-dom-webpack/package.json`, along with their production server
implementations. These are Next-vendored `*-builtin` packages with no independent
package version. Their React peer/build identity is
`19.3.0-canary-cbb046ab-20260731`, also reflected in compiled React. This is part
of the **stable Next.js 16.3.4 artifact**, not a canary Next installation or a root
React upgrade. Framework advisories, rather than root React's version number,
govern the framework fix assessment.

The lockfile contains 42 changed/new package-version paths, all in this framework
and image dependency update (including two additional optional WASM platform
packages). npm also recalculated `dev`/`devOptional` metadata on unchanged
packages; their versions/integrities were not upgraded. There are no dependency
overrides, canary framework pins, unrelated direct upgrades or forced audit fixes.
Installation used npm 11.19.0 / Node 24.20.0, public npm, empty user/global npm
configuration, a workspace-local cache and `--ignore-scripts --no-audit --no-fund`.
The exact requested package arguments were `--save-exact next@16.3.4 eslint-config-next@16.3.4`.

### Compatibility changes

**No application, schema, CSS or Next configuration changes were required.**
Authentication/session revocation, customer DTOs and pricing, ordering and token
flows, imports, invitations and embedded Studio retain their implementations.
No new cache, navigation mode or experimental option was enabled by this patch.

The newly installed guides were read for data security, Server Actions, redirects,
CDN caching, no-store fetches, `after()`, not-found handling and images. Two test
protocol assumptions required adjustment:

1. Next's default RSC-header validation now returns an empty HTTP 307 to `?_rsc`
   for a raw RSC request without its cache-busting parameter. `auth.spec.ts` checks
   that precise response, follows it once, then keeps the original HTTP 200 RSC
   login-denial sentinel, no-store and no-private-content assertions. HTML still
   requires HTTP 307 to `/login`. See installed
   `node_modules/next/dist/docs/01-app/02-guides/cdn-caching.md` and
   `dist/server/base-server.js` within Next. The framework default was not disabled.
2. Fetch-based Server Action redirects now return HTTP 200 with
   `x-action-redirect`; progressive-enhancement form submissions still use 303.
   `orders.spec.ts` updates three exact status assertions and adds a destination
   assertion before aborting the simulated lost response. All navigation/history,
   error-flash, retry-payload, idempotency, notification and snapshot assertions
   remain. Evidence: installed `01-app/03-api-reference/04-functions/redirect.md`
   and `next/dist/server/app-render/action-handler.js`.

The isolated wrapper gained build-reuse modes so protocol-test corrections could
be checked without repeating the 408-test suite and successful production builds.
Reuse requires an existing build under `.test-runtime`, the same framework version
and matching application/configuration/lock inputs. `browsers` resumes from the
unconfigured build and performs the configured build; `orders` uses a configured
build for both browsers' order scenarios plus focused HTTP/framework checks.
Both still create/migrate/seed a fresh disposable database and use the audit's
environment/transport restrictions. New `framework.spec.ts` exercises benign
image optimization/native decoding and intercepted Studio loading.
The original audit observation assertions are unchanged.

### Verification actually run

All application checks used `tests/security/run.mjs`: sanitized source copies
without private `.env` files, a system-variable allowlist, fictional settings,
fresh loopback PostgreSQL and intercepted email/Sanity transports. Builds used
the audit's mocked Google Fonts responses. Browser egress was blocked by the
unreachable local proxy; the Studio check additionally intercepts all external
requests and never follows a provider login. Only public package metadata and
advisories were sent to public package/research services.

| Command / phase | Result |
| --- | --- |
| `node tests/security/run.mjs integration` | `.test-runtime/security-source-RaHwJQ`: **408 unit/database tests passed in 23 files**, including all six audit observations; six migrations passed. Unconfigured production build passed. First browser phase initially reported 16 passed / one failed / 20 mode skips because of the RSC-normalization assertion. Runner exit 1, not reported as a full pass. |
| `node tests/security/run.mjs browsers .test-runtime/security-source-RaHwJQ` | Final continuation `.test-runtime/security-source-JL7dIR`: unconfigured **17 Chromium passed / 20 configured-mode skips**; configured production build passed. Configured browser phase: 16 passed / six failed, all three old HTTP-303 order assertions in each browser. An earlier continuation also caught the normalization destination before the final RSC test correction. |
| `node tests/security/run.mjs orders .test-runtime/security-source-JL7dIR` | `.test-runtime/security-source-H7smve`: **all 10 order scenarios passed (five Chromium, five Firefox)**, including normal/lost-response submission, history, persistence, snapshots and direct authorization. Three of four focused HTTP/framework tests passed. The new image test incorrectly expected the optimizer's missing-image response to be 404; Next rejects the missing route's non-image body with 400. Overall exit 1 for that new test expectation only. |
| `node tests/security/run.mjs focused .test-runtime/security-source-JL7dIR` | `.test-runtime/security-source-fz1GP8`: **six unchanged audit observations and all four HTTP/framework tests passed; exit 0**. Image assertions now separately require raw missing route 404 and optimizer 400 with its exact invalid-image message, matching installed `image-optimizer.js`. Valid local PNG-to-WebP optimization, disallowed remote source 400 and benign 2x2 AVIF encode/decode also passed. Studio reached the mocked provider chooser without a page error at 390/768/1440 widths. |
| `node tests/security/run.mjs lint` | **Passed**, final source copy `.test-runtime/security-source-4hDYqV`, after all test/harness edits. |
| `node tests/security/run.mjs typecheck` | **Passed**, final source copy `.test-runtime/security-source-o6Kpbr`, including Prisma generation, Next route type generation and `tsc --noEmit --incremental false`. |
| `node tests/security/inspect.mjs dependencies` | Completed against the new locked/installed tree. No Next/sharp/PostCSS matches in the npm bulk response; **six other package families / 12 unique GHSA identifiers remain**. Primary Next advisories were checked separately because the audit established feed lag. |
| `git diff --check`; historical audit comparison | **Passed**. `docs/SECURITY-AUDIT.md`, `tests/security/reproductions.test.ts` and `tests/security/http.spec.ts` are unchanged from the merged baseline. |

Coverage includes direct Server Action role checks and mismatched/literal-null
Origin rejection; customer-specific HTML/RSC markers and same-tier order denial;
session/account setup/reset/revocation; pricing and customer preview tampering,
stale state and explicit confirmation; catalog failures/missing images; and
unconfigured Studio authorization/fallback. Six representative saved screenshots
were also visually inspected: public desktop navigation, phone Studio fallback
and order confirmation, tablet customer import preview, desktop pricing preview
and configured Studio. Layout and CSS were present without observed overflow in
those views; broader existing responsive assertions passed at their tested widths.
Screenshots are retained only in the ignored source-copy test-results directories.

The mode skips are not passes. The configured run explicitly executes all five
Firefox order scenarios. Unit tests are already included in the integration
configuration; no separate duplicate unit suite was run. Passing the unchanged
audit observations still reproduces SEC-03, REL-01 and SEC-04, not their remediation.

### Firefox startup investigation

Playwright remains 1.63.0, with its installed Firefox 155.0, revision 1543.
The blocked blank-page launch was reproduced with `DEBUG=pw:browser,pw:protocol`:
Firefox logged `Failed to launch tab subprocess @SB::LA::SpawnTarget
(Error: -2147024809)`, followed by a page crash/detach and Playwright's undefined
`_page` error. This occurred before application navigation.

Running the identical sanitized, outbound-blocked blank-page harness outside the
restricted process sandbox succeeded. The configured application suite then
opened Firefox pages and executed all five scenarios. No Firefox security flags,
browser version changes, assertion removal or test skips were used as a workaround.
Initial application-run failures in both browsers were the documented action
status expectation above, separate from the startup tooling limitation.
The final order run passed **all five Firefox scenarios**, not skipped scenarios.
Local diagnostic logs remain ignored at `.test-runtime/firefox-startup-6b.log`
and `.test-runtime/firefox-startup-6b-unsandboxed.log`.

### Remaining findings and deployment verification

- **SEC-03, REL-01, SEC-04:** unchanged and open. Contact replay still needs an
  effective abuse control; concurrent invitation campaigns and strict in-flight
  admin revocation retain the audit's operational decisions/gates.
- **Residual DEP-01:** unchanged brace-expansion 1.1.15 and nested 5.0.7 (lint/tool
  paths); js-yaml 4.3.0 and `@vercel/frameworks/node_modules/js-yaml` 3.13.1;
  nested smol-toml 1.5.2; `typeid-js/node_modules/uuid` 10.0.0;
  `@prisma/config -> deepmerge-ts` 7.1.5; `prisma -> mysql2` 3.15.3.
  Their exact advisories and reachability are retained in DEP-01 of the audit.
  Fix through separately reviewed compatible lint/Sanity/Prisma dependency updates.
  No guessed override resolves the MySQL compression issue with no listed fix.
  npm's changed dev/optional labels do not establish HTTP reachability; the
  application still uses PostgreSQL and no web YAML/TOML/glob input path was added.
- **Existing peer warning:** `sanity -> @portabletext/editor@8.1.2` requests
  React `^19.2.8`, while root React is 19.2.4. Both the baseline lock and new lock
  contain that same requirement. npm reported it during installation. Sanity/React
  remain unchanged; a separate compatible update and editor verification are
  needed. A mocked Studio login screen does not certify editing/Portable Text.
- **Tool/build limits:** nested sanitized copies produce Next workspace-root
  inference warnings; Vite warns about a future native config-loader default.
  The configured browser run also emitted a Node Gzip listener-count warning,
  without a demonstrated application failure; no warning suppression was added.
  Real Google Fonts and external map/media delivery are not
  verified by fixture-based builds. Windows x64 was tested; deployment-platform
  native binaries and clean installation/build at the actual target remain
  outstanding. No dependency lifecycle hooks were run during this installation;
  the required Prisma generation was run explicitly in isolation.
- **Before deployment:** recheck advisories; verify the deployed artifact resolves
  Next/eslint-config-next 16.3.4, the patched nested PostCSS and sharp/native tree;
  exercise authenticated HTML/RSC and direct Server Actions through actual TLS,
  host/origin forwarding and CDN cache rules, including `_rsc` preservation;
  confirm successful/recovered order navigation and notification behavior.
  Verify live Sanity auth/CORS/membership/editor behavior, environment separation,
  account mail routing, action duration/`after()` execution, migrations/backups
  and remaining release gates from audit section F in a separately authorized run.

No private environment file, remote database/dataset, real customer import, real
email, hosting setting or deployed service was used or changed. No push, merge
or deployment was performed.
