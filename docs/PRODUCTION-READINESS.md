# Milestone 7A — Production readiness

Audit date: **2026-09-08**. Source baseline: `1129cbf` (merged PR #18 / Milestone
6E), on clean `Milestone-7A`. `git fetch origin main` confirmed that remote main
still matched this commit. This is a repository audit, not a live-service audit.

Milestone **7B update, 2026-09-08**: SEO completion starts at merged PR #19,
`adb8fd1`; fetched `origin/main` matches that baseline. The original 7A evidence
below remains dated history; current SEO results and verification are recorded here.

Milestone **7C update, 2026-09-08**: starts at merged PR #20, `6f0d880`, matching
fetched `origin/main`. OPS-01 tooling and disposable-database rehearsal are complete;
actual production bootstrap execution remains a separately authorized live gate.

Milestone **7D update, 2026-09-08**: refreshed `main` / `origin/main` at `7b4fa65`
(merged PR #21). [PRODUCTION-CONFIGURATION.md](PRODUCTION-CONFIGURATION.md) is now
the authoritative environment/target sheet and live verification ledger. Its
manifest/review is complete; CONFIG-01/02 and OPS-02 remain open. No live provider
settings were authenticated/verified. Local link/configuration metadata identifies
candidate Vercel `bigwicks`, a pooled Neon connection with owner-named role and
unsupported bootstrap `channel_binding` option, and a local Sanity write token.
These are local observations, not Production identities or Vercel scope evidence.
No live SQL, Sanity content, migration/bootstrap/import, mail, deploy or DNS change.

## 1. Executive assessment

**A. CODE READY — BLOCKED ON CLIENT/PRODUCTION CONFIG.** Milestone 7B resolves
CODE-01 with an explicit homepage canonical, a URL-only public sitemap and its
robots reference. Focused tests and an isolated production build/render check pass.
No additional repository code blocker was established in this bounded SEO review.
This is **not public-launch approval**; configuration, client data, bootstrap and
live verification remain outstanding. The original 7A verdict was B solely for
this SEO acceptance gap; completed security remediations remain intact.

Production bootstrap is also **not yet cleared**: the production database/dataset,
credentials, backup/restore evidence, actual first-admin execution, client
pricing, availability and recipients remain unverified or missing. No production
catalog/pricing/customer import or invitation has occurred, per the user.
7C supplies the guarded `db:bootstrap` procedure and local evidence; it did not
connect to Preview/Production or create a real ADMIN.

[LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md) is the authoritative release order. Its
commands are future operator instructions and do not authorize execution. This
task did not deploy, merge, change DNS/configuration, read private environment
files or customer files, contact application services, import data or send email.
Only public dependency research and local checks were performed.

## 2. Current verified state and evidence boundary

| Area | Evidence and conclusion |
| --- | --- |
| Baseline | Clean checkout; fetched `origin/main` and HEAD agree on PR #18. No feature/security rollback is proposed. |
| Framework | Installed and locked Next / eslint-config-next 16.3.4, React / react-dom 19.2.4; Node engine 24.x, local Node 24.20.0. |
| Security sequence | Source contains SEC-03 SQL contact limits, REL-01 recipient-state claims and SEC-04 acting-admin transaction locks. Prior verification is in [SECURITY-REMEDIATION.md](SECURITY-REMEDIATION.md); [SECURITY-AUDIT.md](SECURITY-AUDIT.md) is unchanged historical evidence. |
| Data separation | Public Sanity content, private PostgreSQL prices/accounts/orders; explicit customer DTOs and current server authorization. See `lib/catalog`, `lib/orders`, `lib/pricing`, `lib/admin`, `lib/auth`. |
| Nonproduction data | **User-confirmed, not remotely rechecked:** `sim96pgy/development`, 302 real products, 17 categories, prior import verification 302 unchanged / 0 new / 0 updates / 0 errors. All unavailable; images/descriptions missing. |
| Nonproduction prices | **User-confirmed:** Preview has 280 Tier 2 rows, 22 unresolved/blank; Tier 1 has zero rows. No percentage derivation. |
| Production data | **User-confirmed:** no production catalog/prices, real customer import or real invitation campaign. No claim that an otherwise empty production service already exists. |
| Tracked hosting configuration | `package.json`, `next.config.ts`, route duration/runtime exports; no tracked `vercel.json`, Vercel project/environment scope configuration, CI deployment workflow or `.openai/hosting.json`. Ignored `.vercel` settings were not read. |
| Business facts | [CONTENT.md](CONTENT.md) still marks phone, email, address, proximity, hours, social links and slogan for confirmation. Existing implementation is not client approval. |

Installed Next.js 16.3.4 guides inspected: environment variables, Server Actions,
robots, sitemap and `after`; installed Auth.js environment/cookie implementation
was inspected for actual defaults. Sanity schema guidance and the repository's
schema, reader and importer were reviewed. No private `.env` values appear here.

## 3. Launch blockers by responsibility

| ID / class | Open item | Gate and evidence required to close |
| --- | --- | --- |
| CODE-01 — A. Code — **RESOLVED in 7B** | Homepage canonical `/`; `app/sitemap.ts` contains only `/` and `/contact`; robots references the sitemap. | Nine focused tests, lint, typecheck, isolated production build and rendered checks pass with fictional `https://www.example.test`. Existing noindex/disallows preserved. Release candidate must include this patch; actual Production origin and Preview indexing remain CONFIG-01/02 gates. |
| CONFIG-01 — B. Production configuration | SQL, Sanity, auth secrets, URL origins, mail and environment scopes not live-verified. 7D supplies the [target matrix and ledger](PRODUCTION-CONFIGURATION.md), not live sign-off. | Before any production write: signed target/config matrix with distinct environment identities, least-privilege credentials and approved production origin. |
| CONFIG-02 — B | Production HTTPS/domain, Preview protection/noindex, ingress headers, action durations and mail authentication not verified. | Before exposure/mail: real-domain smoke checks, provider settings and DNS evidence. A successful local build is insufficient. |
| DATA-01 — C. Client data | Tier 1 missing, 22 Tier 2 unresolved; no approved launch assortment/tier coverage. | Before enabling products/inviting affected customers: complete independent prices for their approved assortment, or explicit client approval of a narrower assortment/cohort. |
| DATA-02 — C | Customer identities/numbers/tiers/active flags, ADMIN identity, recipients, currency, availability, public facts/deals and domain confirmation missing. | Obtain recorded client decisions, not inferred values. Images/descriptions block only if required by the approved content standard. |
| OPS-01 — D. Operations — **TOOLING/REHEARSAL COMPLETE in 7C** | Separate `db:bootstrap` CLI: guarded read-only plan, hidden password, atomic create-only tiers/ADMIN, exact completion/no-overwrite behavior. Development seed unchanged. | Disposable migration/apply, concurrency/rollback, auth compatibility, secrecy and Windows terminal checks pass. **Production execution remains open**: confirmed target/ADMIN, backup/restore, approved permissions, reviewed plan and separate authorization required under runbook phase 2. |
| OPS-02 — D | Restore points, restore rehearsal, artifact custody and recovery owners not established. | Before migrations/imports: usable verified backups and named operator, approver and recovery owner. |
| OPS-03 — D | Staff order monitoring, email-failure recovery and controlled invitation schedule not signed off. | Before customer access: assigned coverage, approved internal smoke recipients/account and cohort, provider headroom and delivery evidence. |
| OPS-04 — D | Permanent resolved catalog mapping and reviewed exclusions/W515B–W515BC decision artifact not supplied for this audit. | Before catalog import: custodian supplies the preserved reviewed mapping; verify all 302 identities against the approved artifact. Do not reconstruct the resolution from this report. |
| OPTIONAL — E | Outbox/retry UI, automated alerts, retention jobs, CSP rollout, standalone Studio, analytics/GBP enhancements, compatible tooling upgrades. | Not blockers merely because they are best practices. Reassess if actual operating volume or a reachable advisory makes one necessary. |

The prior fixes remain complete. A regression would require concrete new evidence.
The unresolved configuration/operations gates must not be relabeled code bugs.

## 4. Client decisions still needed

- Independent Tier 1 source; explicit disposition of all 22 blank Tier 2 prices.
- Product-by-product manual availability approval and intended assortment per tier.
- Whether images/descriptions are required at first release; approved content source.
- Actual customer CSV, exact assigned tier names, intended active flags and rollout cohort.
- Authorized ADMIN identity and recovery custodian; controlled internal CUSTOMER account
  owned by real staff if needed for smoke tests (never copy a fixture account).
- Confirmed `ORDER_TO_EMAIL`, `CONTACT_TO_EMAIL`, both From identities and invitation timing.
- Currency wording and order-request/finalization wording. Cases are confirmed already.
- Domain ownership, canonical apex/www choice, public contact/address/hours/social data,
  proximity, slogan and current promotions. Any explicitly required privacy/legal copy
  needs a client decision; this audit makes no jurisdictional/legal determination.

The older percentage sentence in CONTENT section 7 conflicts with its newer confirmed
semantics section and the user's instruction. It was corrected in current working
content: Tier 1 is cheapest; no tier percentage or inferred price is authoritative.

## 5. Authoritative environment/configuration inventory

Scope: all project-owned reads, dynamic lookups/forwarding in operator/test code,
and relevant implicit Auth.js/Next settings. This is not an inventory of every
internal variable supported by every dependency. `D/P/V` below means Development /
Preview / Production. `R` = required for intended functionality; `C` = conditional;
`—` = omit; `auto` = platform/tool-owned. Dev builds may succeed without runtime
services; that does not make service configuration optional for launch.

### Application and operator variables

The D/P/V entries below describe tool applicability as well as application usage.
They do **not** authorize operator variables in Vercel app scopes. The
[7D operator policy](PRODUCTION-CONFIGURATION.md#operator-only-credentials) requires
Sanity tokens/import controls absent from all Vercel application environments.
Actual identities, presence checks and pending sign-offs belong to the 7D sheet.

| Exact variable | Exposure / secret | D / P / V | Shape, purpose, phase and consumer | Missing/incorrect behavior; environment crossing |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Server / **secret** | C / R / R | PostgreSQL URI; TLS to remote host; runtime `lib/db.ts`, migration CLI `prisma.config.ts`, seed/tests/audit. 7C bootstrap reads only operator process env and validates explicit target/TLS; no `.env` loading. Build generation needs no live DB. | Missing throws on DB use; SQL-dependent auth/contact fail closed. **No target check or TLS enforcement in app**: a valid wrong URL reads/writes the wrong DB. The separate bootstrap's checks do not change runtime behavior. |
| `AUTH_SECRET` | Server / **secret** | R for auth/contact / R / R | Independently generated >=32 random bytes (e.g. base64); application requires >=32 characters in HMAC/sealing paths. Runtime Auth.js, `lib/auth/rate-limit.ts`, pricing/order/customer preview-token modules. | Missing/short blocks relevant operations; Auth.js alone is not the application's length validator. Shared secret across environments is unsafe. Rotation invalidates sessions/previews and changes limiter identities. |
| `AUTH_URL` | Server / no | R for mail / R / R | Exact origin, no path/query/hash/userinfo; local HTTP permitted by account helper, **production must be HTTPS**. Auth.js and `lib/auth/account-email.ts`; runtime and framework initialization. | Mail fails without valid origin; Auth.js can otherwise infer headers. A wrong valid origin can send links to Preview/another host. Local HTTP exception is not environment-aware. |
| `AUTH_TRUST_HOST` | Server / no | C / C / C | Exact `true` or `false`; `auth.ts`, runtime. Keep false on Vercel unless independently needed; Vercel detection suffices. | Explicit project expression uses `NODE_ENV !== production` OR `VERCEL === 1` OR exact `true`. Missing/false is not a universal trust-off switch on Vercel/dev. Requires trusted ingress. |
| `RESEND_API_KEY` | Server / **secret** | C / C / R | Provider API credential; runtime all four mail classes. No SDK/env test bypass in app. | Missing disables mail; order still saves. Wrong valid key can send real mail or charge wrong account. Safest Preview default is unset; enable only for separately approved internal delivery tests. |
| `ACCOUNT_FROM_EMAIL` | Server / no | C / C / R | Verified mailbox or `Display name <mailbox>`; account and order mail runtime. Nonempty/no CRLF validated locally. | Missing stops account send and marks order notification failure; provider verifies actual sender. Wrong sender can cross identities. |
| `CONTACT_FROM_EMAIL` | Server / no | C / C / R | Verified mailbox/display sender; `app/contact/actions.ts`, runtime. | Nonempty check only; provider enforces validity. No mail on missing value; no environment guard. |
| `CONTACT_TO_EMAIL` | Server / private routing, not credential | C / C / R | One confirmed store inbox; contact runtime; From is fixed, visitor address is Reply-To. | Missing rejects send; nonempty but wrong value can misroute message. No production fallback. |
| `ORDER_TO_EMAIL` | Server / private routing, not credential | C / C / R | One validated staff mailbox; `lib/orders/email.ts`, runtime. | Missing/invalid prevents notification, **not order persistence**. No contact-recipient fallback. Wrong valid address leaks order details. |
| `NEXT_PUBLIC_SITE_URL` | Public / no | C / R / R | Absolute canonical origin without path/query/fragment, production HTTPS; `config/seo.ts` supplies layout metadataBase, sitemap and robots at build/render. Match AUTH_URL in production. | Missing falls back to localhost; empty/malformed fails URL construction; valid wrong hostname still contaminates SEO output. Homepage and contact declare relative canonicals. Rebuild after change; final-origin verification remains mandatory. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Public / no | C / R / R | Lowercase alphanumeric project ID; `sanity/environment.ts` used by Studio and server reader; **build + runtime**. | Invalid/missing pair gives unconfigured Studio/catalog failure; public build still works. Wrong valid ID can select another readable project. |
| `NEXT_PUBLIC_SANITY_DATASET` | Public / no | C / R / R | `[a-z0-9][a-z0-9_-]{0,63}`; paired with project; build + runtime. | No dev/preview/prod identity inference. Wrong valid dataset can cross environments; Studio can edit it if staff have rights. Rebuild both public settings. |
| `SANITY_API_WRITE_TOKEN` | Server/operator only / **secret** | C / C / C | Operator `scripts/onboarding/cli.ts`; remote raw dry-run and apply. Use full-read scoped token for planning, write capability only for apply. | Missing refuses remote CLI; not read by application. Wrong broad token plus wrong flags can mutate wrong dataset. **Omit from all Vercel app scopes; never NEXT_PUBLIC.** |
| `SANITY_CATALOG_NON_PRODUCTION_TARGET` | Operator / no | C / C / — | Exact reviewed `project/dataset`, `scripts/onboarding/plan.ts`. Empty means every target production-guarded. | Missing is safe; incorrectly labeling production as nonproduction removes extra production acknowledgments. Not used by app/audit. |
| `ALLOW_PRODUCTION_CATALOG_IMPORT` | Operator / no | — / — / C during authorized apply only | Exact `true`, plus `--allow-production`, exact `--confirm` and reviewed `--apply` hash. | Missing/false blocks production-guarded apply; does not block read-only planning. Never leave armed or set in app hosting. |
| `ALLOW_DEVELOPMENT_SEED` | Operator / no | C / — / — | Exact `true`, `prisma/seed.ts`; only local fixtures. | Default false/absent refuses. Additional production NODE_ENV and local-host checks. A local tunnel can defeat target intent; **never seed production through a tunnel**. |
| `SEED_ADMIN_PASSWORD` | Operator/test / **secret** | C / — / — | 15–128 characters; fictional `admin@example.test`, hashed before seed writes. | Missing/invalid refuses all writes; never production ADMIN provisioning. |
| `SEED_TIER1_PASSWORD` | Operator/test / **secret** | C / — / — | Same policy; fictional `tier1@example.test`. | Same; fixture-only, never imported/copy-restored to production. |
| `SEED_TIER2_PASSWORD` | Operator/test / **secret** | C / — / — | Same policy; fictional `tier2@example.test`. | Same. |
| `NODE_ENV` | Tool/server / no | auto / production / production | Next command mode; `auth.ts`, seed, test subprocesses. | Next production build/start sets production; **Preview also uses production**, so this cannot distinguish release environments. |
| `VERCEL` | Platform/server / no | — / auto / auto | `1` on intended hosting; explicit trust predicate in `auth.ts`. | Wrong value changes host-trust decision; not database/mail/dataset isolation. |

### Implicit framework settings that must not undermine that contract

Evidence: installed `next-auth/lib/env.js`, `@auth/core/lib/utils/env.js` (0.41.3).

| Exact names | Exposure / secret | D / P / V; consumer/phase | Policy and missing/cross-environment behavior |
| --- | --- | --- | --- |
| `NEXTAUTH_URL` | Server / no | — / — / —; Auth.js legacy fallback, runtime | Do not set; use AUTH_URL. Fallback does not configure this application's account-mail origin. Wrong value can redirect auth to another environment. |
| `NEXTAUTH_SECRET` | Server / **secret** | — / — / —; legacy Auth.js fallback | Do not set. It cannot replace AUTH_SECRET for application HMAC/previews; mixed secrets are not a supported rotation scheme. |
| `AUTH_SECRET_1`, `AUTH_SECRET_2`, `AUTH_SECRET_3` | Server / **secret** | — / — / —; conditional core fallback loop | Not a project-supported configuration. Normal nonempty AUTH_SECRET already populates NextAuth config; core array behavior is not an app-wide rotation mechanism. Omit. |
| `AUTH_REDIRECT_PROXY_URL` | Server / no | — / — / —; Auth.js default | No OAuth redirect proxy is used; omit. This must not become a substitute for canonical AUTH_URL. |
| `AUTH_CREDENTIALS_ID`, `AUTH_CREDENTIALS_SECRET`, `AUTH_CREDENTIALS_ISSUER`, `AUTH_CREDENTIALS_KEY` | Server / secret for SECRET/KEY | — / — / —; core dynamic provider lookup | Lookup exists but OAuth/email assignment branches do not apply to this Credentials provider. No effect needed; omit all four. |
| `CF_PAGES` | Platform/server / no | — / — / —; core trust fallback | Explicit project trustHost overrides this fallback. Not hosting separation. |
| `VERCEL_ENV` | Platform/server / no | auto / auto / auto | Platform designation only; **not consumed by application code**. Current metadata/robots do not branch on it. Verify platform Preview protection/noindex separately. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Server/build / **secret** | C / C / C, framework | Not read directly/set by repository; leave platform-managed for Vercel. Needed only if deliberately managing multi-instance shared builds. Never copy Preview keys into production as a shortcut. |

### Tests, build controls and inherited OS variables

None below is a production application feature switch. D = test/operator use;
P/V = omit unless explicitly noted. Missing controls may break local tests or
permit tool telemetry; they do not verify live configuration.

| Exact names | Exposure / secret | D / P / V | Shape, consumer and phase; failure/cross-environment behavior |
| --- | --- | --- | --- |
| `TEST_ACCOUNT_MAIL_DIR` | Server/test / path private, not credential | R for harness / — / — | Isolated directory; `tests/email-interceptor.mjs`, E2E and security tests. Missing preload configuration throws. Contains fictional captured mail/token URLs; never publish. No app code reads it. |
| `TEST_CATALOG_CONTENT_FILE` | Server/test / path private | C for harness / — / — | Fictional JSON path; `tests/catalog-interceptor.mjs`, catalog/order/pricing E2E. Interceptor requires `testonly` project; absent configuration throws or explicitly skips catalog suites. Never point at real data. |
| `NODE_OPTIONS` | Tool/server / no, security-sensitive code options | C / — / — | Harness passes isolation and transport preloads; resume runner checks isolation path. Do not deploy test preloads. `tests/run-integration.ts` inherits process env; use sanitized security wrapper for this audit. |
| `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` | Build/test / no | C / — / — | Local fixture JS path set by security wrapper; Next build consumes it. Mocked build does not verify real Google font download/rendering. |
| `NEXT_TELEMETRY_DISABLED` | Build/tool / no | C / C / C | `1` in security wrapper; Next telemetry opt-out. Missing does not block build. |
| `CHECKPOINT_DISABLE` | Build/tool / no | C / C / C | `1` set by security wrapper for Prisma tooling. Not an integrity guard. |
| `DO_NOT_TRACK` | Build/tool / no | C / C / C | `1` set by security wrapper; downstream tooling opt-out intent, not proof all tools comply. |
| `SystemRoot`, `PATH` | Operator/test / no | OS / OS / OS | `scripts/onboarding/boxhero.ts` passes only these and NODE_ENV=test to credential-free XLSX worker. Wrong paths can run wrong binaries; absent values may break subprocess startup. |
| `WINDIR`, `ComSpec`, `PATHEXT`, `TEMP`, `TMP`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `NUMBER_OF_PROCESSORS`, `PROCESSOR_ARCHITECTURE` | Operator/test / no, some private paths | OS as present / — / — | Explicit allowlist in `tests/security/run.mjs`; OS paths, CPU count/architecture. Copied, not logged. Test-local build/child environment only. |

No `SANITY_API_READ_TOKEN`, `DIRECT_URL`, seed-production switch, mail sandbox
allowlist or maintenance-mode variable is implemented. Do not assume setting one
has an effect. Vite's suggested warning-suppression variable is not a repository read.

`.env.example` now makes scope and omit rules explicit. Next loads process env
before `.env.production.local`, `.env.local`, `.env.production`, `.env` for a
production build. Prisma uses `dotenv/config` (`.env`, unless process configured);
catalog audit/online import explicitly load `.env.local` then `.env` without
overriding process values. **Do not use ordinary developer env files for release
commands.** Use a dedicated operator process with deliberately injected credentials.

## 6. Environment separation review

| Mistake | Repository result | Required operational prevention |
| --- | --- | --- |
| Preview points at production SQL | **Possible.** `getDb()` accepts supplied URI without environment identity check. | Separate branches/roles/credentials; compare redacted host/database/role against approved target sheet in Vercel and DB console. Do not paste URI into tickets. |
| Preview selects production Sanity | **Possible.** Public IDs choose any readable target; Studio rights control writes. | Distinct dataset config at build, rebuild, restricted staff roles/CORS; no production writer in Preview sessions. |
| Preview setup/reset mails real customers | **Possible** with real SQL identities and enabled key. Contact/order recipient override does not redirect account mail. | Keep real customers out of Preview and mail key unset by default. For approved tests use isolated data and only staff-owned addresses, scoped key and explicit send approval. No app recipient allowlist exists. |
| Seed production | Direct production NODE_ENV/nonlocal URLs rejected; tunnel/mislabeling can defeat intent. | No seed variables or seed command in production workflows; do not tunnel production into a local seed target. |
| Catalog import wrong target | Requires explicit flags/hash/confirmation; all targets production-guarded unless designated otherwise. | Independently verify project/dataset/token scope and never designate production nonproduction. App public variables do not constrain CLI flags. |
| Expose production write token in browser | No current app import/read of CLI token. | Do not introduce NEXT_PUBLIC credentials, token-bearing props or tracked secrets; omit operator token from Vercel. Studio uses editor login. |
| Preview origin in production email | Valid wrong AUTH_URL passes helper; NEXT_PUBLIC_SITE_URL does not repair it. | Both origins equal approved production HTTPS origin; rebuild public config and redeploy server config; inspect actual delivered links. |

Separate AUTH_SECRET per environment, shared consistently across production instances.
Do not promote an already-built Preview artifact with Preview public variables into
Production. Build under Production scope. Dashboard scope verification remains open.

## 7. Auth, domain and cookie readiness

`auth.ts` uses Credentials, encrypted JWT sessions and an **eight-hour maxAge**.
Auth.js refreshes expiry when its session path refreshes a token; this is not a
separate absolute eight-hour-since-login policy. JWT/session DTOs contain identity,
sessionVersion and lifecycle/expiry, not authoritative role/tier. Current SQL
principal resolution checks active role/association/version on protected requests.

Installed cookie defaults: HTTPS session name `__Secure-authjs.session-token`
(possibly chunked), HttpOnly, Secure, SameSite=Lax, Path=/, **no Domain attribute**
(host-only). CSRF cookie uses `__Host-` on HTTPS. No custom cookie override exists.
Auth.js chooses Secure using its effective request URL; missing/wrong AUTH_URL or
misconfigured forwarding can break assumptions. HTTPS is a production gate even
though the mail helper permits local HTTP for development.

AUTH_URL overrides request origin in installed NextAuth; without it, forwarded
host/proto can influence action URLs. Explicit host trust is not header validation.
Vercel ingress must overwrite/validate forwarding, and any added proxy must keep
Origin/Host behavior coherent. No custom allowedOrigins expansion is configured.
Next actions retain their default origin check; it is not an abuse-rate control.

Redirect callback always returns local `/account`; that dispatcher resolves ADMIN
to `/admin`, CUSTOMER to `/portal`. Browser-provided external destinations are
ignored. Login/logout are POST; logout clears this browser's cookie and the
dispatcher takes an anonymous browser back to `/login`. It does not revoke every
other session. Incrementing sessionVersion revokes all sessions; access/email and
password changes use existing transactional invalidation. SEC-04 locks authorize
SQL commit/claim boundaries, not recall of prior browser data/in-flight email.

Account links use server AUTH_URL, 24-hour setup / one-hour reset, single use,
digest-only SQL storage, acceptance marker and version checks. Setup/reset do not
enable disabled accounts. ADMIN cannot use public setup/reset; recovery must follow
the controlled administrative process, including version increment.

Runbook phase 8 defines real-domain login/logout, callback, cookie, no-cache,
token expiry/reuse, account isolation and mobile/tablet/desktop checks. They have
not been performed here.

## 8. Database and migration readiness

**Six migrations**, chronological order:

| ID | Effect |
| --- | --- |
| `20260906000000_auth_foundation` | User, Customer, PricingTier, LoginRateLimit; Role enum; identity uniques and tier/user foreign keys. |
| `20260906010000_customer_password_setup` | User.passwordHash becomes nullable. |
| `20260906020000_account_tokens` | AccountToken, purpose enum, digest uniqueness, lifecycle indexes and user FK. |
| `20260906030000_product_prices` | ProductPrice, `(catalogKey, pricingTierId)` PK, tier FK/index and nonnegative finite NUMERIC(12,2) check. |
| `20260906040000_submitted_orders` | Order/OrderItem, SUBMITTED and notification enums, unique references/customer-submission/item keys, FKs/indexes and amount/quantity checks. |
| `20260907050000_case_catalog_tier_rank` | Positive unique tier rank; maps existing Tier 1/2 names to 1/2, remaining tiers above 2; nullable brand/packing snapshots. **Creates no tier rows.** |

Source comparison found current Prisma models consistent with the migration end
state. SQL CHECK constraints are deliberately not expressible in Prisma schema:
`ProductPrice_nonnegative_finite_price`, `PricingTier_rank_positive`,
`Order_total_valid`, `OrderItem_quantity_valid`, `OrderItem_amounts_valid`.
No fresh schema-diff database was created in 7A; prior isolated migration tests are
historical evidence, not proof of production schema/drift.

Expected application tables: User, Customer, PricingTier, ProductPrice,
LoginRateLimit, AccountToken, Order, OrderItem; Prisma also tracks `_prisma_migrations`.
No Product, Session, OAuth Account or Auth.js VerificationToken tables are required.
IDs use Prisma CUID defaults at client level; raw SQL bootstrap must explicitly
provide compatible IDs and updatedAt values. Prefer the reviewed Prisma process.

Identity/index requirements: unique User.email, Customer.userId/customerNumber,
PricingTier.name/rank, AccountToken.tokenHash, Order.reference and customer/submission,
OrderItem.order/catalogKey; expiry indexes on limiter/token, customer-tier and
price-tier indexes, chronological/customer order indexes. User/Customer/tier/order
deletes are restricted where referenced; AccountToken user deletion cascades.
There is no SQL FK into Sanity and no DB trigger enforcing snapshot immutability;
the app exposes no snapshot edits. Privileged direct writers remain responsible.

`npm run db:deploy` = `prisma migrate deploy`: deliberate operator migration.
`npm run build` = `prisma generate && next build`: **no migration or seed**.
`npm run db:migrate` is `migrate dev` and must not be used in Production.
Migrate deploy applies tracked pending migrations; it does not replace a drift
audit. On any error stop, inspect migration history and partial DDL, and follow
recovery procedure; these SQL files do not wrap the whole release in BEGIN/COMMIT.
Do not assume all six migrations roll back as one transaction. Never mark an
unsuccessful migration applied without proving the schema's actual state.

Runtime pg adapter: max five connections per process, five-second connection
timeout. Total pool use grows with function instances; no global connection cap.
Serializable writes/row locks require PostgreSQL transaction support. Use a
provider-approved pooled runtime endpoint if appropriate and a direct migration
connection in the operator process; both use DATABASE_URL here, not DIRECT_URL.
Remote TLS is a configuration requirement, not code-enforced. Confirm certificate
validation, provider pooling compatibility, cold starts and transaction/duration
limits against the actual branch. Never disable TLS verification to make it work.

Backups and a demonstrated restore are required before migration/import. A Vercel
rollback cannot roll back SQL. First-tier/ADMIN bootstrap now has the separately
guarded 7C `db:bootstrap` command; the fictional seed remains local/development-only.
OPS-01 tooling/rehearsal is complete; no actual production provisioning is implied.

## 9. Sanity readiness

Schema is content-only: immutable catalogKey, SKU/name, category reference,
brand/packing, description, image/alt and availability. `sanity.config.ts` disables
Duplicate; initial visibility false and UUIDv4 generated only for genuinely new
products. Studio read-only/validation guards are bypassable by privileged API
writers, so single-writer import and post-import identity verification matter.

Reader uses public published content, API version 2026-09-06, no token/CDN/cache,
ten-second timeout, no retry, explicit projection. Hidden products are still public
Sanity content: `available=false` is wholesale UI visibility, **not confidentiality**.
Never put Unit Cost, any tier prices, customer data, private notes or orders there.

Studio at `/studio` requires website ADMIN and independent Sanity membership.
Credentialed CORS must allow only intended editor origins; CORS is not SQL/app
authorization. Dataset visibility, production dataset existence, token scope,
roles and CORS are unverified live items.

Use the already-reviewed **302-product resolved mapping**, not a fresh BoxHero
mapping or an export with blank catalogKeys. Preserve all keys, 17 approved category
names, exclusions, W515B/W515BC resolution, SKU/name/brand/packing and false
availability. Exact row-level decisions were not supplied here; obtain the signed
artifact. New production Sanity `_id`s can differ from development; catalogKeys
must not. Preserve existing `_id`s when updating a target.

Importer demands explicit target, raw full read (including drafts/releases),
reviewed plan hash and target confirmation; production adds env + flag. It blocks
ambiguous keys/categories/SKUs and drafts/releases. Categories commit first,
then one revision-guarded product transaction. A failure may leave unused new
categories; uncertain response is not proof of rollback. No automatic retries,
deletions or price writes. It preserves images/unrelated fields, so the importer's
allowed projection alone **cannot detect pre-existing private fields**: review full
dataset contents/export separately before treating it as public-safe.

For an empty intended target, expect 302 new products and 17 new categories;
post-import unchanged verification must report 302 unchanged / 0 new / 0 updates /
0 errors. Also independently verify totals, references, zero true availability,
key equality and no private fields. `catalog:audit` reads published products/SQL;
it is not a draft-aware replacement for importer verification.

## 10. Pricing readiness

Production can technically start with zero/partial ProductPrice rows. Missing or
invalid price means the customer does not see that product, and server review/
submission rejects it. There is no fallback tier, invented zero or guessed amount.
This is safe failure behavior, not approval of an empty/incomplete customer catalog.

| Technical option | Client decision and gate |
| --- | --- |
| Complete intended launch catalog for both tiers | **Recommended:** obtain independent prices for every enabled product in every tier receiving access; resolve the 22 Tier 2 blanks and Tier 1 source before those customers launch. |
| Controlled Tier 2 cohort / smaller assortment | Technically possible only with recorded client approval of the exact cohort and assortment. Keep unresolved products false and Tier 1 customers out of the campaign until approved/priced. |
| Import partial prices while all products remain false | Safe preparation after target/backup/bootstrap gates; not customer/public launch approval. Do not mistake zero available-price errors for completeness. |

PricingTier rank/name mapping is dynamic, requires positive unique ranks and exact
names; intended initial rows are rank 1 / Tier 1 and rank 2 / Tier 2. Cheapest-tier
ordering is a client semantic, not a numeric constraint on each pair of values.
No percentage, cost, margin or packing formula derives prices.

Upload at `/admin/pricing` with `catalogKey,sku,productName,category,available` plus
every current `price:<rank>:<exact name>` column. CSV preview is read-only; confirmation
is ADMIN/version-bound, encrypted, ten minutes, stale-state checked and SERIALIZABLE.
Blank means no price/removal with separate removal acknowledgment; omitted products
unchanged; explicit 0.00 is technically valid and requires intentional business review.
BoxHero zero Selling Price maps to unresolved blank, not free product. Decimal text
is validated to two places/range; no Number conversion in pricing/order money.
SQL NUMERIC alone can round excess scale, so use the validated importer.

Match only catalogKey; SKU/name warnings need reconciliation, not alternate matching.
No Unit Cost column is accepted. Archive approved input and post-import export
privately, compare all values/keys/tier headers, and inspect each intended launch
product even while false. `catalog:audit` and admin completeness only check prices
for **available** products. That is why a separate readiness matrix is mandatory.
Once products are enabled the audit checks every configured tier; a client-approved
Tier 2-only release can therefore still report missing Tier 1 prices. Record those
specific deferred-tier findings and verify Tier 1 access is held back; do not call
the audit clean or waive missing prices for customers actually receiving access.

## 11. Product readiness

| Missing/state | Actual portal behavior (`lib/catalog/normalize.ts`, service, components) | Release decision |
| --- | --- | --- |
| `available=false` | Omitted regardless of price; stale order selection rejected on server review/submit. | Keep false until individual approval. It is not stock synchronization. |
| Missing/ambiguous key, invalid SKU/name/boolean | Product rejected; duplicate keys cannot receive a price by arbitrary choice. | Integrity stop; repair from preserved mapping. |
| Missing image | Labeled neutral placeholder; unsafe/failed image also falls back. | Client expectation; not inherently a code blocker. |
| Missing description | No invented text; card can render without it. | Client expectation; record accepted omissions. |
| Missing price in current tier | Product omitted; order rejected if price removed after selection. | Stop that assortment/cohort unless explicitly narrowed. |
| Missing category | Product can render as Uncategorized; audit warns. | Repair the approved category/reference before release, or record client-approved exception. |

Maintain a private readiness sheet keyed by permanent catalogKey: SKU, name,
approved category, brand/packing when applicable, price for each intended tier,
image/description approval or explicit optional omission, availability approver/date.
Publish availability in Studio in a paused-edit window after verification. Recheck
every enabled product and tier on server refresh, then save new content baseline.
Do not reapply the old all-false resolved file after enabling products: it would
reset availability and can clear newer imported text/brand/packing values.

## 12. Customer onboarding readiness

Canonical CSV: `companyName,customerNumber,email,pricingTier,active`. All five
required; company <=200, number <=100 (case-sensitive), normalized email <=254,
exact case-sensitive configured tier name, active exactly true/false. Max 128 KiB,
250 rows, 2,048 chars/record; UTF-8/quoted CSV, no extra columns/passwords/roles.
Duplicate emails/numbers or any existing User collision rejects the batch.

Preview and confirm are separate; ten-minute encrypted ADMIN/session snapshot,
SERIALIZABLE create-only transaction with acting-admin recheck. Creates CUSTOMER
User + Customer with matching active flags, null hash, sessionVersion 0.
**Import creates zero AccountTokens and sends zero email.** A lost confirmation
response requires checking the list before retry; do not assume no commit.

Post-import compare exact count, identities, tiers, both active flags and null
passwords to approved source. No `@example.test`, DEV- or test/fixture business
belongs in production. Existing Preview fixtures must stay Preview; they are not
a bootstrap source. Real staff-owned test identities require specific approval
and accurate business/account records; never fabricate a wholesale customer.

Bulk invitations: active passwordless CUSTOMER/Customer only, nothing preselected,
up to 25 selected, fresh preview/explicit confirmation. One-use preview, per-row
reviewed-state claim under recipient lock and actor SHARE lock prevent competing
reviewed-state sends. 600 ms sequential pacing, 100 bulk attempts/hour globally,
3/recipient/15 minutes shared with individual invitations, individual global 30/hour.
Global attempts can be spent for recipient-capped calls; provider failure does not
refund quota. Page requests 300 seconds; platform support/headroom needs verification.

Accepted means provider accepted and token marking succeeded, not inbox delivery.
Changed/not-attempted, ineligible/rate-limited and unconfirmed outcomes require
fresh status review. Interruption can leave partial results; do not replay the
original preview or blindly resend accepted rows. Individual invites can include
disabled passwordless customers; bulk cannot. Neither creates an active account
by setting a password. Start with approved staff, then small approved customer
cohort, then remaining batches, with explicit checkpoints between groups.

## 13. Email readiness and failure recovery

All classes use server-only RESEND_API_KEY and direct fetch to Resend, ten-second
timeout and no automatic transport retry. From addresses must be provider-verified.

| Class / source | From; To / Reply-To; URL | Idempotency, persistence, limits | Failure visibility and staff recovery |
| --- | --- | --- | --- |
| Account setup — `lib/auth/account-email.ts`, account tokens, admin invitation services | ACCOUNT_FROM_EMAIL; current SQL User.email; no Reply-To; AUTH_URL `/setup-account?token=…` | Token-ID key; token claim committed before mail, deliveredAt only after accepted/current; 24h, single use. Individual/bulk quotas above. | ADMIN result/pending-link status; unconfirmed token unusable. Verify provider event/inbox and current state, then fresh deliberate resend within quota. Never copy raw token URLs into tickets. |
| Password reset — `app/(portal)/forgot-password/actions.ts` | ACCOUNT_FROM_EMAIL; eligible current SQL email; no Reply-To; AUTH_URL `/reset-password?token=…` | Token-ID key; same acceptance persistence, 1h expiry. Global 30/min and 3/email/15min; after(response), page maxDuration 30s. | Public response always generic; fixed server error labels, provider dashboard. Check eligibility and delivery without disclosing accounts publicly; customer requests a fresh link after resolving failure. ADMIN public reset unsupported. |
| Order notification — `lib/orders/email.ts`, service | ACCOUNT_FROM_EMAIL; ORDER_TO_EMAIL; no Reply-To (customer email in text); no URL | Stable reference key; saved Order first, PENDING then ACCEPTED/FAILED, 30 ordering attempts/min/user and 10 saved/hour/customer. No extra notification queue. | `/admin/orders` authoritative; PENDING/FAILED or uncertain acceptance requires manual handoff by reference. Resubmitting a saved intent does not retry mail. Do not ask customer to create replacement order. |
| Public contact — `app/contact/actions.ts`, `lib/contact` | CONTACT_FROM_EMAIL; CONTACT_TO_EMAIL; validated visitor email Reply-To; no URL | Fresh UUID per admitted action; not duplicate suppression across new submissions. No saved message/outbox. Global 30/hour, 3/normalized email/15min, SQL/HMAC fail closed; honeypot/invalid input no send. | Form error + fixed log/status labels; provider dashboard. Timeout may already have sent, so staff check inbox/provider first; message cannot be recovered from SQL. Ask caller to phone or deliberately resubmit if needed. |

Token consumption also has global 60/min and 10/token-digest/15min bounds. Login
uses global 100/min and 5/email/15min. These are independent channels, not a shared
provider-wide budget. Overlapping bulk, reset, contact and order traffic can exceed
provider pacing/quota even when each channel behaves correctly.

Verify sender domain, SPF, DKIM, DMARC policy/alignment, both From values, both staff
destinations, provider limits/headroom and bounce/suppression access. Do not guess
DNS values. [Resend domain guidance](https://resend.com/docs/dashboard/domains/introduction)
describes verification and DMARC; actual project state is still unverified.
Provider idempotency is time-bounded (currently 24 hours per
[Resend documentation](https://resend.com/docs/dashboard/emails/idempotency-keys));
it does not implement a durable retry queue or inbox-delivery guarantee.

The user reports a prior Gmail setup message reached Spam. Launch-day tests must
check inbox and Spam, SPF/DKIM/DMARC results, sender appearance, canonical HTTPS
links, single-use completion and arrival at approved test mailboxes. Provider
acceptance is insufficient. Disable token-link click tracking/rewriting unless
deliberately reviewed. Never send real customer test mail from this audit.

## 14. Order operations readiness

Customer: login → current tier catalog → integer **cases** → server review → submit
→ saved reference/confirmation. Staff: SQL Order → notification attempt → refreshed
`/admin/orders` → offline availability/substitution/finalization/invoice/payment.

PENDING/ACCEPTED/FAILED describe notification only; Order.status remains SUBMITTED.
PENDING may mean interrupted send or uncertain result recording; FAILED can include
a timeout after acceptance. ACCEPTED is neither inbox delivery nor staff order
acceptance. Staff must inspect saved orders, not rely only on their inbox.

Customer/submission uniqueness prevents duplicate save and notification for the
same intent. A new review is a new intent and may create another legitimate order.
After lost response, retry the same review. If browser state is lost, staff reconcile
by reference or company/customer number/time in the admin list (50/page); there is
no customer history list or dedicated admin search endpoint.

Customer, tier, product, brand/packing and exact monetary snapshots persist;
later changes do not rewrite them. Unavailable or unpriced selection is rejected
before a new order; tell customer to reload/remove/review, never bypass validation.
If availability changes after saving, staff handle it offline. No inventory
reservation, tax/shipping calculation, payment or website final-order editor exists.
Record offline substitutions/final price in the existing staff system against the
same BW reference and obtain customer confirmation; preserve original SQL snapshot.
There is no in-app manual notification status edit/retry/cancellation workflow.

## 15. Backup and recovery readiness

| Asset | Required backup / timing | Custody and restore verification |
| --- | --- | --- |
| Production PostgreSQL | Provider restore point plus protected logical backup where appropriate; before each migration, bootstrap, price/customer import; ongoing retention covering launch. Include all eight tables, migration history, indexes, checks, roles/grants as separately needed. | Named DB/recovery operator, least access; encrypted off-repository storage. Verify actual plan retention and restore into isolated branch with email disabled. Check migration history, counts, constraints, auth/pricing/order reads and snapshot totals. Never restore Preview fixtures into production. |
| Permanent catalogKey mapping | Original reviewed resolved artifact, source-bound decisions/exclusions, W515B/W515BC evidence and checksums; backup **before first production import** and every approved revision. | Veriq operator + nominated Big Wicks custodian; encrypted restricted archive/version history. Restore identical bytes, compare 302 keys to approved source and SQL. Never regenerate keys as recovery. |
| Pricing | Approved production CSV + post-import export + exact tier mapping + checksum/change summary, before/after each import. | Restricted commercial-data archive. Re-preview restores through existing importer; verify exact values and intentional deletions. Never put into Git/public assets. |
| Customer source | Approved input, private import result/IDs and cohort ledger, before import and before invitations. | Restricted personal-data archive; named staff access only. Restore evidence independently; create-only import is not an update/undo tool. Avoid broad reimport/deletion. |
| Sanity | Authorized full dataset export including assets/references before import and availability publication; preserve current baseline as edits accumulate. | Restricted content backup (may contain accidental private fields; inspect). Rehearse restore to isolated dataset, verify counts/keys/category refs/assets; new dataset IDs/config changes need a rebuilt app. |
| Environment/config | Nonsecret target sheet, scope names, deployment commit/ID, DNS snapshots, owners, secret-manager references and version IDs. Back up before config/domain changes. | Secret manager stores values; runbook/Git stores names only. Recovery operator confirms access, restores intended version, rebuilds when public vars change. |

Record backup ID/time, verified restore target, operator, duration and acceptable
data-loss/recovery windows in a private launch ledger. Retention, RPO/RTO and access
must be chosen by owners; no provider plan capability is assumed. A restore after
launch can lose newer orders/customers and resurrect old tokens/sessions. Freeze
writes, preserve post-backup evidence, reconcile, and invalidate affected sessions/
tokens before reopening; restoring a database does not recall email.

## 16. Monitoring and staff process

| Signal | Already exposed by application | Dashboard/manual responsibility |
| --- | --- | --- |
| Deployment/start failures | Build/start exit and framework errors | Vercel deployment logs/status; verify released commit/runtime. Named Veriq release operator. |
| Server/DB failures | Fixed auth error type, generic safe service messages; no dedicated health/metrics endpoint | Vercel server errors/latency; DB connection/compute/pool graphs. Operator correlates timestamps without dumping credentials. |
| Setup/reset failures | Individual/bulk results, pending-link state; fixed reset log labels | Resend events/suppressions/quota, controlled inbox testing; staff records accepted vs delivered, fresh review before retry. |
| Order notification failure | PENDING/FAILED in `/admin/orders`; no automatic alert/outbox | Staff refresh list and manually hand off every unhandled reference. Provider dashboard supplements SQL; no mail event means check saved orders. |
| Contact failure | Form error + fixed config/limiter/provider status labels | Vercel errors and Resend events; staff checks inquiry inbox/phone fallback. No stored messages to recover. |
| Limiter anomalies | Safe denials and fixed unavailable logs; not a metrics dashboard | Compare normal request counts, DB health and provider quota; inspect aggregate bucket counts only as authorized. Do not reset limits indiscriminately or use spoofed IP headers. |
| Sanity fetch failure | Catalog/pricing unavailable, audit exit 2 | Sanity service/dataset status and permissions; real staff catalog refresh. No stale-price fallback. |

Proposed initial coverage for staff approval: release operator and order owner
present for first hour; check every 10–15 minutes and after each invite cohort;
first-day opening/midday/closing reconciliation plus immediate response to reported
failures. Escalate any unhandled saved order or unexplained routing/identity issue;
hold further campaigns until explained. Define continuing business-hours coverage
before handoff. These intervals are a proposed internal process, not customer SLA.

Logs/alerts must exclude passwords, raw tokens, full setup/reset URLs, API keys,
connection strings, uploaded CSVs, unnecessary prices and message contents. Review
platform request/query capture, tracing, session replay and retention separately.
Do not add a full observability platform merely to complete this checklist.

## 17. Dependency and platform release status

Current public npm bulk advisory query completed on 2026-09-08 using the inspected
`tests/security/inspect.mjs dependencies` (public package names/versions only).
All 34 direct installed versions matched the lockfile. The response identifies
**six dependency families, 15 range records / 12 distinct GHSA IDs**; these are not
15 reachable vulnerabilities or an `npm audit` meta-vulnerability count.

Current [Next maintainer advisories](https://github.com/vercel/next.js/security/advisories)
and [16.3.4 release](https://github.com/vercel/next.js/releases/tag/v16.3.4) were
rechecked. The latest listed critical August issues are covered by the installed
release; no newer reachable Next blocker was established. Lockfile has sharp
0.35.4 / optional libvips packages 1.3.3, Next PostCSS 8.5.23 and root PostCSS 8.5.28.
Production Linux native binaries and actual deployment runtime are **not** verified
by this Windows source/lock inspection. React/RSC and other queried runtime packages
had no matching bulk response entry; absence is not proof against unpublished issues.

| Family / installed paths | Current findings | Actual reachability / release classification |
| --- | --- | --- |
| brace-expansion 1.1.15 (ESLint), 5.0.7 (typescript-estree); oclif 5.0.9 | High GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895; patched oclif path is outside reported ranges. | Lint/dev trusted glob inputs; no customer glob parser. Compatible tooling update later; do not infer runtime merely from npm severity. |
| js-yaml 3.13.1 (`@sanity/cli → @vercel/frameworks`), 4.3.0 (ESLint) | Moderate GHSA-mh29-5h37-fv8m / GHSA-h67p-54hq-rp68; high GHSA-52cp-r559-cp3m / GHSA-5p4m-2wfm-xmqj. | CLI framework/config detection and lint; app/customer imports parse CSV, not YAML. The latest omap issue also affects root 4.3.0; keep untrusted YAML out of these tools. No production request path found. |
| smol-toml 1.5.2 (`@vercel/frameworks`); root 1.8.0 | Moderate GHSA-v3rj-xjv7-4jmq, vulnerable nested path only. | Sanity CLI framework detection; root fixed. Not Studio/customer TOML parsing. |
| deepmerge-ts 7.1.5 (`prisma → @prisma/config`) | High GHSA-ggr8-5vv4-36mx, recursive object graphs. | Prisma config during generation/build/migration CLI; reviewed local configuration, no request-controlled cyclic object graph. Build/operator conditional issue. |
| mysql2 3.15.3 (Prisma CLI) | Moderate GHSA-rgwj-5xj2-c3m3 (compression), high GHSA-3f6p-5ww8-9rcr (auth-plugin downgrade). | App and migrations use PostgreSQL/pg. No MySQL connection/compression/auth plugin path invoked. Conditional/unreachable under this release architecture, not a runtime blocker. |
| uuid 10.0.0 (`typeid-js → @sanity/cli`); root 11.1.1, Studio/comlink 14.0.2 | Moderate GHSA-w5hq-g745-h8pq (v3/v5/v6 explicit buffer path), only 10.0.0 vulnerable range. | CLI typeid uses v7; vulnerable buffer API not used. Studio resolved copies outside range; no demonstrated Studio runtime issue. |

Reachability is an inference from locked parent paths (`npm explain`) and inspected
application/tool consumers. Some CLI packages are marked non-dev in the lockfile
because Sanity is a production dependency; that does not mean an HTTP handler
invokes them. No unsafe payload or live probe was executed. The approved source
must be rebuilt from the lock on the actual hosting platform before release.

Primary advisory references for the current conditions:
[js-yaml](https://github.com/nodeca/js-yaml/security/advisories/GHSA-5p4m-2wfm-xmqj),
[deepmerge-ts](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx),
[mysql2 authentication](https://github.com/sidorares/node-mysql2/security/advisories/GHSA-3f6p-5ww8-9rcr),
[mysql2 compression](https://github.com/sidorares/node-mysql2/security/advisories/GHSA-rgwj-5xj2-c3m3),
[Next AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4),
[Next Windows](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).
The public bulk response is retained only in ignored local test output.

No packages/lockfile were changed; no audit-fix command ran. Existing Sanity/
Portable Text React peer warnings remain a compatibility follow-up; mount the
configured Studio on the production platform before granting editors access.
If a newly published critical/high runtime issue becomes credibly reachable,
STOP release and request a bounded security patch before any broad upgrade.

## 18. SEO and public production review

| Item | Source result / action |
| --- | --- |
| Public indexing | Root metadata index/follow true and robots allow `/` in **every environment**. Correct production intent; Preview needs verified hosting protection/noindex. Do not globally noindex production as a workaround. |
| Canonicals | **7B verified:** homepage explicitly defines `/`, contact retains `/contact`; metadataBase uses shared `getSiteUrl()` with unchanged URL parsing/fallback. Production render emits one canonical per page on the configured fictional origin. Next serializes the root as `https://www.example.test` (equivalent to `/`). Valid wrong configuration remains a release STOP. |
| Sitemap | **7B verified:** `app/sitemap.ts` returns only root and contact URLs; robots advertises the same origin's `/sitemap.xml`. URL-only entries, no guessed dates/frequencies/priorities. Redirects, private/utility/API/product routes, queries and fragments excluded. |
| Public routes | `/` and `/contact`; `/about` permanently redirects to `/#about`, `/services` to `/#shop`. No substantive placeholder pages to index. |
| Titles/descriptions/OG | Root Big Wicks title/description/twitter/OG; contact has specific metadata. OG slogan is still confirmation-required. app/opengraph-image.png and app/icon.jpg exist; visually approve final assets and verify rendered URLs. No manifest exists; PWA/manifest is not a launch requirement. |
| Private routes | `(portal)` layout and explicit portal/confirmation/Studio metadata noindex; robots disallows protected paths and token pages. Auth remains actual security. Login inherits noindex even though not in robots disallow list. |
| Token pages | no-referrer, private/no-store and X-Robots-Tag headers configured for setup/reset/forgot. Verify through live ingress; do not capture their query tokens. |
| JSON-LD | Root emits Store, names/contact/address/hours/socials from siteConfig. No ratings/private prices. **Those business facts remain marked CONFIRM**, so structured-data truth is blocked on client approval. |
| Links/assets | Source internal navigation targets existing routes/home anchors; real store/logo/category assets are used. 7A had no visual QA; 7B checks local public layout/overflow at three widths with stubbed fonts and blocked external embeds. Live external links and full real-asset QA remain open. |
| Preview duplication | **7B decision:** retain the hosting protection/noindex verification gate, including custom Preview domains. No application VERCEL_ENV conditional added: hosting semantics/configuration have not been established here, and NODE_ENV cannot distinguish Preview from Production. If hosting controls prove insufficient, scope a separate verified fix before release. |

No concrete previous-client identifiers are listed in PROJECT.md. A tracked
legacy/previous-client and asset-name inventory found no specific inherited client
identity requiring removal. Working Big Wicks claims/deals still need confirmation;
this statement is not blanket factual approval of all marketing copy.

## 19. Live-verification boundary

Every live checkbox remains open. Store evidence and named owners in the private
launch ledger, not secret values in this file.

| Item | Repository verified | Requires live verification | Who / where |
| --- | --- | --- | --- |
| Vercel env scopes/project/production branch | Names/consumers only; no tracked scopes | Yes | Veriq release operator, Vercel Settings/Deployments; correct Git project/branch and no unintended auto-deploy. |
| Production domain/DNS/HTTPS/apex-www | No final domain supplied | Yes | Domain owner + Veriq, registrar/DNS/Vercel domains and browser. |
| Deployment OS/Node/native image libraries | Node 24.x requested, versions locked | Yes | Vercel build/runtime output; platform-specific artifact inventory. |
| Actual DATABASE_URL/Neon branch/role | App accepts provided URI | Yes | DB owner, private env view and Neon connection/branch console; no URI in reports. |
| SQL migrations/schema/pooling/TLS/grants | Six migrations, static schema/adapter reviewed | Yes | DB operator; migration history, constraints, TLS/role test and approved connection checks. |
| Neon backup/restore retention | Nothing live | Yes | DB/recovery owner; current plan and tested isolated restore. |
| Sanity production dataset/public content | Schema/reader/import guards only | Yes | Sanity owner; dataset console, raw content inventory/export. |
| Sanity roles/write-token/CORS | No app token; independent editor sign-in | Yes | Sanity owner; token grants/member roles/exact credentialed origins. |
| Resend sender/domain/SPF/DKIM/DMARC | Variable names and mail paths | Yes | Email/DNS owners; Resend and actual DNS/authentication results. |
| Recipient confirmation/provider quota | Fail-closed missing config; no routing approval | Yes | Big Wicks order/contact owners; provider quota/event and inbox review. |
| Preview cannot send to real customers | No automatic environment recipient restriction | Yes | Veriq; absent key by default, isolated identities, approved internal tests only. |
| Auth forwarding/cookies/cache/action timeouts | Defaults/source reviewed | Yes | Veriq; real HTTPS ingress, all replicas, browser/network checks. |
| Content/prices/customers/availability | User-confirmed nonproduction counts only | Yes | Big Wicks data approver + import operator; approved artifacts and production reconciliation. |
| Staff monitoring/recovery ownership | No automated order reconciliation | Yes | Big Wicks named order owner + Veriq escalation owner; rehearsal and coverage agreement. |

## 20. Residual risk and validation record

Manual staff order monitoring and separate approved campaigns are material parts
of this implementation. Sanity/SQL/provider operations are not one transaction;
email cannot be recalled. Mis-scoped credentials can cross environments. These
limitations require the runbook, not a new full order-management platform.

7A deliberately adds no runtime release validator or bootstrap writer: a local
shape check cannot prove correct remote identity, and an unreviewed provisioning
script would turn this audit into a data-mutation implementation. Existing offline
prepare/import tests, target confirmations and dashboard evidence are the relevant
controls. 7C subsequently closes OPS-01 tooling/rehearsal with explicit target
review, create-only semantics, hidden password input and disposable PostgreSQL tests.
The original 7A audit did not execute or authorize that operation.

7A claimed no production build, live schema query or browser/domain smoke. Prior
6B/6C/6D/6E tests/builds remain dated historical evidence; the 6B follow-up passed
both Chromium and Firefox orders, superseding the older 6A Firefox startup failure.

### 7A checks actually run

| Command / check | Result |
| --- | --- |
| `git status --short`, `git branch --show-current`, `git log -5 --oneline`, `git remote -v`, `git fetch origin main`, `git log -1 --oneline origin/main` | Initial tree clean, Milestone-7A at 1129cbf; fetched main matches. Sandbox initially blocked FETCH_HEAD/network; approved narrow fetch succeeded. No branch switch, merge, push or deployment. |
| `node tests/security/inspect.mjs dependencies` | Initial network-restricted attempt failed; approved public-npm-only retry passed. All 34 direct installed/locked versions agree. Six advisory families / 15 range entries / 12 distinct GHSAs. No credentials/private source sent. |
| `npm.cmd explain deepmerge-ts mysql2 js-yaml smol-toml brace-expansion uuid` | Passed; parent-path classification above. Lockfile parsed locally for Auth core, sharp/native/PostCSS versions. |
| `node tests/security/run.mjs unit tests/unit/onboarding.test.ts tests/unit/onboarding-cli.test.ts tests/unit/pricing.test.ts tests/unit/customer-import.test.ts tests/unit/account-tokens.test.ts tests/unit/catalog.test.ts` | **135 passed / 1 failed** in six files. One offline prepare subprocess returned null status after timeout; no assertion of corrupt output, remote operation or application regression. The other five files passed. Source copy `.test-runtime/security-source-kF3ggl`. |
| `node tests/security/run.mjs unit tests/unit/onboarding-cli.test.ts` | **3/3 passed**, exit 0, unchanged tests/code, `.test-runtime/security-source-Nv11x9`. Includes offline prepare/no-overwrite/dry-run/production refusal and cost-free BoxHero artifact checks. The earlier timeout was not reproduced; do not describe the original combined run as entirely passing. |
| `node tests/security/run.mjs lint` | Passed, exit 0, `.test-runtime/security-source-AVP0yZ`. |
| Local Node document/example checker (stdin script; no file or network mutations) | Six changed Markdown files, 33 relative links/anchors, balanced fences, new-file whitespace and 19 dotenv example assignments checked. No errors; sender/recipient/secret example fields empty and seed/import opt-ins false. Advisory counts independently recomputed. |
| `git diff --exit-code -- docs/SECURITY-AUDIT.md docs/SECURITY-REMEDIATION.md package.json package-lock.json auth.ts lib app sanity prisma scripts tests next.config.ts` | Passed: historical security records, runtime code, schema/migrations, dependencies and tests unchanged. |
| `git diff --check`; tracked source/asset/legacy-marker inventory | Passed whitespace check; reviewed exact documentation/example diff and both new documents. No concrete old-client identity listed in PROJECT or found by the targeted inventory; existing form placeholder attributes are intentional UI hints. |

The existing Vite future-config-loader warning remains; no test assertion/timeout
or package was modified. Ordinary typecheck/build and large SQL/browser security
suites were **not rerun**, appropriate to documentation/example-only changes.
No UI changed, so new responsive screenshots were not generated; actual platform,
fonts, configured Studio, DNS, external links, production data and live smoke checks
remain unverified. During document review the release sequence was corrected so
protected final-domain attachment precedes browser ADMIN pricing/customer imports,
because canonical AUTH_URL governs Auth.js redirects.

### 7B checks actually run

- `git fetch origin main` and `git rev-parse HEAD origin/main`: both `adb8fd1`,
  merged PR #19; clean starting `Milestone-7B` branch. No merge, push or deployment.
- `node tests/seo/verify.mjs`: isolated source copy
  `.test-runtime/seo-source-hOGL1X`, no private `.env*` copied/loaded, OS-only
  inherited environment, fictional HTTPS site/auth origin, unreachable local SQL
  placeholder, no mail credentials and empty Sanity configuration. Existing isolation
  preload blocks outbound application service traffic; Google font transport is stubbed.
  Ran Prisma generate, Vitest `tests/unit/seo.test.ts` (**9/9 passed**), ESLint,
  Next typegen, `tsc --noEmit --incremental false`, and Next production build
  (**all passed**). No migrations, seed, database/service reads or mail.
- Initial browser assertion expected a literal trailing slash on the root canonical;
  Next correctly omits it. Corrected the assertion to compare normalized URLs,
  preserving the normal Metadata API and application output.
- `node tests/seo/verify.mjs --render-only .test-runtime/seo-source-hOGL1X`:
  verifies application build inputs match before reuse; **passed** Chromium and HTTP
  checks for one root/contact canonical each, public index/follow, title/description,
  OG/Twitter presence, parseable Store JSON-LD, exact two-entry sitemap, robots
  reference/all eight existing disallows, and `/about`/`/services` 308 anchor redirects.
  Anonymous account/portal/confirmation/admin/Studio routes redirect to noindex login;
  setup/reset/forgot metadata and X-Robots-Tag/referrer/cache headers remain intact.
  Source review also confirms protected route/layout metadata remains unchanged.
- Root and contact checked at **390 / 768 / 1440 px**, no horizontal overflow;
  six local screenshots reviewed for layout. Fonts are stubbed, external map embeds
  blocked and offscreen lazy images not comprehensively exercised; real asset/font
  and authenticated/live-platform QA remain launch gates.
- Final lint and `git diff --check` pass; diff limited to metadata/SEO, focused tests
  and current readiness docs. No concrete legacy-client identifier is listed in
  PROJECT or found in the targeted source/asset inventory. Historical security
  documents, auth, service code, dependency files and client facts are unchanged.

Build warnings: the existing Vite future config-loader notice and a nested isolated
checkout/multiple-lockfile workspace-root notice. Neither blocked validation; no
dependency or application build configuration changes made to suppress them.
No large SQL/concurrency/security suites rerun for this SEO-only patch. Every live
verification checkbox and CONFIG/DATA/OPS gate remains open.

### 7C guarded bootstrap and checks actually run

Current verdict remains **A. CODE READY — BLOCKED ON CLIENT/PRODUCTION CONFIG**.
OPS-01 tooling/rehearsal is complete. Production execution, CONFIG-01/02,
DATA-01/02, OPS-02/03/04 and live verification remain open. This is not launch
approval or a request to supply private credentials in chat.

The CLI creates only Tier 1/rank 1, Tier 2/rank 2 and the supplied initial active
ADMIN, version 0, with centralized Argon2id hashing and no Customer. Inspection
requires migrated public tables and exactly six finished checksum-matching migration
records. Both modes require explicit expected host/port/database, production-capable
tool acknowledgement and exact target confirmation; apply additionally requires a
SHA-256 plan binding target, normalized email, tier/ADMIN definitions, state fingerprint
and migration identity. No password, hash or connection credentials enter the plan.
Read-only default does not prompt/hash/write. Apply confirms hidden input twice,
then rechecks under self-conflicting table locks, inserts all three rows atomically,
checks postconditions and performs independent readback. No auth secret or mail
configuration is required. Exact completion is zero-write; partial/unexpected state
refuses, including extra users/customer data or limiter activity. See
[the exact operator/recovery procedure](LAUNCH-RUNBOOK.md#guarded-first-admintier-bootstrap--milestone-7c).

Verification on Windows / Node **24.20.0**:

- `git fetch origin main`; `git rev-parse HEAD origin/main`: both `6f0d880`, merged
  PR #20. Starting branch `Milestone-7C` was clean.
- `node tests/bootstrap/run.mjs`: fresh source copy
  `.test-runtime/bootstrap-source-oYvVxT`, OS-only inherited environment, no private
  `.env*`, app secrets or live database configuration. Inventory is tracked files
  plus the explicit known bootstrap patch paths for pre-commit checks, never arbitrary
  untracked files. Existing test isolation blocks outbound application service access.
  Disposable PostgreSQL initializes on loopback, applies all six migrations without
  seeding and stops gracefully after verification.
- The wrapper ran `prisma generate`, `prisma migrate deploy` on that fresh local DB,
  `vitest run --config tests/bootstrap/config.ts`: **67/67 passed** (40 unit,
  27 disposable DB/CLI tests), then ESLint, Next typegen and
  `tsc --noEmit --incremental false`: **passed**. No full production build/browser
  suite was needed: only operator tooling/tests/docs/package script changed; runtime
  app, auth, schema, migrations, hashing policy and dependency versions are unchanged.
- Tests cover no-write dry-run/no apply, exact creation/zero unrelated rows,
  existing credential login and wrong-password refusal, normalized email, password
  bounds, unchanged repeat, wrong/partial tiers/users/customer relations, changed
  activation/version, mismatched target/confirmation, stale plan, two concurrent
  callers (one creation), forced SQL failure after tier inserts (full rollback),
  missing/failed/mismatched migration history, no mail imports/calls, unmodified seed
  production/nonlocal refusals and sanitized stdout/stderr including raw/percent-encoded
  fictional database passwords and forbidden CLI password arguments.
- `node --conditions=react-server --import tsx tests/bootstrap/prompt-smoke.ts`
  in an actual Windows PowerShell TTY: **passed** two hidden fictional password
  entries and raw-mode restoration, with no value echoed. No DB connection in this
  terminal smoke. Automated tests also cover cancellation, EOF, timeout, backspace,
  CRLF, mismatches, invalid lengths, non-TTY input and raw-mode setup failure.
- First 64-test rehearsal passed but typecheck identified three test-case typing
  errors; corrected parameter tables/literal types. Corrected 64-test run passed
  all checks; final 67-test run adds migration/encoded-secret/refusal coverage.
- `git diff --check` and diff/source review pass; historical security records,
  development seed, app/SEO/auth/service code, migrations and lockfile unchanged.
  `npm.cmd run db:bootstrap -- --help` passes without DB access. Local documentation
  checks pass for six files, 42 relative links, new 7C anchors/code fences and
  whitespace in all ten new source/test files.
  No concrete legacy-client identifier is listed in PROJECT; targeted source/asset
  inventory found none requiring cleanup. Existing Vite future config-loader notice
  is non-blocking; no dependency changes made to suppress it.

No live database/service, Preview data, Production credentials, real account,
deployment, grants, email or client catalog/prices were accessed or changed.
Production target/role permissions, real TLS connectivity, backups, ADMIN identity
and login remain live operator gates. The local tests do not certify those facts.

### 7D configuration manifest and checks actually run

2026-09-08: documentation-only change in five files: new
[PRODUCTION-CONFIGURATION.md](PRODUCTION-CONFIGURATION.md), this readiness record,
LAUNCH-RUNBOOK, DECISIONS and PROJECT. App/auth/DB/Sanity/mail/bootstrap code,
dependencies, `.env.example` and private configuration files are unchanged.

- `git fetch origin main`, `git switch main`, `git merge --ff-only origin/main`
  (already up to date), `git rev-parse HEAD origin/main`: both `7b4fa65`, merged
  PR #21. Initial fetch was sandbox-denied; approved retry completed. No merge
  commit, push or remote repository mutation was made.
- Read project/configuration/operator code, six migrations, installed Next.js
  environment/maxDuration guidance and installed Auth.js/pg cookie/TLS behavior.
  Sanity best-practices guidance informed the existing integration review; no
  architecture rewrite. PATH CLI lookup, tool inventory and browser state inspection
  found no authenticated provider inspection surface available in this session.
- One-off in-memory local checks emitted only allowlisted Vercel project IDs,
  DB host/database/role/security option names, Sanity public identifiers and
  secret/setting presence booleans. `.env`/`.env.local` were parsed without loading
  them into process configuration. No credential validity test, live SQL query,
  bootstrap dry-run, catalog audit or provider account/content query was performed.
- Official Vercel, Neon/PostgreSQL, node-postgres, Sanity and Resend documentation
  researched on the audit date; supporting URLs accompany the manifest's procedures.
  Neon Markdown documentation was fetched directly after the web reader could not
  parse it. Public research verifies guidance only, not account settings or retention.
- `npm.cmd run lint`: **passed**. In-memory relative-link/anchor/code-fence checks
  across the five changed documents: **passed**. `git diff --check`: **passed**;
  the new untracked manifest was separately checked for whitespace/final newline.
  A preliminary whole-file whitespace check flagged existing Markdown hard breaks
  in DECISIONS; these intentional pre-existing lines were preserved.
- Secret-exclusion checks compared the five documents in memory with local secret
  values/encoded forms and DB password, emitting only pass/fail counts: **passed**.
  Credential-shaped text check passed. No actual secret appears in the patch.
- Diff reviewed for scope; PROJECT lists no concrete legacy-client identifiers to
  search. Tracked source/asset identity inventory found no task-related residue.
  No application UI changed; responsive/browser smoke, typecheck, production build
  and large security/order suites were not rerun for this documentation-only task.

7D completes the manifest/manual verification definition, **not** production
configuration. No live mutation, migration, bootstrap, import, email, deployment,
DNS/domain action, grant change or provider login occurred. Next action is the
read-only owner/dashboard target review in the manifest; live gates remain open.
