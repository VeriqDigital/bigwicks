# Production Configuration

## Status

Milestone **7D complete as a configuration manifest and verification plan**,
2026-09-08. Readiness remains **A. CODE READY — BLOCKED ON CLIENT / PRODUCTION CONFIG**.
This does **not** certify configured infrastructure or authorize the first write.
Baseline: refreshed `main` / `origin/main`,
`7b4fa65cae71bd6d6c44fb678d5c6cf3b7e45c99` (merged PR #21 / 7C).

This is the authoritative environment/launch target sheet. The
[readiness inventory](PRODUCTION-READINESS.md#5-authoritative-environmentconfiguration-inventory)
defines variable consumers; the [launch runbook](LAUNCH-RUNBOOK.md) defines phase
order and authorization. Historical audit evidence is not current provider evidence.

No deployment, provider setting/DNS change, SQL query/mutation, migration,
bootstrap (including plan), Sanity document read/write, import or email was executed.
Local configuration was parsed in memory with allowlisted identity/presence output;
no secret value was printed, copied into documentation or written to a new file.

Status vocabulary:

- **VERIFIED** always names its evidence boundary: repository, local file, or live.
- **USER CONFIRMATION REQUIRED**: intended identity/owner/value is `[CONFIRM]`.
- **LIVE DASHBOARD CHECK REQUIRED**: provider evidence has not been obtained.
- **NOT CONFIGURED** describes an observed missing value only in the stated scope.
- **MUST BE ABSENT** is a required policy, not proof of live absence.
- **NOT PROVISIONED** may be recorded only when an owner/dashboard establishes
  nonexistence. Production DB/dataset existence is currently **unknown**, not absent.

## Access boundary

A = safely read and verified now; B = authenticated but no suitable safe read;
C = authenticated access not established/available here; D = operator dashboard
verification required. No provider qualifies for A or proven B in this session.
Local credential presence does not establish authentication or production intent.

| Provider | Classification | Evidence / restriction | Next safe check |
| --- | --- | --- | --- |
| Vercel | C; D required | No provider connector, browser session, PATH CLI or injected token. Local repo link only. | V1–V5 below; do not log in on the user's behalf. |
| Neon/PostgreSQL | C; D required | Local URI exists, but role permissions, branch and intent are unknown. No explicitly supplied read-only Production connection; no SQL executed. | D1–D4, R1 and B1 below. |
| Sanity | C; D required | Local write-token presence only; validity/scope not tested. No authenticated metadata connector/session. | S1–S3; do not use the write token merely to discover access. |
| Resend | C; D required | No injected/local mail key in inspected scopes and no provider connector/session. | M1–M4. |
| DNS/registrar | C; D required | Provider and final domain unknown; no provider connector/session. | N1–N3 after client domain approval. |

`cua.getState()` returned no browsers/apps. `where.exe` found no Vercel, Neon,
Sanity, psql or gh CLI on PATH (this does not assert no package exists elsewhere).
Presence-only checks found no credentials at the inspected conventional Vercel,
Sanity and Neon CLI configuration locations. No interactive login, installation,
account connection, env pull/export, broad account search or credential dump occurred.

## Environment matrix

`LOCAL-DB` below is an observed **local configuration**, not an approved environment:
host `ep-falling-morning-avhben8d-pooler.c-11.us-east-1.aws.neon.tech`, port `5432`,
database `neondb`, role `neondb_owner`. Its Neon project/branch are `[CONFIRM]`.
Do not assign it to Preview or Production from its name, region, or past data counts.

| Item | DEVELOPMENT | PREVIEW | PRODUCTION |
| --- | --- | --- | --- |
| Vercel project/environment | Local work; Vercel Development scope `[CONFIRM]`, LIVE DASHBOARD CHECK REQUIRED | Candidate `bigwicks` / Preview; LIVE DASHBOARD CHECK REQUIRED | Candidate `bigwicks` / Production; USER CONFIRMATION REQUIRED + LIVE DASHBOARD CHECK REQUIRED |
| Git branch/source | VERIFIED local baseline `main` / `7b4fa65`; working branches thereafter | Actual preview branches/PR triggers `[CONFIRM]`, LIVE DASHBOARD CHECK REQUIRED | Intended production branch `[CONFIRM]`; `main` is source baseline, not proof of Vercel setting |
| Public hostname | VERIFIED template `http://localhost:3000`; actual local origin NOT CONFIGURED in inspected env files | Exact deployment/custom origin `[CONFIRM]`, LIVE DASHBOARD CHECK REQUIRED | DOMAIN UNCONFIRMED; canonical HTTPS origin `[CONFIRM]` |
| DATABASE target identity | VERIFIED local `LOCAL-DB`; intended isolated development target USER CONFIRMATION REQUIRED | Provider/project/host/port `[CONFIRM]`, LIVE DASHBOARD CHECK REQUIRED | Provider/project/host/port `[CONFIRM]`, LIVE DASHBOARD CHECK REQUIRED |
| PostgreSQL branch/database | Branch `[CONFIRM]`; local database `neondb` | Branch/database `[CONFIRM]`; separate from Production | Branch/database `[CONFIRM]`; no provisioning claim |
| Runtime DB role | Local role string `neondb_owner`; actual grants unknown | Role `[CONFIRM]`, isolated least privilege | Role A `[CONFIRM]`, least privilege; never operator credential |
| Migration/bootstrap role | Dedicated disposable/local operator `[CONFIRM]` | Separate nonproduction operator `[CONFIRM]`; not Vercel app config | B/C operator identity `[CONFIRM]`; direct target, temporary access |
| AUTH_SECRET identity/separation | NOT CONFIGURED in inspected process/files; independent local secret required for auth/contact | Separate secret-manager record/version `[CONFIRM]`; LIVE DASHBOARD CHECK REQUIRED | Unique >=32-character secret; record/version `[CONFIRM]`; LIVE DASHBOARD CHECK REQUIRED |
| AUTH_URL | NOT CONFIGURED locally; template localhost origin only | Exact Preview HTTPS origin `[CONFIRM]`; never Production | Exact canonical HTTPS origin `[CONFIRM]` |
| NEXT_PUBLIC_SITE_URL | NOT CONFIGURED locally; template localhost origin only | Exact Preview origin `[CONFIRM]`, baked into its build | Same origin as AUTH_URL `[CONFIRM]`, baked into Production build |
| Sanity project ID | VERIFIED local `sim96pgy`; known nonproduction identity | Known nonproduction candidate `sim96pgy`; actual Preview binding LIVE DASHBOARD CHECK REQUIRED | `[CONFIRM]`, USER CONFIRMATION REQUIRED |
| Sanity dataset | VERIFIED local `development`; user-confirmed nonproduction catalog | Candidate `development`; actual Preview binding LIVE DASHBOARD CHECK REQUIRED | `[CONFIRM]`; never assume `production` or reuse `development` |
| Resend enabled/key | NOT CONFIGURED in inspected process/files; local internal tests only after approval | Key MUST BE ABSENT by default; LIVE DASHBOARD CHECK REQUIRED | Key presence/sending permission `[CONFIRM]`; no sends until mail gates close |
| Account sender | NOT CONFIGURED locally | Unset by default; internal smoke sender only after approval | ACCOUNT_FROM_EMAIL `[CONFIRM]`, client approval + M1/M2 |
| Contact sender | NOT CONFIGURED locally | Unset by default; internal smoke sender only after approval | CONTACT_FROM_EMAIL `[CONFIRM]`, client approval + M1/M2 |
| Contact recipient | NOT CONFIGURED locally | Unset by default; approved internal inbox only | CONTACT_TO_EMAIL `[CONFIRM]`, USER CONFIRMATION REQUIRED |
| Order recipient | NOT CONFIGURED locally | Unset by default; approved internal inbox only | ORDER_TO_EMAIL `[CONFIRM]`, USER CONFIRMATION REQUIRED |
| Catalog write-token presence | VERIFIED present in local `.env`; remove from ordinary app context via authorized operator cleanup. Vercel Development MUST BE ABSENT | MUST BE ABSENT; LIVE DASHBOARD CHECK REQUIRED | MUST BE ABSENT; LIVE DASHBOARD CHECK REQUIRED |
| ALLOW_PRODUCTION_CATALOG_IMPORT | VERIFIED not set in inspected files/process; MUST BE ABSENT from Vercel Development | MUST BE ABSENT; LIVE DASHBOARD CHECK REQUIRED | MUST BE ABSENT; only dedicated authorized import process may use `true` |
| Development seed variables | NOT CONFIGURED locally; only explicit disposable local seed process | ALLOW_DEVELOPMENT_SEED and all three SEED_*_PASSWORD variables MUST BE ABSENT | Same four variables MUST BE ABSENT |
| Real customer data allowed? | No; isolated fictional/internal data | No; check lineage/import history without listing customers | Only approved data in later phase 6; no import in 7D |
| Real customer email allowed? | No | No; no recipient sandbox exists | Only separately approved smoke/cohort in phases 8/10 |

Local `.env` also has `SANITY_CATALOG_NON_PRODUCTION_TARGET` present; its exact
identity was not emitted/approved by this audit. `.env.local` has none of the
inspected application values configured. This is not a full inventory of arbitrary
local keys. No `.env.production`, `.env.production.local` or `.env.preview` was found.
No values in these files certify Vercel scopes. The files were left unchanged.

## Vercel

VERIFIED **local link only**: ignored `.vercel/repo.json` associates directory `.`
with project `bigwicks`, ID `prj_3sWuFIHF1AIDFy3vA2dYB6O8Rwof`, team ID
`team_HXpeSweiKYUJwKQwtoO8pHkx`. Team display name/slug and intended Production
ownership remain `[CONFIRM]`. `.vercel/project.json` is absent. No tracked
`vercel.json`, `.github` deployment workflow or `.openai/hosting.json` was found.
Remote repository is `VeriqDigital/bigwicks`.

All checks below are **LIVE DASHBOARD CHECK REQUIRED**. Record safe IDs/settings,
UTC timestamp and verifier; do not reveal secret variable values or raw logs.

1. **V1 — Identity/source:** In Vercel, select the owner-approved team/project.
   Settings → General: compare project/team IDs above. Settings → Git and
   Environments: record connected repo, intended production branch, Preview branch
   rules, automatic deployment triggers, ignored-build behavior and domain auto
   assignment. Inspect existing deployment source SHA/environment. Do not push a
   test commit to discover behavior. An automatic Production deploy on merge means
   any future merge needs the corresponding deployment authorization.
2. **V2 — Scopes:** Settings → Environment Variables: inspect Development, Preview,
   Production separately, including shared/integration-supplied and branch-specific
   overrides. Compare every matrix row by safe value or secret-manager reference/
   presence only. Check old deployments separately; changing a variable does not
   prove their configuration changed. Do not use `env pull` or reveal/copy secrets.
3. **V3 — Build:** Settings → Build and Deployment: record root directory `.`,
   Next.js preset, install/build overrides and Node `24.x`. Repository build is
   `prisma generate && next build`; verify no dashboard install/build hook runs
   migrate, seed, bootstrap or import. Check the selected artifact's actual Node
   major and source SHA from existing metadata/sanitized build evidence.
4. **V4 — Domains/protection:** Settings → Domains and Deployment Protection:
   inventory Production, Preview/custom and direct deployment hosts, redirects,
   certificate status and protection coverage. Verify Preview protection and
   `X-Robots-Tag: noindex` on each relevant host with an unauthenticated header
   inspection. Do not bypass protection or exercise app actions. Public routes do
   not conditionally noindex on VERCEL_ENV; check the provider result, including
   custom Preview domains. Plan a protected Production candidate through phase 10.
5. **V5 — Runtime:** Inspect function settings/metadata for Node runtime, region,
   Fluid Compute/plan, effective per-route duration and timeout overrides. Record
   region `[CONFIRM]` and compare with confirmed DB region for latency/cold starts.
   Do not assume a provider default region/plan or that maxDuration is honored.

| Workload | VERIFIED repository requirement | Live acceptance |
| --- | --- | --- |
| Bulk invitations | `/admin/customers/invitations` requests 300 seconds; max 25, sequential 600 ms pacing; each mail call up to 10 seconds | Effective 300-second allowance and later timed internal smoke. 25 × 10 + 24 × 0.6 = 264.4 seconds excludes SQL/overhead; not a guaranteed batch duration. Start smaller; no automatic replay after interruption. |
| Order actions | `/portal` requests 30 seconds; catalog fetch, SQL transaction, notification and status update | Check effective route duration and later order smoke with margin; saved order can survive email failure. |
| Password reset | `/forgot-password` requests 30 seconds and uses Next `after()`; mail timeout 10 seconds | Confirm request-lifetime support and later internal smoke; not a durable queue. |
| Sanity fetches | Runtime fetch 10 seconds, no retries; importer 30 seconds in separate operator process | Confirm outbound connectivity/latency later; import is not a Vercel function. |
| Contact / individual account mail | Each provider call 10 seconds plus SQL/auth work; no dedicated 300-second export | Inspect actual hosting limits for these routes; verify later smoke within the effective duration. |

Node 24 is supported by Vercel; pinning `engines.node` is repository evidence, not
live deployment evidence. See [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
and [function duration](https://vercel.com/docs/functions/configuring-functions/duration).
Provider [environment scopes](https://vercel.com/docs/environment-variables) and
[response headers](https://vercel.com/docs/headers/response-headers) inform V2/V4;
they do not prove this project's configuration.

### Correct future Production build

After the applicable runbook gates and separate deployment approval, build the
reviewed source SHA **for Production with Production variables**, verify its
environment/source/build evidence and public identifiers, then perform the approved
traffic assignment. Use the configured Production branch workflow or an explicitly
Production-targeted candidate build. Do not alias/reuse an arbitrary Preview artifact
or a local test build. Vercel's current
[Preview promotion workflow](https://vercel.com/docs/deployments/promote-preview-to-production)
documents a new Production rebuild. Verify that the actual operation used produced
that new build; a promotion/alias name alone is insufficient. No promotion executed.

## PostgreSQL / Neon

Production provider/project, branch ID/name/lineage, database, PostgreSQL major,
runtime endpoint/role, operator endpoint/role, region and provisioning status are
all `[CONFIRM]`. Neon is indicated by **local** host metadata only. The local
`neondb_owner` role name does not establish its grants or suitability for runtime.

1. **D1 — Target:** Owner opens the intended Neon organization/project. Record
   project ID/name, region, branch ID/name/parent, database and PostgreSQL version.
   Compare Production and Preview side by side. A branch called `production` is
   not proof of business intent. If the approved target does not exist, record
   NOT PROVISIONED and defer creation to a separately authorized task.
2. **D2 — Connections:** In each branch's Connect panel choose the exact database
   and role; record host/port and pooling toggle only, never the URI/password.
   Runtime recommendation: provider-supported pooled endpoint. Operator requirement:
   provider-issued **direct** endpoint to the same approved Production branch/DB.
   Do not derive it by editing the locally observed hostname. `DIRECT_URL` is not
   read; `prisma.config.ts` uses operator-process DATABASE_URL and loads `.env`.
3. **D3 — Capacity/security:** Record compute size/autoscaling, connection limits,
   pooler mode/limits, TLS verification requirements and idle/cold-start behavior.
   App pool is max 5 per process, connect timeout 5 seconds; autoscaling multiplies
   pools. Reserve headroom for concurrent app instances and direct operators.
   Confirm SERIALIZABLE transactions and row locks with the provider-supported
   runtime configuration. Do not equate a pooler's client limit with backend capacity.
4. **D4 — Optional future identity read:** Only after a connection is explicitly
   approved as safe for read-only identity verification, use a credential-safe
   client to run `SELECT current_database();`, `SELECT current_user;`,
   `SELECT version();`. Record only identity/version and TLS verification outcome.
   These queries cannot prove branch intent or least privilege. Do not inspect
   app tables, migration history, counts, prices or customers in 7D. Even bootstrap
   plan reads tables and is outside this milestone's identity-only SQL boundary.

### 7C connection compatibility

VERIFIED local URI metadata: pooled endpoint, options `sslmode=require` and
`channel_binding=require`. It is **not** an approved Production/operator URI.
[plan.ts](../scripts/production/plan.ts) rejects multiple query options and
`channel_binding`; [bootstrap-core.ts](../scripts/production/bootstrap-core.ts)
uses explicit pg fields, fixed `public` schema, max 1 connection and
`ssl: { rejectUnauthorized: true }` for both accepted remote sslmode values.

| Connection feature | Requirement / bootstrap support |
| --- | --- |
| Scheme/identity | Explicit postgres/postgresql host, database, nonempty user/password; port defaults 5432. Database is one unescaped 1–63-character identifier of letters/digits/underscore/dot/hyphen, first character letter/digit/underscore. Percent-encode user/password as needed without exposing them. |
| TLS | One `sslmode=require` or `sslmode=verify-full` required remotely. Prefer explicit `verify-full`; bootstrap verifies certificate/hostname in either mode using Node trust. No no-verify, TLS disable, insecure proxy or localhost tunnel. |
| `channel_binding=require` | Unsupported by parser; not equivalent to an sslmode spelling. Bootstrap does not enable pg's `enableChannelBinding`. If mandatory for the approved target/security policy, STOP for separately reviewed compatibility work. |
| Provider routing `options=endpoint=...`, `host`, `port`, `user`, `password`, `dbname` query overrides | Unsupported; no SNI/endpoint hacks. Use provider-issued DNS hostname and direct endpoint. |
| `schema`, `search_path`, `connection_limit`, `pool_timeout`, `pgbouncer`, `connect_timeout`, `application_name` | Unsupported URI extras, whether optional for other drivers or required for another configuration. Bootstrap owns schema/pool/timeouts; do not copy a Prisma/provider URL wholesale. |
| `sslrootcert`, `sslcert`, `sslkey`, `sslnegotiation`, `uselibpqcompat`, multiple hosts/socket/encoded database path | Unsupported. If the target requires a custom trust/client certificate or another unsupported security option, STOP. No parser relaxation or certificate-check bypass. |

Future procedure, **no connection or write performed now**:

1. D1/D2 establish the direct operator target independently. Obtain its connection
   representation through the provider/secret manager in a dedicated process,
   not shell arguments/history, screenshots or Git.
2. Compare option **names** and the provider's security requirements with the table.
   [Neon's secure-connection guide](https://neon.com/docs/connect/connect-securely)
   documents `sslmode=verify-full` as a supported representation and channel binding
   as additional security. A bootstrap-compatible representation has the confirmed
   direct host/port/database and securely supplied user/password, with the **single
   query option `sslmode=verify-full`**. This is a proposed representation, not an
   approved replacement for the observed local URI.
3. The DB/security owner must confirm that certificate/hostname-verified TLS without
   channel binding meets this target's requirements. If channel binding is mandatory,
   the current tool cannot satisfy it; stop. Do not silently drop it until a connection
   works. Node trust must validate the server chain; never set
   `NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized=false`.
4. Separately authorized identity-only connectivity verification establishes that
   this representation connects to the recorded database/role with certificate
   verification. No bootstrap invocation as a connectivity test. Record option names,
   TLS outcome and verifier, not credentials.
5. Only after backup/grants/target gates, follow runbook phase 2 for migration and
   later bootstrap plan/apply with their own authorization. No env-file fallback.

Runtime and bootstrap are different connection paths. The installed pg 8.23.0
driver uses an explicit `enableChannelBinding` client option; the app and bootstrap
do not set it. A `channel_binding=require` URL parameter is **not evidence of
enforced channel binding in this app**. Installed pg-connection-string currently
maps ordinary `require` to certificate verification but marks that alias deprecated;
do not base the future contract on the alias or add libpq compatibility overrides.
See [node-postgres SSL](https://node-postgres.com/features/ssl) and the installed
driver source. No app/parser change is justified without the final security contract.

## Database roles

**R1 — LIVE DASHBOARD CHECK REQUIRED:** DBA verifies exact effective grants,
ownership, inherited roles and PUBLIC privileges against these capabilities;
records role names/credential-manager references only. No grant/role changes now.
Runtime must not own schema/tables or inherit the operator/administrative role;
check PUBLIC CREATE on database/schema as well as explicit grants. No SUPERUSER,
CREATEDB, CREATEROLE, replication, BYPASSRLS or unnecessary administration.

### A — Runtime

CONNECT on the intended database, USAGE on `public`; application type usage for
Role, AccountTokenPurpose, OrderStatus and OrderNotificationStatus. Required
table-level privileges for current implementation (column narrowing is optional
future DBA work, not assumed here):

| public table | Required runtime privileges | Reason |
| --- | --- | --- |
| User | SELECT, INSERT, UPDATE | Auth, customer creation/edit, passwords, versions and row locks |
| Customer | SELECT, INSERT, UPDATE | Customer management, status/tier edits and order row locks |
| PricingTier | SELECT | Assign/read tiers; no runtime tier create/edit feature |
| ProductPrice | SELECT, INSERT, UPDATE, DELETE | Admin price import/upsert and explicit removals |
| AccountToken | SELECT, INSERT, UPDATE | Setup/reset issue, acceptance, consumption, invalidation |
| Order | SELECT, INSERT, UPDATE | Save snapshot and notification status; no DELETE |
| OrderItem | SELECT, INSERT | Immutable item snapshots; no UPDATE/DELETE |
| LoginRateLimit | SELECT, INSERT, UPDATE, DELETE | Atomic shared limiter upserts and expiry pruning |
| _prisma_migrations | None | Not read by normal application |

No migration DDL, schema CREATE, table TRUNCATE or operator grants. Current IDs
are client-generated text/UUID, not SERIAL/identity sequences; no sequence grants
are needed for the six current migrations. Reassess if schema changes. Required
row locks are covered by SELECT plus UPDATE on User/Customer. Evidence: `lib/auth`,
`lib/admin`, `lib/pricing/service.ts`, `lib/orders/service.ts` and customer actions.

### B — Migration operator

CONNECT; appropriate database CREATE if `public` must be created, otherwise schema
USAGE/CREATE; ownership/effective owner capability over the app objects that are
altered. The six [migration files](../prisma/migrations) create enums/tables/indexes,
foreign keys/checks, alter User/PricingTier/OrderItem and SELECT/UPDATE PricingTier
for rank backfill. Prisma must create/manage its `_prisma_migrations` table and
use its migration lock. An owner of this dedicated app schema can perform these
operations without cluster superuser/role administration. `migrate deploy` needs
no development shadow database. Verify the exact installed Prisma/provider role
combination in an isolated rehearsal; no production migration during 7D.

### C — Bootstrap operator

CONNECT, USAGE on public/types, SELECT on all nine tables listed above, INSERT on
PricingTier and User. Apply additionally locks **all nine**, including
`_prisma_migrations`, in SHARE ROW EXCLUSIVE mode. SELECT/INSERT alone does not
authorize that lock: table-level UPDATE on each of the nine is a sufficient
cross-version option (or ownership). PostgreSQL 18 also permits MAINTAIN for
any lock mode; confirm the actual major before considering that narrower DML
alternative. DELETE/TRUNCATE also permit it but are not recommended grants.
See [PostgreSQL LOCK privileges](https://www.postgresql.org/docs/18/sql-lock.html).
Session/transaction settings for read-only transactions, public search path,
statement/lock timeouts must be allowed. Bootstrap performs no DDL or sequence use.

**Recommendation:** B and C may share one controlled operator identity for the
initial migration/bootstrap window on this dedicated schema. That avoids granting
lock-related write rights to runtime or inventing a permanent second privileged
credential. Record scope/owner and disable temporary login/access after authorized
work, preserving migration object ownership through a reviewed DBA policy. Future
migrations reauthorize operator access. If separate B/C identities are required,
verify C's full lock grants explicitly. Vercel uses **A only**, including after
bootstrap; operator credentials never enter any application environment.

## Backup/restore

**B1 — OPEN / LIVE DASHBOARD CHECK REQUIRED.** No Production restore point,
retention, recovery owner or restore rehearsal has been verified. Before any future
Production migration/import:

1. In the exact provider project/branch, inspect Settings → Restore window and
   available backup/restore history. Record plan, configured retention, oldest
   recoverable UTC point, backup/snapshot availability, expiry and operator access.
   A feature advertised in public docs is not this project's backup evidence.
2. Record recovery owner `[CONFIRM]`, deputy/access custodian `[CONFIRM]`, acceptable
   data-loss window (RPO) `[CONFIRM]`, recovery time target (RTO) `[CONFIRM]`, and
   preservation location/access for independent backups and launch artifacts.
3. Inspect available restore target options without clicking Restore/Create/Save.
   Plan an **isolated replacement branch**, never a Preview branch connected to
   Preview. A recovery branch containing real data retains Production access rules
   and must have no mail-enabled app attached. Neon supports historical restores;
   exact retention/options are plan/project-dependent. See
   [project restore settings](https://neon.com/docs/manage/projects) and
   [branch restore options](https://neon.com/docs/manage/branches).
4. Schedule a separately authorized isolated restore rehearsal. For Neon, the
   operator selects Branches → New branch, the confirmed source branch and a
   historical UTC point inside its restore window, then an explicitly isolated
   recovery name/compute; review the target before authorized creation. Verify
   schema/grants and approved integrity evidence, measure elapsed recovery time,
   prove operator access and application compatibility without mail, and record
   result/owner. If the current console offers a different restore flow, obtain the
   provider's equivalent isolated-target procedure; never substitute an in-place
   Production restore. This creates data/infrastructure and is **not a 7D action**.
5. Before each future migration record a fresh usable pre-write recovery point
   and its retention through the release window. No rehearsal/evidence = gate open.

After launch, recovery first stops invitations/new writes, preserves current SQL
and provider evidence, restores into the isolated replacement and reconciles all
post-backup orders/customer changes with staff. A restore can resurrect revoked
sessions/tokens or erase orders already notified by email; revoke/reconcile under
an approved recovery plan before reopening. Email is not recalled. Switching the
runtime target, repairing data and sending replacement links require authorization.
Measure recovery through verified reopening, not just the provider restore button.
Follow [runbook recovery](LAUNCH-RUNBOOK.md#rollback-and-recovery).

## Auth

**A1 — USER CONFIRMATION REQUIRED + LIVE DASHBOARD CHECK REQUIRED.** Production
AUTH_SECRET must be independently generated (at least 32 random bytes recommended;
at least 32 characters required by application paths), consistent across Production
instances and different from Development/Preview. Owner verifies presence, adequate
length/generation policy and distinct secret-manager records without revealing values
or hashes. Record version references and verifier. No automatic rotation in 7D.

Production AUTH_URL and NEXT_PUBLIC_SITE_URL must both equal `[CONFIRM]`, the final
canonical HTTPS origin, with no credentials, path beyond `/`, query or fragment.
No localhost or Preview host. Rebuild for NEXT_PUBLIC changes. The local HTTP
exception in account email validation is not environment-aware; enforce the
Production contract operationally, not by relying on that exception.

`auth.ts` trusts host when NODE_ENV is not production, VERCEL is `1`, or
AUTH_TRUST_HOST is exactly `true`. Preview also has NODE_ENV=production. Vercel
detection already suffices; leave AUTH_TRUST_HOST unset/false unless independently
justified. False does not override Vercel trust. Verify trusted ingress header
handling; do not add legacy NEXTAUTH_URL/NEXTAUTH_SECRET or secret-array fallbacks.

VERIFIED installed Auth.js defaults: session cookies are HttpOnly, SameSite=Lax;
Secure follows the effective URL's HTTPS protocol (`@auth/core/lib/init.js` and
`lib/utils/cookie.js`). There is no project cookie override. Real-domain cookie,
redirect, setup/reset origin and logout verification remains runbook phase 8.
Do not call reset/login flows merely to inspect configuration; they can write SQL/mail.

## Sanity

Known nonproduction project/dataset: **`sim96pgy / development`** (user-confirmed
history and VERIFIED local env identifiers, not a fresh provider read).
**Preview dataset:** candidate `sim96pgy / development`; actual Vercel Preview
binding LIVE DASHBOARD CHECK REQUIRED. **Production project/dataset:** `[CONFIRM] /
[CONFIRM]`, USER CONFIRMATION REQUIRED. Do not infer its name or existence.

1. **S1 — Identity/visibility:** In Sanity Manage choose the owner-confirmed project;
   record project ID/name and Datasets → exact intended Production dataset and
   visibility. If absent, record NOT PROVISIONED; do not create it. Current app
   requires a **public content-only** dataset: tokenless published reads, API version
   `2026-09-06`, no CDN/Next cache, no retries. HTTP 200/empty content alone is not
   proof of correct visibility/target; check dashboard metadata. See
   [dataset visibility](https://www.sanity.io/docs/content-lake/datasets).
2. **S2 — Access/CORS:** Inspect Members/roles, dataset restrictions and Settings →
   API → CORS Origins. Record intended Studio editors/roles in restricted custody
   and approved origins `[CONFIRM]`. `/studio` requires app ADMIN **and** Sanity
   access. Browser Studio needs credentialed CORS on its exact approved origin;
   server-side reads do not. Avoid platform-wide wildcard credential origins.
   If sharing a project across datasets, prove roles cannot unexpectedly edit
   Production from Preview/editor sessions. Dataset separation alone does not
   restrict a broadly privileged member. See [CORS guidance](https://www.sanity.io/docs/content-lake/cors).
3. **S3 — Tokens/content boundary:** Inspect token metadata/scopes without revealing
   tokens. Confirm operator-only credential strategy and app-scope absence. Plan
   separately authorized content validation before public use/import; no documents
   queried here. All published content in this dataset must be safe to read publicly,
   including unavailable products. Prices/costs/customers/orders never belong here.

## Resend

Account/team, sending domain/region, verification, all sender/recipient addresses,
quotas and tracking settings are `[CONFIRM]`. The public contact email in CONTENT
is marked for confirmation and is **not** approval for contact/order routing or a
Resend From identity. Known prior smoke: user reports a setup email reached Gmail
but landed in **Spam**; this is not a passing deliverability gate.

1. **M1 — Account/domain:** Owner selects intended Resend team, records account/team
   identity and domain, sending permission and key presence/scope (no value).
   Domains → selected domain: inspect verification and required SPF/DKIM records.
   Compare with DNS provider records; inspect DMARC/alignment and existing mail
   configuration. Do not click Verify/update DNS or send a test. See
   [verified sending domains](https://resend.com/docs/dashboard/domains/introduction).
2. **M2 — Addresses:** Obtain written approval for ACCOUNT_FROM_EMAIL,
   CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL and ORDER_TO_EMAIL; compare each Vercel
   Production variable. Setup/reset recipients come from SQL User.email; order
   uses ACCOUNT_FROM_EMAIL and ORDER_TO_EMAIL, no contact-recipient fallback.
3. **M3 — Capacity/operations:** Settings → Usage: record actual team rate limit,
   daily/monthly quotas, usage and reserved headroom for invitation/reset/contact/
   order traffic. Locate bounce/complaint/suppression and 429 visibility; record
   staff owner and monitoring access without copying recipients/message bodies.
   No suppression removals/resends. The app's 600 ms pacing is not a provider quota
   guarantee. See [usage limits](https://resend.com/docs/api-reference/rate-limit).
4. **M4 — Tracking/delivery:** Domain → Configuration: verify open/click tracking
   disabled for account links; document actual state, not default. Current code
   sends plain text, no per-message tracking override. Provider HTML link tracking
   is not a reason to waive the token privacy policy; do not log/share token URLs.
   Later, separately approved internal smoke must check actual receipt, Inbox/Spam,
   SPF/DKIM/DMARC results, original link host/no rewriting and one-use setup/reset
   behavior. Provider acceptance is insufficient. See
   [tracking settings](https://resend.com/docs/dashboard/domains/tracking).

Preview RESEND_API_KEY **MUST BE ABSENT by default**. CONTACT_TO_EMAIL/ORDER_TO_EMAIL
cannot sandbox account emails. Any exceptional internal smoke requires explicit
approval, isolated internal SQL identities, verified routes and subsequent key
removal from Preview; no real customer email there.

## Domain/DNS

**DOMAIN UNCONFIRMED** — [SEO](SEO.md) and [CONTENT](CONTENT.md) leave final domain
open. Registrar/DNS provider, owner, apex/www choice and canonical origin are
`[CONFIRM]`; do not infer a domain from business/email/social/repository names.

1. **N1 — Approval/backup:** Client confirms exact domain, ownership/access custodian
   and canonical apex or www. Operator records registrar/authoritative DNS provider,
   current web target and certificate/proxy arrangement. Preserve current zone
   records/TTLs (A/AAAA/CNAME/MX/TXT/CAA/NS) in approved custody before future changes.
   Record existing email providers and SPF/DKIM/DMARC records to preserve.
2. **N2 — Attachment plan:** In the intended Vercel project's Domains view inspect
   existing attachment/ownership/certificate state. Record required records for the
   approved domain and apex/www redirects without adding/attaching/saving. Check
   proposed web changes against MX/TXT and Resend DNS; do not replace existing SPF
   or mail-routing records wholesale. Schedule any changes separately.
3. **N3 — Later domain smoke:** Following authorized attachment/DNS work, verify
   authoritative and recursive resolution, certificate issuance/hostname validity,
   HTTP → HTTPS, noncanonical apex/www → canonical without loops, and protected
   candidate access policy. Match AUTH_URL/site build output, canonical/OG/sitemap/
   robots and Studio CORS. Verify existing inbound mail/DNS compatibility. No final
   origin means domain-dependent phases and token emails stay blocked.

## Preview isolation

Every live checkbox is currently **LIVE DASHBOARD CHECK REQUIRED**. Keep local
observations/user history distinct from provider evidence; do not check boxes from
variable existence alone. V2/D1/S1/M1 supply the evidence without reading app tables.

- [ ] Preview DB project/branch/database/endpoint/role differs from Production;
  inspect integration branch creation/reset rules and lineage, not just host spelling.
- [ ] No Production clone with customer data backs Preview; data owner supplies
  lineage/import attestation. Uncertain data contents require separate inspection
  authorization, never `SELECT *` during this milestone.
- [ ] Preview Sanity build target differs from Production; scoped editor/token
  permissions prevent unexpected Production writes. Public Sanity reads remain
  publicly possible by design, but Preview app must not target Production.
- [ ] Preview RESEND_API_KEY absent in all default/shared/branch overrides and
  relevant existing deployments. Internal test data only; never real customer mail.
- [ ] Preview AUTH_URL and NEXT_PUBLIC_SITE_URL identify Preview, not Production;
  check the artifact's build values and generated public metadata.
- [ ] Preview AUTH_SECRET is independent; no operator DB credential, Sanity write
  token, import opt-in, seed variables, legacy auth override or test preload in app config.
- [ ] Preview hostnames, custom domains, protection/noindex and permitted visitors
  verified. A noindex header alone is not access control.

## Operator-only credentials

**O1 — MUST BE ABSENT in all Vercel application scopes**, including Development:
SANITY_API_WRITE_TOKEN, SANITY_CATALOG_NON_PRODUCTION_TARGET and
ALLOW_PRODUCTION_CATALOG_IMPORT. V2 verifies actual absence (not empty/false entries).
All seed credentials/ALLOW_DEVELOPMENT_SEED and test-only settings/preloads must
also be absent from Preview/Production; no privileged DB operator credential.

The local `.env` write token is a concrete cleanup item, not evidence of Vercel
exposure. Future authorized cleanup moves custody to the approved secret manager
and removes it from ordinary app env files/processes. Revoke/rotate only if required
by exposure review or the chosen temporary-token lifecycle. No token was changed here.

Future catalog credential procedure (separate import authorization required):

1. Use a dedicated clean operator checkout with no `.env`/`.env.local` fallback:
   unlike bootstrap, onboarding CLI explicitly loads both. Confirm no inherited
   opt-in/token/production-as-nonproduction designation and no debug transcript.
2. Confirm exact project/dataset, approved permanent mapping and backup gate.
   Inject a credential with **full raw read including drafts/releases** for planning
   into this process only, under the existing SANITY_API_WRITE_TOKEN name. No app
   token and no NEXT_PUBLIC token. Set no production apply flag for planning.
3. Review dry-run target/state/hash; only after approval inject minimum scoped
   create/patch rights needed for catalog/category mutations and set
   ALLOW_PRODUCTION_CATALOG_IMPORT=`true` in that process, with explicit
   `--allow-production`, `--confirm project/dataset` and `--apply REVIEWED_HASH`.
   Never label Production as SANITY_CATALOG_NON_PRODUCTION_TARGET.
4. Follow [onboarding instructions](ONBOARDING.md) and runbook phase 3. Afterwards
   disarm/remove the opt-in and token, terminate the process, and have the provider
   owner revoke temporary write access per approved lifecycle. Record revocation/
   absence evidence. Lost result requires inspection/fresh plan, not blind retry.

## Build-time vs runtime values

| Values | Contract |
| --- | --- |
| NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET | Build-time public values; changing runtime settings cannot repair an already built artifact. Rebuild in the correct target environment and verify metadata/Studio target. |
| DATABASE_URL, AUTH_SECRET, AUTH_URL, AUTH_TRUST_HOST, mail key/from/to | Server configuration; match environment at deployment/runtime. Vercel env changes require a new applicable deployment; do not assume old instances/artifacts update. Auth configuration may be initialized once per instance. |
| SANITY_API_WRITE_TOKEN and import/seed controls | Operator processes only; no app build/runtime need. |
| NODE_ENV, VERCEL, VERCEL_ENV | Platform/tool-owned; NODE_ENV=production applies to Preview too, and VERCEL_ENV is not an application isolation guard. |

Evidence: installed Next.js 16.3.4 environment-variable and maxDuration guides,
`sanity/environment.ts`, `config/seo.ts`, `auth.ts`, `lib/db.ts` and mail modules.
No framework/app/build configuration was modified.

## Verified live items

**None of the five production providers were live-verified.** The GitHub Git remote
was read to refresh main; public provider documentation was researched. Neither
operation verifies Vercel, Neon, Sanity, Resend or DNS account settings.

VERIFIED local/source evidence: PR #21 baseline, candidate Vercel link IDs, sanitized
local DB identity/options and Sanity target/token presence, Node 24 contract,
bootstrap parser/TLS/locks, runtime DB grants required by code, mail boundaries,
auth cookie defaults and build-time public-variable behavior. Sanity/pricing counts
and Gmail Spam result remain user-reported history, not newly queried facts.

## Unverified live items

This ledger is the sign-off index. Each referenced procedure above supplies the
manual action and expected evidence. All human verifiers below are responsibilities
with an actual name **`[CONFIRM]`**, not assigned individuals. Record safe evidence,
UTC verification time and named verifier before changing status to VERIFIED (live).

| Item / check | Required value/identity | Source of truth | Current evidence | Verifier | Status | Required before runbook phase |
| --- | --- | --- | --- | --- | --- | --- |
| V1 target/source | Exact team/project/repo/branch/triggers `[CONFIRM]` | Owner + Vercel Settings/Git/Environments | Local link and Git baseline only | Hosting owner `[CONFIRM]` | USER CONFIRMATION REQUIRED; LIVE DASHBOARD CHECK REQUIRED | 1 config, any merge/deploy |
| V2 scope matrix | Every Development/Preview/Production value/presence matches this sheet | Vercel scopes + secret manager | No live evidence | Hosting owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 1 exit / any write |
| V3 build | Node 24, reviewed SHA, root/build overrides, Production public values | Selected deployment/build metadata | Repository contract only | Release operator `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 4 deployment |
| V4 hosts/protection | Exact hosts/cert/protection/noindex `[CONFIRM]` | Vercel + read-only header evidence | No live evidence | Hosting owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | Candidate exposure / 4, 7, 10 |
| V5 duration/region | Effective runtime limits/region compatible with workload | Vercel function metadata + later smoke | Source exports/timeouts only | Release operator `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 8 smoke / 10 invites |
| D1 SQL targets | Exact Production and Preview project/branch/database/lineage `[CONFIRM]` | DB owner + Neon metadata | Local URI only; provision state unknown | DB owner `[CONFIRM]` | USER CONFIRMATION REQUIRED; LIVE DASHBOARD CHECK REQUIRED | Any production write / 2 migration |
| D2–D4 connection | Direct operator + pooled runtime targets, TLS/security/capacity `[CONFIRM]` | Provider Connect/settings + approved identity check | Local options incompatible with bootstrap | DB owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 2 migration/bootstrap |
| R1 privileges | A runtime; B/C controlled operator identities `[CONFIRM]` | DBA effective grant/ownership review | Code-derived requirements only | DBA `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 2 migration/bootstrap; 4 runtime |
| B1 restore | Point/retention/options/RPO/RTO/rehearsal/owner `[CONFIRM]` | Provider history + rehearsal record | No recovery evidence | Recovery owner `[CONFIRM]` | USER CONFIRMATION REQUIRED; LIVE DASHBOARD CHECK REQUIRED | Any production migration/import |
| A1 secret/origin | Independent strong Production secret; matching canonical origins | Secret custodian + Vercel + client origin approval | Local auth NOT CONFIGURED; code reviewed | Auth/hosting owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED; USER CONFIRMATION REQUIRED | 4 runtime; 8 links |
| S1 target | Exact Production project/dataset/visibility `[CONFIRM]` | Sanity owner + Manage metadata | Nonproduction pair only | Sanity owner `[CONFIRM]` | USER CONFIRMATION REQUIRED; LIVE DASHBOARD CHECK REQUIRED | Any production write / 3 catalog |
| S2/S3 access | Dataset/member/token scope and exact CORS `[CONFIRM]` | Sanity Manage API/Members | No live evidence | Sanity owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 3 import / 8 Studio |
| M1 sender domain | Team/domain/SPF/DKIM/DMARC/key scope `[CONFIRM]` | Resend + authoritative DNS | No live evidence | Email/DNS owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 8 any mail |
| M2 routing | Four approved From/To identities `[CONFIRM]` | Written client approval + Vercel | No approved addresses | Client approver `[CONFIRM]` | USER CONFIRMATION REQUIRED; LIVE DASHBOARD CHECK REQUIRED | 8 contact/account/order smoke |
| M3/M4 delivery | Quota headroom, monitoring owner, tracking off, successful internal smoke | Resend settings/events + approved recipient evidence | Prior Gmail setup landed in Spam | Email owner `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | 8 smoke / 10 invitations |
| N1–N3 domain | Domain ownership, apex/www, DNS backup, attachment/cert/redirects `[CONFIRM]` | Client + registrar/DNS + Vercel | DOMAIN UNCONFIRMED | Domain owner `[CONFIRM]` | USER CONFIRMATION REQUIRED; LIVE DASHBOARD CHECK REQUIRED | Domain-dependent phases 4/7/8/10 |
| Preview isolation | All seven checklist items closed, no real data/mail | Vercel/Neon/Sanity + data custodian | Policy only; no live proof | Release/data owners `[CONFIRM]` | LIVE DASHBOARD CHECK REQUIRED | Any production write / Preview exposure |
| O1 credentials | Operator/seed/test controls absent from app scopes; local token cleanup | Vercel scopes + credential custodian | Local .env write token present | Operator/hosting owner `[CONFIRM]` | MUST BE ABSENT; LIVE DASHBOARD CHECK REQUIRED | Any production write / 4 app |

## Hard STOP conditions

Production writes remain blocked when any applicable condition holds:

- SQL identity/lineage is uncertain, Preview/Production targets may overlap, or
  runtime and migration/bootstrap role/credential responsibilities are confused.
- No usable backup/recovery evidence or isolated restore rehearsal exists.
- Production Sanity target is uncertain, or Preview can unexpectedly access/write
  Production data through app configuration or excessive credentials.
- Production AUTH_SECRET is absent/weak/shared with Preview or inconsistent across
  instances; cookie/origin configuration is unsafe.
- AUTH_URL/site URL is not the final matching canonical HTTPS origin when links/
  domain-dependent phases become relevant, or the artifact has Preview public values.
- Sending domain/account sender is unverified before mail, ORDER_TO_EMAIL is
  unconfirmed before order smoke, deliverability smoke fails, or Preview can mail
  real customers.
- Operator import secrets/flags are stored in Vercel app configuration, development
  seed/test settings reach Production, or unsupported DB security options are bypassed.
- Final domain is unresolved for a dependent phase, any required target placeholder
  remains, a responsible verifier is missing, or live evidence for that step is absent.

Stop dependent work and record the failed gate; do not fix provider settings or
perform a write automatically. Closing 7D paperwork does not close CONFIG-01/02
or OPS-02. No exception is inferred from code readiness or successful local tests.

## Sign-off checklist

- [x] 7D repository manifest, environment matrix, access boundary and actionable ledger created.
- [x] Repository/local evidence separated from user history and unknown live settings.
- [x] No secret values in this manifest; no live mutation, SQL/data inspection, mail or deploy.
- [ ] Client/owners confirm intended Production targets, domain, recipients and named verifiers.
- [ ] V1–V5, D1–D4 as applicable, R1, B1, A1, S1–S3, M1–M4, N1–N3 have phase-appropriate evidence.
- [ ] Preview isolation and operator-only credential absence verified across all scopes.
- [ ] Restore rehearsal/retention/owners and runtime/operator separation signed off before writes.
- [ ] Release owner authorizes the **specific next operation** only after its gates close.

**Exact next action:** the operator and client complete a read-only dashboard target
review: confirm the candidate Vercel project/team and intended branch, identify
distinct Production/Preview DB and Sanity targets (or record NOT PROVISIONED), and
obtain the canonical domain and approved mail identities. Fill the ledger with safe
IDs/settings, UTC evidence and actual verifiers. Then scope any needed provisioning/
configuration separately; do not run migration/bootstrap/import/deploy yet.

Verification performed for this document is recorded in the
[7D check record](PRODUCTION-READINESS.md#7d-configuration-manifest-and-checks-actually-run).
