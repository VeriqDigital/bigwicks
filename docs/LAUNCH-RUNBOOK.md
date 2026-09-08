# Big Wicks launch and rollback runbook

Prepared **2026-09-08**, baseline `1129cbf` (PR #18). Use with
[PRODUCTION-READINESS.md](PRODUCTION-READINESS.md). This is the **one authoritative
release sequence**, superseding older illustrative launch orders in project docs.

**Current verdict: B. NOT CODE READY — BLOCKERS IDENTIFIED.** Public SEO completion
is open; production configuration, bootstrap process, client data and live smoke
evidence are also outstanding. This document is not permission to perform any
production operation. Nothing below was executed against a live service in 7A.

## Operator rules and release record

Obtain separate authorization for the exact target, release window, deployment,
migrations/bootstrap/imports, DNS changes, approved test email/orders, availability
changes and invitation cohort. Permissions for one do not authorize another.
Do not merge/deploy/import/send automatically from reading this document.

Assign actual people to: release operator, Big Wicks data approver, DB/recovery
owner, Sanity owner, DNS/email owner and order/inquiry owner. Record who can stop
launch and who can approve resumption. Roles here are responsibilities, not
invented staff names. No unnamed/unowned critical step may pass.

Maintain a restricted launch ledger containing:

- Commit and lockfile checksum; deployment IDs and known-good rollback candidate.
- Approved production origin, Vercel project/environment, DB branch/database/role,
  Sanity project/dataset, exact tier ranks/names and credential-manager references.
- Client approvals, artifact checksums, availability matrix, customer/cohort ledger.
- Backup/restore-point IDs and rehearsal evidence; UTC start/end times, counts,
  redacted outputs, each operator/approver and pass/fail decisions.

Never paste passwords, API keys, DB URIs, raw tokens, full setup URLs, price lists
or customer messages into Git, screenshots for public review or build logs.
Private data stays in access-controlled encrypted storage; ignored local
`data/onboarding/` is a working directory, not a backup or access-control system.

Commands use repository npm scripts; Windows PowerShell may use `npm.cmd`.
Run commands **one at a time** and check exit code before proceeding. A shell
block is not a single automatically approved batch. Use a dedicated operator
checkout/process without developer `.env*` files. Inject exact intended secrets
from the secret manager into process env without echoing them. Prisma uses
DATABASE_URL; there is no DIRECT_URL override implemented here.

The placeholders `PROJECT`, `DATASET`, `REVIEWED_PLAN_HASH` and artifact names
below are **not real values**. Replace them only from signed target/artifact
records. Any unresolved placeholder is a STOP. Never insert a secret in a command
argument, shell history or shared terminal transcript.

Mutation labels: **LOCAL** = local files/checks only; **READ** = remote reads;
**WRITE** = remote data/configuration/deployment mutation; **MAIL** = irreversible
external message attempt. Do not run a WRITE/MAIL step during an audit-only task.

## Phase 0 — Approvals, code closure and rehearsal

Prerequisite: client/release owners identified; working branch contains all fixes
through PR #18; preserved resolved mapping custodian identified.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 0.1 Close CODE-01 in a bounded reviewed patch: homepage canonical, `/` + `/contact` sitemap, robots reference. Add Preview indexing guard only if verified hosting control is insufficient. | LOCAL code; later merge/deploy separately approved | Lint/typecheck/relevant metadata tests/build; production origin URLs, public indexability, private noindex; no prices in public output. | Wrong origin, all-site production noindex or private sitemap route: fix before release. Code revert affects code only. |
| 0.2 Obtain missing pricing/customer/availability/domain/recipient/public-copy decisions from readiness section 4. Agree complete or explicitly narrowed launch assortment/cohort. | None | Written independent tier prices, exact customer tiers and availability matrix; staff approves neutral/current currency wording or supplies final wording for a reviewed patch. | No implicit approval of 22 blank prices, empty Tier 1 catalog, fixture customer or guessed business fact. Hold dependent phases. |
| 0.3 Inventory and back up original resolved 302-product mapping, approved exclusions and W515B/W515BC resolution; compare artifact checksum with custodian's approved copy. | LOCAL private copy | 302 distinct existing UUIDv4 keys, 17 approved category names, all false, correct brand/packing, no Unit Cost; verified restore of the same mapping bytes. | Missing mapping or changed/blank keys: STOP. Retrieve original, never remap the raw workbook to regenerate keys. |
| 0.4 Prepare and rehearse the first-tier/ADMIN procedure specified in phase 2 on a newly isolated local DB. | LOCAL isolated test DB only, separately scoped | Target guard, no mail, create-only transaction, correct tiers/ADMIN, safe refusal on conflicting state, no secret output; operator and reviewer sign off. | **No current repository production-bootstrap command exists.** Do not improvise seed or execute partial SQL; hold phase 2 until the procedure is reviewed. |
| 0.5 Recheck release advisory inventory and candidate tests. | LOCAL + public advisory READ | No reachable critical/high runtime regression; exact committed lock and Node 24.x candidate. | Stop on credible regression; bounded patch/recheck, never `npm audit fix --force`. |
| 0.6 Rehearse restore and first-day manual order/invitation recovery with isolated fictional data. | LOCAL or explicitly authorized isolated service | Named owners can recover artifacts/DB and reconcile saved orders without duplicate sends. | No tested restore or staff coverage: hold production writes/customer release. |

Commands available now for source/public verification (no application remote access):

```text
git status --short
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
node tests/security/inspect.mjs dependencies
node tests/security/run.mjs lint
node tests/security/run.mjs typecheck
node tests/security/run.mjs unit tests/unit/onboarding.test.ts tests/unit/onboarding-cli.test.ts tests/unit/pricing.test.ts tests/unit/customer-import.test.ts tests/unit/account-tokens.test.ts tests/unit/catalog.test.ts
git diff --check
```

The isolated wrapper strips private env files, blocks external application traffic
and uses fictional configuration. The typecheck command generates Prisma and Next
types. These are not production smoke checks. Future application changes need
applicable production-build/browser checks; no need to repeat unrelated large
security suites for this documentation-only milestone. Ordinary `npm run build`
loads local environment and downloads fonts; run only in a deliberately configured
build context. Do not use a prior audit build with test preloads as a release artifact.

**Phase exit:** code acceptance gaps closed; target plan and essential inputs approved;
bootstrap/restore procedures rehearsed. Infrastructure planning can happen while
pricing is pending, but no dependent customer-release gate is waived by doing so.

## Phase 1 — Provision production infrastructure and isolate configuration

Prerequisite: phase 0 approvals for infrastructure, owners and exact target names.
Production catalog/prices remain absent and no real customer mail may run.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 1.1 In the intended DB provider console provision/select the approved Production branch/database. Establish restore window, backup location and restore access. | WRITE infrastructure | Target sheet matches console; independent from Preview, no Preview-derived users/data. Empty intended application schema before migration. | Wrong branch, unknown lineage or fixtures: STOP; provision a clean intended target, do not delete unexplained records. |
| 1.2 Configure least-privilege runtime PostgreSQL role/connection and separate migration/bootstrap operator capability. Require TLS and provider-compatible pooling. | WRITE grants/config | Runtime can perform required application reads/writes, not schema DDL; migration identity can apply schema. Verify network/TLS, max-five-per-process pool implications and transaction support. | No TLS verification, wrong role/database, pooling incompatibility: fix config. Keep privileged URI out of app scope. |
| 1.3 Select/create approved public-content production Sanity dataset in confirmed project; verify members/roles and full raw read scope. | WRITE infrastructure | Empty or independently reconciled dataset; correct project/dataset, no costs/prices/customer records. Exact dataset name comes from owner, not this document. | Unexpected documents/drafts/private fields: investigate before import; use isolated clean target if required. |
| 1.4 Configure Vercel **Production** scope with inventory values; record Preview/Development scopes separately. Keep all seed/import/test variables absent; operator tokens out of Vercel. | WRITE config | Correct DB, AUTH_SECRET, AUTH_URL, site origin and public Sanity pair; future builds use Production values. Compare secret references and redacted target identifiers, never values in ledger. | Any Preview/Production crossing or secret in NEXT_PUBLIC: stop and correct/rotate if exposed. |
| 1.5 Verify Preview isolation and protection. Keep Preview RESEND_API_KEY absent by default; test accounts must be internal/nonproduction only. | WRITE config if needed | No real customer recipients in Preview SQL; contact/order routing cannot substitute for account-recipient isolation. Verify Preview protection and noindex headers, including custom Preview domains. | An enabled real key plus real customer identities is a stop. No application recipient allowlist exists. |
| 1.6 Confirm sender/recipient ownership, Resend domain and SPF/DKIM/DMARC records, quotas, tracking policy and provider role access. Do not send yet. | WRITE provider/DNS only when authorized | Domain verified; authentication records validated, From addresses approved, CONTACT_TO_EMAIL and ORDER_TO_EMAIL confirmed, quota headroom recorded. | Unconfirmed recipient, sender verification failure or token-link rewriting risk: hold all mail. Restore prior records if change disrupts existing mail. |
| 1.7 Plan a protected Production candidate reachable only by approved staff until phase 10. Verify hosting can protect it through domain attachment. | READ planning / WRITE protection | Recorded deployment/route access policy, known safe previous public site and rollback method. | If protection cannot isolate unfinished release, do not switch public traffic early. There is no application maintenance switch. |

Production AUTH_URL and NEXT_PUBLIC_SITE_URL should already be the **approved final
HTTPS origin**, even before it resolves. Do not issue setup/reset links yet. The
runbook verifies/reapplies these after domain attachment; it does not use a Preview
URL as a temporary production email origin. Save known-good config before changes.

**Phase exit:** exact production targets and access established, environment scopes
signed off, recovery point available, no mail/campaign scheduled automatically.

## Phase 2 — Deliberate SQL migration and bootstrap

Prerequisite: production target/backup/grants verified; writes specifically
authorized; phase 0.4 reviewed provisioning procedure ready. No seed commands.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 2.1 Take provider restore point/pre-migration backup. Inspect target in console and record database/schema/role identity without credentials. | READ + backup operation | Fresh restore-point ID/time, authorized operator and matching target. | Cannot restore/target ambiguous: STOP before migration. |
| 2.2 Run `npm run db:generate`, then `npm run db:deploy` in the dedicated operator process. | LOCAL generation; **WRITE SQL schema** | All six known migration IDs apply successfully, command exit 0. No customers/tier/price/order fixtures appear. | Any error: stop; inspect `_prisma_migrations` and partial DDL. Do not run migrate dev/reset/seed or blindly resolve history. Recovery C below. |
| 2.3 Run `npx --no-install prisma migrate status`; inspect schema constraints/indexes and migration rows in a read-only console. | READ SQL | All six finished, no unresolved failed migration, current schema matches readiness section 8. | Pending/failed/missing/custom-check drift: investigate; status alone does not prove no drift. |
| 2.4 Execute only the signed create-only tier/initial-ADMIN procedure described below, once. | **WRITE SQL** | Exactly the approved tiers and one authorized ADMIN with secure hash; zero Customer rows from bootstrap; zero AccountTokens/mail. | Conflicts/nonempty unexpected state/unknown admin: no overwrite, stop. Transaction rollback or investigate committed result before retry. |
| 2.5 Independently review bootstrap result and runtime-role access; securely transfer administrator credential to its owner. | READ / secure credential handoff | Active ADMIN, no Customer relation, correct normalized email, sessionVersion 0, password hash present; Tier 1 rank 1 / Tier 2 rank 2 (if approved unchanged). | Never output hash/password. Correct wrong bootstrap through reviewed procedure/recovery, not public reset or seed. |

Migration commands, **future authorized Production operations only**:

```text
npm run db:generate
npm run db:deploy
npx --no-install prisma migrate status
```

Read-only verification SQL (execute in the verified Production console; outputs
contain counts/schema identifiers only):

```sql
SELECT migration_name, finished_at IS NOT NULL AS finished,
       rolled_back_at IS NOT NULL AS rolled_back, applied_steps_count
FROM "_prisma_migrations" ORDER BY migration_name;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' ORDER BY tablename, indexname;

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

SELECT "rank", "name" FROM "PricingTier" ORDER BY "rank";
SELECT "role", "active", COUNT(*) FROM "User" GROUP BY "role", "active";
SELECT COUNT(*) AS customer_count FROM "Customer";
SELECT COUNT(*) AS account_token_count FROM "AccountToken";
SELECT COUNT(*) AS price_count FROM "ProductPrice";
SELECT COUNT(*) AS order_count FROM "Order";
```

### Required first-ADMIN/tier procedure — currently an open gate

The only repository writer creating ADMIN or initial tiers is `prisma/seed.ts`.
It creates `admin@example.test` and two fictional customers and refuses normal
production use. **It is not a production process and must not be adapted at the
terminal by disabling guards.** Migrations create tables, not required tier rows.
Customer creation/import cannot create an ADMIN; public reset/setup excludes ADMIN.

The reviewed provisioning procedure must:

1. Take explicit expected production target and operator acknowledgment; verify
   actual target separately. Read a confirmed normalized ADMIN email and a
   user-chosen or securely generated unique 15–128-character password via hidden
   prompt/secret manager, never CLI argument, hardcoded default or logged env dump.
2. Hash using existing `lib/auth/password.ts` Argon2id policy (19 MiB, two iterations,
   one lane, random salt), before transaction; do not print the hash.
3. In one transaction recheck expected initial state and create the approved unique
   PricingTier rows (rank/name 1/Tier 1, 2/Tier 2 if that remains the signed mapping)
   and ADMIN User (active true, sessionVersion 0, no Customer association). Use
   generated Prisma IDs/timestamps. Reject conflicting existing rows; do not upsert
   over an existing password, role, tier or active flag. A repeated invocation must
   safely refuse or verify the already-completed result without altering it.
4. Return only nonsecret counts/status; disconnect; perform independent readback.
   Never import Preview SQL, create fake customers, create AccountTokens or send mail.
5. For later ADMIN recovery, require owner identity verification and a backup,
   update secure hash and increment sessionVersion in a reviewed transaction;
   invalidate outstanding account tokens, retain authorized role and no Customer
   association. No public/admin UI recovery tool is currently available.

This is the acceptance specification, **not an existing executable command**.
Until implemented/reviewed/rehearsed or replaced by a signed equivalent DBA
procedure, phase 2.4 remains STOP. Do not imply `db:deploy` completes bootstrap.

## Phase 3 — Production Sanity catalog import, all unavailable

Prerequisite: phases 1–2 complete; separately authorized Sanity write, protected
artifact supplied and backed up; one import operator, other catalog edits paused.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 3.1 Confirm resolved artifact and key mapping. If only prices/content need approved edits, preserve all supplied keys; use a new file and retain original. | LOCAL private files | 302 intended rows/17 categories; exclusions and W515B/W515BC decision match preserved review; all false; Unit Cost absent. | Any blank/new/changed key or changed resolution: stop and recover original mapping. |
| 3.2 Obtain full dataset backup/export before import. Inspect full content for private fields, drafts/releases or unrelated data. | READ remote + LOCAL backup | Empty or exactly reconciled target; restore path verified. | Unexpected content: stop. Importer preserves unrelated fields and is not a sanitizing export tool. |
| 3.3 Inject full-read scoped operator token into SANITY_API_WRITE_TOKEN. Clear nonproduction designation for this process; keep ALLOW_PRODUCTION_CATALOG_IMPORT false. Run dry-run below. | READ only | Correct PROJECT/DATASET, `productionGuarded: true`, productsInFile 302, errors 0; empty target: newProducts 302, newCategories 17. Record hash, counts and file checksum. | Wrong target/guard/count, errors or draft/revision conflict: no apply. Correct/review and dry-run again. |
| 3.4 After separate final plan approval, use scoped write token and set operator-only ALLOW_PRODUCTION_CATALOG_IMPORT exactly true; run exact hash/confirm/flag apply below. | **WRITE Sanity** | `applied: true`; product transaction sent for new import. Categories commit first then products. | Any uncertain outcome: do not blindly retry; inspect target and produce new dry-run. Recovery D. |
| 3.5 Immediately disarm production apply env and remove write capability; rerun same-file dry-run with full-read credential. | READ verification; credential cleanup | 302 unchanged / 0 new / 0 updates / 0 errors; correct target. Independently verify 302 products/17 categories and zero available. | Mismatch: keep all products hidden, investigate before prices/customer access. |

Use an existing preserved resolved file at the reviewed path; these example names
must be replaced with its approved filenames. Do not run prepare on a blank-key source.
If an approved revised pricing artifact is needed, `catalog:prepare` on an
**already keyed** file preserves its keys and creates a new `.pricing.csv`; it
writes locally only and refuses overwrites. Inspect every key before accepting it.

```text
npm run catalog:import -- data/onboarding/production-reviewed-resolved.csv --project PROJECT --dataset DATASET
```

Apply only after the above gates, with production env acknowledgement injected:

```text
npm run catalog:import -- data/onboarding/production-reviewed-resolved.csv --project PROJECT --dataset DATASET --apply REVIEWED_PLAN_HASH --confirm PROJECT/DATASET --allow-production
```

Sanity post-import checks in the authorized read-only content query tool (raw
perspective; no write) can include:

```groq
{
  "products": count(*[_type == "product"]),
  "categories": count(*[_type == "category"]),
  "enabled": count(*[_type == "product" && available == true]),
  "draftOrRelease": count(*[_type in ["product", "category"] &&
    (_id in path("drafts.**") || _id in path("versions.**"))]),
  "missingCategory": count(*[_type == "product" && !defined(category->name)])
}
```

Expected fresh production result: 302 / 17 / 0 / 0 / 0. Compare the **set of
catalogKeys**, SKUs, names, categories, brand/packing and exclusions to approved
source, not just counts; spot-check both W515B/W515BC against original recorded
decision. Full private-field inspection is additional to this narrow query.
Do not put output containing accidental private data into public evidence.

## Phase 4 — Domain attachment and DNS cutover under protection

Prerequisite: phases 1-3 targets/schema/catalog verified, confirmed domain ownership
and apex/www policy, separately authorized candidate deployment and DNS change,
current DNS/config snapshots. Prices/customer accounts need not yet be imported. Preserve
the existing public site until these gates can be satisfied.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 4.1 Build/deploy the approved Production-scoped candidate behind verified access protection, for authorized operator use. Keep AUTH_URL/site origin set to the approved final origin. | **WRITE deployment**, separately authorized | Correct release commit, platform native packages and Node 24.x confirmed; no migration/seed in build. Do not attempt browser-based imports until domain/HTTPS steps below pass. | Wrong environment, failed build or inability to protect candidate: stop/revert candidate or config (A/B). Never promote a Preview-configured artifact. |
| 4.2 Verify registrar/DNS authority and record current records/TTLs. Attach confirmed domain to intended Vercel Production project. | READ then **WRITE config** | Correct project, primary domain and optional alias/redirect policy. | Ownership/project conflict: stop, do not guess domain or transfer ownership. |
| 4.3 Enter exactly the DNS records shown by the current Vercel domain workflow. Preserve existing mail/TXT records. | **WRITE DNS** | Vercel verification and DNS resolution converge; ledger records old/new records and time. | Unexpected service/email impact: recovery H, stop further changes. Never paste guessed IP/CNAME values from this document. |
| 4.4 Wait for verification and valid HTTPS certificate on canonical and redirect origins. Check protection still limits unfinished candidate. | READ | Trusted certificate, no browser error/redirect loop; HTTP redirects to HTTPS. | TLS/propagation/protection failure: do not invite or expose unfinished production. |
| 4.5 Verify/update Production AUTH_URL and NEXT_PUBLIC_SITE_URL to exact final HTTPS origin; rebuild/redeploy Production candidate if anything changed. Recheck Sanity credentialed CORS for exact editor origin. | **WRITE config/build** if needed | Both values match approved canonical origin; regenerated metadata and setup/reset links will use final origin. | Preview/localhost/alias mismatch, wrong baked dataset: stop and correct/rebuild (B). |
| 4.6 Read homepage/contact canonical/OG, sitemap/robots; inspect www/apex redirects. | READ | Public route URLs use canonical HTTPS only; sitemap has `/` and `/contact`, utility paths excluded. Protection may be active, but app's production indexing must be correct for release. | CODE-01 not resolved, wrong host or all-site noindex after protection removal: stop public release. |

The final domain must work before phase 5 ADMIN login: Auth.js redirects to
AUTH_URL, so a temporary deployment hostname is not a reliable substitute.
DNS attachment is not the invitation/public-release decision. If protection cannot
remain in place during cutover, keep the known-good public deployment active until
an equivalent controlled test/cutover plan is approved. Do not rely on robots or
hidden products to prevent public access to an unfinished retail site.

## Phase 5 — Private production pricing import

Prerequisite: verified production catalog + SQL tiers/ADMIN; phase 4 protected final-domain candidate; backed-up database and
approved independently supplied pricing file; no customer release yet.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 5.1 Sign in as real ADMIN. Open `/admin/pricing`, download current export; compare current rank/name headers and keys to approved pricing artifact. Capture pre-import DB backup. | READ + private LOCAL export | Header `catalogKey,sku,productName,category,available` + all current tier columns. Empty baseline prices for first import. | Wrong tier/keys, conflicting values, unexplained fixtures: stop. |
| 5.2 Upload reviewed CSV, review exact values and per-tier create/update/remove/unchanged counts; confirm only after review. | Preview READ; **WRITE SQL on confirm** | First full two-tier 302-product import would create 302 rows per tier; **not current known data**. Partial staging uses only signed expected counts (known source currently 280 Tier 2 / 0 Tier 1) and does not approve launch. | Unknown SKU/name warning, wrong prices, accidental blanks/removals, stale preview: stop, correct source/export and preview again. No percentage derivation. |
| 5.3 Export after import and compare every key/tier/decimal to approved artifact; privately archive before/after. | READ | Exact values/counts, no Unit Cost; omitted products unchanged, approved blanks absent as rows. | Mismatch: keep products false, hold customers; restore through reviewed corrective CSV or DB recovery E. |

No SQL price importer exists in catalog tooling. Use `/admin/pricing`; max 256 KiB,
500 product rows, 4,096 chars/record. Upload only current headers, exact decimals,
no symbols/exponents/excess scale. Blank removal requires separate acknowledgment.
Preview expires after ten minutes; changes to catalog/tier/prices/admin invalidate it.

Read-only per-tier count check:

```sql
SELECT t."rank", t."name", COUNT(p."catalogKey") AS price_rows
FROM "PricingTier" t LEFT JOIN "ProductPrice" p ON p."pricingTierId" = t."id"
GROUP BY t."id", t."rank", t."name" ORDER BY t."rank";
```

Do not pass a price gate using counts alone: compare product identity and exact
case prices. Tier 1 source and 22 unresolved Tier 2 prices still need client action
unless an explicitly narrower approved launch is recorded.

## Phase 6 — Verify full catalog and launch assortment

Prerequisite: aligned production Sanity and SQL, imported approved pricing, products
still false, data owners available. These are remote reads, not publication.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 6.1 Inject aligned production DATABASE_URL and public Sanity pair into read-only operator process; run `npm run catalog:audit`. | READ remote | documentCount 302, expected priceCount; classify every issue. Exit 0 = no issues, 1 = issues, 2 = audit could not complete. | Exit 2 is not an empty catalog. Key duplicates/orphans/invalid prices/tiers are hard stops; repair against backups/source. |
| 6.2 Inspect all 302 products against launch-readiness matrix, including every intended tier price while hidden. | READ | Valid keys/SKUs/name/categories, brand/packing, approved price coverage and manual content/availability decision. | All-false catalog suppresses available-price checks. Do not treat zero pricing findings as completeness. |
| 6.3 Classify missing images/descriptions and approved exceptions separately from integrity errors. Sign off exact launch subset and tiers. | None | Explicit optional-content acceptance or completed content. Missing-image placeholder and absent description are understood by staff/client. | Do not enable arbitrary products to make an empty catalog look complete. Hold affected assortment until approved. |

No product is enabled here. Audit can return exit 1 for expected missing optional
content; record those exact codes and client-approved omissions. Never waive key,
price, category-mapping or unexpected-availability issues under a generic warning waiver.

The audit checks **all configured tiers**, not just the approved launch cohort.
If the client explicitly chooses a Tier 2-only release, document any Tier 1
`available_product_missing_valid_price` findings as deferred-tier findings with
proof that Tier 1 customer access is held back. Review/disable non-launched accounts
under the approved active-flag plan; merely omitting invitations does not revoke
an already-configured account. A missing price in a tier actually receiving access
remains a STOP. Do not claim a clean audit when accepting this narrow exception.

## Phase 7 — Import customers, send nothing

Prerequisite: approved real source and tier assignment, exact environment verified,
backup captured, ADMIN access working. Any internal smoke CUSTOMER must be a
specifically approved real staff-owned account with accurate supplied fields.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 7.1 Download template from `/admin/customers/import`; validate source privately. | READ / LOCAL | Exactly `companyName,customerNumber,email,pricingTier,active`; real approved identities, no test fixtures/default passwords. | Missing customer numbers/tiers or inferred data: return to client. |
| 7.2 Upload and inspect preview, every identity/tier/active flag and total. | READ | Max 128 KiB/250 rows/2,048 chars per record; no duplicates/collisions/errors. | Any collision rejects whole create-only batch. Never alter existing accounts through CSV or change email just to evade collision. |
| 7.3 Explicitly confirm creation. | **WRITE SQL** | Approved N User/Customer pairs, null passwords, correct CUSTOMER role and active flags; result states **no invitations sent**. | Error/lost response: check actual list/counts before retry. No blind replay; recovery F. |
| 7.4 Compare created list to source and private ledger. Check zero unexpected AccountTokens and provider send events for import window. | READ | Exact identities/tiers/counts; no email side effects and no fixture accounts. | Any unexpected mail/token or wrong tier/active flag: stop campaign; investigate before any invitation. |

Imports do not require Resend sending. Leave all recipients uninvited until phase
8 internal test and phase 10 explicitly approved campaigns. Merely importing an
active passwordless customer does not permit login. Review customer import source,
IDs, active flags and planned cohort again immediately before sending.

## Phase 8 — Real-domain internal smoke, before customer campaign

Prerequisite: actual HTTPS domain, proper environment, confirmed mail senders and
recipients, explicit authorization for internal email and account actions. Only
approved staff identities/mailboxes. Products still false initially.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 8.1 Anonymous public browse and protected-route checks. Test ADMIN login/dispatcher/logout on real domain. | READ; auth/limiter/cookie writes | Public pages render; anonymous protected reads denied without private data; ADMIN reaches `/admin`, cannot order as CUSTOMER; logout returns login. Browser callback URL cannot redirect externally. | Wrong routing/access/cache or login failure: stop, investigate config/code; no campaign. |
| 8.2 Browser DevTools cookie review (do not copy values). | READ | HTTPS session cookie Secure + HttpOnly + SameSite=Lax + Path=/, host-only (no Domain); expected `__Secure-` prefix; no session on unrelated alias. Confirm expected expiry/refresh behavior. | Missing flags or insecure effective origin: stop; fix ingress/AUTH_URL, fresh login. |
| 8.3 Inspect ingress behavior and sensitive response caching using approved benign checks; verify relevant Origin rejection using existing test procedure in controlled environment. | READ / bounded request checks | Trusted Host/forwarded proto; no permissive allowedOrigins; protected HTML/RSC/session/export not shared-cached; token pages no-referrer/private-no-store/noindex. | Cross-host/cached private output: stop immediately; restrict access and investigate. Do not run load or hostile payload tests on production. |
| 8.4 Send a separately approved individual setup invite to approved staff-owned CUSTOMER account; check Resend event and actual inbox/Spam, authenticate email results, inspect link locally. Complete setup once. | **MAIL + WRITE SQL** | Link is final HTTPS origin; accepted marker, inbox delivery observed, chosen password login works, same link unusable after use; account remains in approved active state. | Wrong recipient/origin, no delivery/Spam problem, unusable accepted link: stop before customer cohort; recovery G and email investigation. Gmail Spam was observed previously. |
| 8.5 Request reset for that staff-owned configured CUSTOMER; complete once; verify prior session denied and account flags unchanged. Test logout/back/forward then fresh protected request. | **MAIL + WRITE SQL** | Generic request response, final-domain link, single-use reset, renewed password works; old session no longer authorizes. Previous browser content may remain until fresh request. | Any failure: hold campaign, resolve before re-testing. Do not use ADMIN public reset or send to real customer as a test. |
| 8.6 Submit one approved internal contact message with real staff Reply-To to confirmed contact inbox; verify received content/routing and inbox/Spam. | **MAIL + limiter WRITE** | Success/acceptance plus actual inbox evidence; no customer data in logs. | Failed/uncertain send: inspect provider/inbox, avoid blind retries; verify DB/AUTH_SECRET as well as email settings. |
| 8.7 Inspect public, login, admin, Studio and customer empty-state at representative phone/tablet/desktop (390/768/1440 px). Mount configured Studio with authorized editor. | READ, editor sign-in only | No overflow/broken assets, readable controls, real fonts/images, correct dataset and permissions. | Broken critical flow/Studio or asset: fix before publication; avoid test edits to real products. |

Record token expiry policy using existing isolated tests (setup 24h/reset 1h) and
actual issued timestamp/expiry metadata without raw token. A wall-clock production
expiry test requires scheduling an approved internal follow-up; do not change clocks
or real customer tokens. Test invalid/reused links immediately; verify expiration
later if that is part of the owner-approved smoke criteria.

No deliberate production email outage is required: saved-order failure guarantees
come from isolated tests. Inspect real status and staff recovery capability next.

## Phase 9 — Approved pilot availability, order smoke, then full approved subset

Prerequisite: internal domain/auth/contact smoke passed; approved readiness matrix
and exact pilot real product(s); staff-owned CUSTOMER and approved order-test
handling; no external campaign yet. Take a new Sanity backup.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 9.1 In Studio publish available=true only for the explicitly approved pilot products after verifying prices for each intended tier. | **WRITE Sanity** | Refreshed customer portal shows exactly eligible pilot products and their current tier prices; false/unpriced products absent. | Unexpected key/price/product: set affected availability false in a reviewed change, audit and hold (D/E). |
| 9.2 Authorized internal CUSTOMER enters case counts, reviews server values, submits one clearly coordinated staff test request. | **WRITE Order + MAIL** | One BW reference, exact cases/prices/totals and immutable product/business snapshots; confirmation renders. Staff knows not to fulfill smoke request. | Unknown outcome: retry **same review**, never create a replacement review. Reconcile by reference/time/company before proceeding. |
| 9.3 Staff opens `/admin/orders` and reference detail, checks accepted/delivery vs persistence and records offline handling of smoke request. | READ / external staff ledger | One saved order, correct staff recipient; ACTUAL notification status understood. If FAILED/PENDING, saved request can be handed off manually. | Missing order, duplicate unexpected order, wrong recipient/snapshot or inability to reconcile: STOP release. No in-app delete/status-edit exists; retain and annotate smoke reference in staff ledger. |
| 9.4 Verify each intended tier with a separately approved real staff-owned customer context or controlled approved tier change; reset context afterward. Check customer isolation and quantities/review on 390/768/1440 px. | READ / approved tier WRITE only if needed | Correct tier-only prices, no cross-customer confirmation access; no other-tier price payload. Cases and finalization language understood. | Tier/context ambiguity or unavailable pricing: hold affected cohort. Do not fabricate a customer just for testing. |
| 9.5 Publish remaining approved availability subset, one owner/change window; refresh/audit after publication, archive updated content baseline. | **WRITE Sanity**, READ verification | Enabled set equals signed matrix; valid price for every intended launched tier; optional content omissions documented. | Any unexplained true product/missing price/key mismatch: stop and re-hide affected set, investigate. Never infer from BoxHero stock. |

Enabling a product requires a business decision already made, not an automated
inventory inference. Never reapply the original all-false import file after this
phase without reviewing every difference; it can overwrite later content/visibility.

## Phase 10 — Final go/no-go, public opening and separate invitation cohorts

Prerequisite: phases 0–9 passed, all hard stops resolved, named monitoring staff
present and separately authorized public release/invitation timing/cohort.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 10.1 Complete final checklist below; release owner/data approver sign ledger. | None | Every mandatory box has evidence, not an assumption. | Any unchecked integrity/config/data/operations gate: NO-GO. |
| 10.2 Release approved Production deployment from temporary protection / switch approved production alias as applicable. | **WRITE hosting** | Public retail `/` and `/contact` usable/indexable over HTTPS; correct canonical/OG/sitemap/robots; protected surfaces remain authenticated/noindex. | Wrong public response, noindex or access exposure: rollback A/B/H as applicable; hold invites. |
| 10.3 In `/admin/customers/invitations`, select only small approved first customer cohort (suggest 3–5), preview every recipient, then confirm. | Preview READ; **MAIL + SQL** | Selected active/passwordless customers only; truthful accepted/stale/not-attempted/unconfirmed rows. Owner confirms actual receipt/setup experience before next cohort. | Any routing/tier/origin/delivery issue: stop additional batches; recovery G. Accepted does not prove delivery. |
| 10.4 Review outcomes/current candidate list; proceed to remaining approved cohorts, max 25 per batch. | **MAIL + SQL** | Per-batch ledger reconciled, quota/headroom maintained, no automatic full-list send. | Interruption/quota/stale actor/recipient: refresh and review. Never replay spent preview or blindly resend earlier accepted rows. |

Bulk is sequential with 600ms pacing and a 300-second requested duration; provider
call delays plus DB work can still exhaust limits. Prefer smaller batches if
duration evidence is insufficient. Quotas: 100 bulk/hour globally, 3/recipient/15min
shared with individual, individual 30/hour globally. Reset/contact/order traffic
uses the same provider credential and adds load. Do not promise all recipients
can be invited at once based only on app quota. No background retry campaign exists.

## Phase 11 — First hour, first day and handoff

Prerequisite: public opening/cohort outcomes recorded; staff coverage active.

| Step / action | Mutation | Expected result and verification | STOP / recovery |
| --- | --- | --- | --- |
| 11.1 First hour: inspect deployment errors/latency, DB connectivity, Sanity/catalog reads, mail events/quota and refreshed admin orders every 10–15 minutes and after each cohort. | READ | No unexplained routing/identity error; every saved reference assigned to staff, PENDING/FAILED handled manually. | Pause campaigns on anomaly; restrict customer access if integrity is uncertain. Use appropriate rollback branch below. |
| 11.2 First day: opening/midday/closing order and mail reconciliation; review support/Spam/bounces and limiter failures. | READ / approved offline handoff | Compare saved SQL references to staff order ledger, never inbox alone; record delivery issues, attempted resends and unresolved cases. | No responsible order owner or unhandled requests: stop new cohorts, escalate immediately. |
| 11.3 Capture post-launch backup/config/content/artifact baseline; confirm continuing coverage/restore access and remove temporary operator write credentials. | Backup/config operations | Restorable baseline, approved production availability retained, no lingering production import opt-in/seed/test preloads. | Backup failure or lost custody: repair before routine changes, preserve existing evidence. |

Proposed check cadence is internal and requires owner agreement. Do not advertise
it as a customer response-time guarantee. Monitor without passwords/tokens/URLs,
private CSV contents, message bodies or unnecessary prices in logs.

## Hard STOP conditions

- Production app or operator points at Preview SQL, wrong DB branch/role or wrong
  Sanity dataset; Preview can access production SQL/write credentials or real customers.
- Missing/weak AUTH_SECRET, inconsistent secret across production instances, insecure
  effective origin/cookies, wrong setup/reset host or Preview URL in email.
- Six migrations not applied/verified; unresolved migration failure/schema drift;
  no usable pre-mutation backup/restore process; missing reviewed bootstrap procedure.
- Missing/changed/regenerated catalogKeys, wrong W515B/W515BC decision, unapproved
  exclusions, unexpected true availability, private prices/Unit Cost in public Sanity.
- Unresolved price for an enabled product/tier being launched without explicitly
  approved narrower assortment; unknown customer tier/active flag or fixture customer.
- Sender domain unverified, order/contact recipient unconfirmed/wrong, unexplained
  email to real customer before campaign approval, failed delivery smoke.
- Public site mistakenly noindex, wrong canonical host, CODE-01 still open, private
  routes/indexing/cache/access incorrect, unresolved public business facts/claims.
- Missing staff order coverage, inability to find saved references, unhandled
  PENDING/FAILED, wrong/duplicate order snapshot, unknown acceptance after failure.
- Credible reachable critical/high runtime advisory or a regression in auth,
  revocation, invitation concurrency, order integrity or private-data isolation.

For each stop: stop dependent mutations, preserve current evidence/backups,
identify owner and containment, repair/reconcile, repeat the failed verification
and obtain release-owner resumption. No generic “fix after launch” waiver for
integrity/security gates. Optional images/descriptions or tooling warnings may be
accepted only under their documented, narrow conditions.

## Rollback and recovery

Rollback is an incident decision, not an automatic script. First pause invitations
and new writes using verified hosting access controls as needed; preserve current
SQL/content/provider evidence before restoring anything. **Git revert does not undo
SQL, Sanity, DNS, mail, accepted orders or leaked content.**

| Case | Contain and recover | Verify before reopening / limitations |
| --- | --- | --- |
| A. Bad Vercel deployment | Route traffic to known-good **Production-configured** deployment using authorized Vercel rollback/alias workflow. If none exists, keep service protected/offline or use prior approved retail site. | Confirm commit, env, domain, APIs, auth and schema compatibility. Do not roll back below required security fixes or to Preview-bound artifact. Code rollback leaves all saved orders/imports intact. |
| B. Bad environment configuration | Restrict affected traffic/mail, compare to saved scope/secret-manager versions, restore correct values, rebuild/redeploy for public vars. Rotate only exposed credentials; account for session/review invalidation. | Recheck actual DB/dataset/role, AUTH_URL/site origin, sender/recipient, TLS/cookies and canonical output. Identify any data written/read/sent in wrong environment and reconcile; restoring config does not undo it. |
| C. Migration problem | Stop writes, preserve current DB and migration logs in restricted storage. DB owner inspects failed/partially applied DDL. Restore pre-migration state to **isolated replacement branch**, verify, then deliberately switch after approval; or apply a reviewed forward repair. | Verify all migration rows/tables/indexes/checks/grants and app reads. Never run reset/migrate dev/seed. `migrate resolve` only after reviewed evidence matches chosen state; no automatic down migrations. Reconcile post-backup transactions; invalidate stale sessions/tokens if restore resurrected them. |
| D. Bad catalog import/publication | Pause edits; keep/revert affected visibility false after explicit review. Compare current raw export to pre-import backup and permanent mapping; dry-run corrected existing-key file. If necessary restore into isolated dataset, inspect, then approved reconfiguration/rebuild or targeted repair. | Preserve catalogKeys and legitimate newer content. Reapplying old rows does **not delete extra products/categories** and may overwrite newer text/availability. Unexpected additions need separately reviewed exact-document cleanup; never regenerate keys. A timeout may have committed product transaction; categories-only outcome is possible. |
| E. Bad pricing import | Keep affected products/customer cohort unavailable; preserve current export/DB. Use pre-import export to prepare a corrective CSV against current tier/key identities; explicit blank cells for rows that need removing, fresh preview/removal acknowledgment. Restore DB only for broader corruption with full reconciliation. | Exact before/after key/tier/decimal comparison and fresh customer-tier view. Omitted rows are unchanged, so a partial old export is not a full undo. Orders keep original snapshots; changing ProductPrice does not revise accepted requests. |
| F. Bad customer import | Stop invitations; inspect committed IDs against source. Use supported customer disable action for affected CUSTOMER accounts (both active flags plus version/token revocation); correct individual identity/tier fields through reviewed UI. | No bulk undo/delete/update importer exists. Create-only reimport cannot repair. Hard deletion needs approved precise DBA plan respecting tokens/orders/FKs; preserve orders and evidence. Restore only with post-backup reconciliation. |
| G. Accidental invitation campaign | Stop further batches/operator access. Record affected accounts/outcomes without raw URLs; revoke affected access/sessions/tokens through supported customer disable actions or reviewed admin incident process. Inspect provider events; coordinate approved corrective communication separately. | **Email cannot be recalled.** Some committed in-flight sends can finish after revocation; delivered content may persist. Disabling invalidates tokens/sessions but does not erase a password already set. Wrong-recipient setup may require verified identity plus controlled password/account recovery before re-enable. No automatic apology/resend. |
| H. DNS/domain problem | Keep candidate protected and pause link emails. Compare recorded old DNS/alias config; restore only approved previous web records/aliases if necessary, preserving mail records. Follow actual provider guidance for certificate/verification issue. | Verify authoritative + client DNS resolution, TTL propagation, certificate, apex/www redirects and canonical/auth origins. Propagation is not instant. Existing emailed links remain tied to their origin; plan fresh approved links only after canonical domain stabilizes. |

Recovery from cross-environment writes or mail is also a potential privacy incident;
the incident owner determines necessary notifications. This runbook authorizes none.

## Final go/no-go checklist

- [ ] Release commit includes PR #18 fixes and closed CODE-01; appropriate candidate
  checks pass; current advisory reachability reviewed on launch date.
- [ ] Domain/business facts/currency/recipients confirmed; no invented claims or values.
- [ ] Production and Preview DB/Sanity/secret/mail scopes independently verified;
  no operator/seed/test credential in app scope, no real customer data in Preview.
- [ ] Backup/restore rehearsal, owners, retention and acceptable recovery/data-loss
  windows recorded; permanent mapping and all private artifacts recoverable.
- [ ] All six SQL migrations and custom constraints verified; approved tiers and
  initial ADMIN provisioned without seed/fixtures; runtime least privilege/TLS verified.
- [ ] 302 intended production product keys and 17 categories reconciled with source;
  exclusions and W515B/W515BC decision preserved; no Unit Cost/private prices in Sanity.
- [ ] Independently approved prices cover every enabled product in every launched
  tier; 22 Tier 2/Tier 1 gaps resolved or exact narrower release explicitly approved.
- [ ] Availability equals signed product matrix; optional content omissions accepted;
  current post-publication baseline backed up.
- [ ] Customer import exact/create-only/passwordless, active flags and tiers reviewed;
  import sent no email; no fake/test customer; campaign list/timing separately approved.
- [ ] Real HTTPS domain, redirects, cookies, login/logout, current authorization,
  token setup/reset, cache/origin behavior and configured Studio tested.
- [ ] Contact and setup/reset inbox/Spam/authentication tested with approved internal
  recipients; Resend sender/DNS/quota verified; ORDER_TO_EMAIL confirmed and smoke tested.
- [ ] Case-based order smoke saved once; correct snapshot/reference and staff handoff;
  PENDING/FAILED recovery understood, no inventory/payment/final-order promise implied.
- [ ] Public retail indexable, correct homepage/contact canonical and OG, sitemap/
  robots correct; Preview protected/noindex, private/admin/Studio noindex and authenticated.
- [ ] Phone/tablet/desktop critical paths and real assets checked on deployed candidate.
- [ ] Monitoring staff present, rollback candidate/data recovery ready, go/no-go signed.

**Any unresolved required checkbox = NO-GO for the dependent release phase.**
Controlled infrastructure/bootstrap preparation may precede full client pricing
only with its own scoped approval and closed safety gates; it is not public-launch
approval. Next recommended action from 7A: close the small SEO patch and review/
rehearse the guarded tier/ADMIN bootstrap process while collecting missing client
inputs. Then request a separately scoped production infrastructure/configuration
verification task, followed by authorized bootstrap when its gates pass.
