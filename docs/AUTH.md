# Authentication and customer management

This foundation is shared by both quoted ordering options. Milestone 1 provides
login/logout, authorization, initial models and development fixtures. Milestone 2A
adds admin customer management. Milestone 2B adds customer invitations, password
setup and password reset. Milestone 3A adds a server-only catalog/private-pricing
foundation; Milestone 3B adds protected customer catalog browsing. Milestone 3C
adds ADMIN-only pricing operations. Milestone 4A adds managed website order requests.

## Architecture

- PostgreSQL with Prisma 7.10.0 and the Node PostgreSQL driver adapter. The generated
  client is ignored and recreated by `db:generate`, `typecheck` and `build`.
- `User` is authentication identity: normalized unique email, nullable Argon2id
  password hash, ADMIN/CUSTOMER role, active flag and session revocation version.
  A null hash means password setup has not been completed and login is rejected.
- `Customer` is separate wholesale business data, with a unique user association,
  company name, optional customer number, active flag and required pricing tier.
  One login per customer is the initial choice; multi-user businesses can be
  introduced deliberately later. No unconfirmed business fields are required.
- `PricingTier` contains a unique name and ID, with Tier 1 and Tier 2 development
  records. `ProductPrice` now holds private decimal prices per catalogKey/tier;
  Sanity holds non-secret content only. No discount formula is implemented.
- Both identity and customer default inactive. A CUSTOMER must have an active
  associated Customer; an ADMIN must have no Customer association. Inconsistent
  records fail closed. Provisioning must write related records transactionally.
- Auth.js `next-auth@5.0.0-beta.32` Credentials provider uses encrypted JWT sessions
  with an eight-hour lifetime. No Prisma Auth.js adapter is needed: credential
  persistence is handled explicitly, and OAuth Account/VerificationToken/database
  Session tables are intentionally absent.
- Tokens contain only user ID, session version and Auth.js lifecycle claims.
  Session responses contain only ID, version and expiry. No roles, customer IDs,
  tiers, password hashes or business data are serialized into the session.
- Session reads and the server-only authorization helpers query PostgreSQL for
  current status, role and association. No cross-request authorization cache is
  used. Disabling either record rejects subsequent protected requests and logins,
  including an already-issued session. Database failures deny access.
- `requireUser()`, `requireAdmin()` and `requireCustomer()` live in
  `lib/auth/authorization.ts`. Missing/inactive identity redirects to `/login`;
  a wrong role receives a 404. Customer queries must use the returned
  `customer.id` and current `pricingTierId`, never browser-supplied values.
- Every future protected page, route handler, server action and data operation
  must call the appropriate helper independently. Layouts and hidden links are
  not security boundaries. No proxy-based authorization is required here.

Milestone 3A's `getAvailableCatalogForCustomer()` takes no browser inputs and calls
`requireCustomer()` independently on every read. Current PostgreSQL tier assignment
selects the only prices returned; no customer-specific catalog caching is used.
The service is not exposed as a public API; `/portal` calls it on the server and
passes only its authorized DTO to the browsing UI. Account context is separately
resolved by the existing helper and limited to company name/login email.
`/studio` independently requires ADMIN; editing additionally requires Sanity's own
project permissions. No shared Sanity write token is added. See `docs/CATALOG.md`
for schema, identity, pricing, freshness and consistency-audit rules.

## Authentication behavior

`/login` accepts existing provisioned credentials only. `/account` resolves the
current role and redirects to `/admin` or `/portal`. Those routes independently
enforce authorization. Internal ADMIN navigation links Customers, Pricing, Catalog
Studio, Public website and POST Sign out; `/portal` provides
customer catalog browsing. There is no public registration or production bootstrap endpoint.
Customer creation is available exclusively through admin-authorized actions.

`/admin/pricing`, its CSV export, both Server Actions and all pricing service
operations independently call `requireAdmin()`. Anonymous/inactive/revoked sessions
redirect to login; CUSTOMER receives 404. The admin layout also authorizes before
rendering navigation but is not the endpoint security boundary. Confirmation
rechecks the active ADMIN/session version within its SQL transaction and locks
the user row against concurrent access changes. No browser-supplied role, tier ID
or calculated price change is trusted. The sealed preview binds to the admin and
session revocation version, not an authoritative auth-token role/tier. Existing
`AUTH_SECRET` protects the ten-minute preview; rotation invalidates pending previews.
See `docs/CATALOG.md` for import integrity and transactional limits.

Milestone 4A order review/submission actions and services independently require
CUSTOMER. Submission locks and rechecks current User/Customer state and resolves
current tier/prices in its transaction; browser identity/tier/money never selects
the order owner or amounts. `/portal/confirmation/[reference]` checks current
customer ownership server-side and excludes staff notification/tier/internal data.
`/admin/orders` and its detail pages/services independently require ADMIN. Disabled
or revoked sessions cannot submit or read confirmations. Order review tokens bind
the current session version and use a separate cryptographic domain with existing
AUTH_SECRET. No authentication token role/tier or login behavior changes.
See `docs/ORDERING.md` for idempotency, freshness, limits and notification rules.

Passwords are 15–128 characters when provisioned. Login accepts existing passwords
up to 128 characters without trimming them. Argon2id uses 19 MiB memory, two
iterations and one lane, with a random salt per hash. Unknown accounts still run
password verification against a dummy hash. Failed credentials, disabled accounts
and throttled attempts use the same message. Logs exclude provider error details,
passwords, user records and database connection strings.

Login and logout use POST server actions. Auth.js handles cookies and session
cryptography; its direct credential callback retains CSRF protection. Next.js
retains server-action origin protection. Browser callback destinations are ignored
in favor of the local `/account` dispatcher; after logout it redirects to `/login`.
Cookies remain HttpOnly and SameSite=Lax; Auth.js uses Secure cookies with HTTPS.
Serve production exclusively over HTTPS, with a canonical HTTPS `AUTH_URL`.

Logout clears this browser's session cookie. To revoke all sessions for a user,
increment `User.sessionVersion`. Admin email and access changes now increment that
version in the same transaction as the change, as do password reset/setup. Future
role management must do the same. Current status and
role checks already take effect immediately; incrementing prevents old cookies
becoming usable again after re-enabling an account. Already delivered browser
content cannot be recalled, but subsequent protected server reads are denied.

## Login rate limiting

`LoginRateLimit` is shared across instances and survives restarts. Atomic
PostgreSQL upserts enforce five attempts per normalized email per 15 minutes and
a global cap of 100 attempts per minute before password hashing. Successful
attempts also count; neither success nor continued rejection extends/resets the
window. Expired records are pruned during allowed global attempts. Keys are
HMAC-SHA256 digests using `AUTH_SECRET`, not stored email addresses.

No browser IP/forwarding header is trusted. The global cap bounds random-account
spraying and counter growth. Its tradeoff is that deliberate traffic can temporarily
deny legitimate logins; a targeted attacker can also exhaust an account's allowance.
Review limits against actual usage and add ingress/WAF request limiting for
production denial-of-service protection. Limiter storage failures deny login.

## Local setup

Use Node 24 LTS, npm, and a local PostgreSQL database. This change was
verified with Node 24.20.0. On PowerShell with script execution disabled, use
`npm.cmd` and `npx.cmd` in place of `npm` and `npx`.

1. Run `npm ci` and copy `.env.example` to `.env` (do not overwrite existing local
   configuration). Prisma CLI/seed load `.env`; Next.js also supports `.env.local`.
2. Set `DATABASE_URL` to your development PostgreSQL database, `AUTH_URL` to
   `http://localhost:3000`, and generate a random `AUTH_SECRET`:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
   All backend and seed variables are server-only; never use a `NEXT_PUBLIC_` prefix.
3. Run `npm run db:generate`, then `npm run db:deploy` to apply the checked-in initial
   migrations. Use `npm run db:migrate -- --name descriptive_name` for future changes
   in a disposable development database, not production.
4. Set `ALLOW_DEVELOPMENT_SEED=true` and supply three distinct strong passwords in
   `SEED_ADMIN_PASSWORD`, `SEED_TIER1_PASSWORD`, `SEED_TIER2_PASSWORD`.
5. Run `npm run db:seed`, then `npm run dev` and visit `/login`.

| Development email | Role | Business / tier |
| --- | --- | --- |
| admin@example.test | ADMIN | No customer record |
| tier1@example.test | CUSTOMER | Development Customer 1 / Tier 1 |
| tier2@example.test | CUSTOMER | Development Customer 2 / Tier 2 |

These are clearly fictional test records, not client facts. Seed requires explicit
opt-in, rejects production mode and non-local database hosts, and never prints
passwords. Repeated seeds preserve existing passwords, status, role and tiers.
Turn off the seed opt-in after use. Never seed a production database through a tunnel.
Real production provisioning remains a separately authorized release task.

## Milestone 2A: admin customer management

Staff can open `/admin/customers`, create a customer at `/admin/customers/new`,
and edit details or access at `/admin/customers/[customerId]`. The list shows
company, normalized login email, optional customer number, tier, active/disabled
status and whether password setup is still needed. Customer names and emails
are kept out of metadata. Existing noindex and robots restrictions apply.

The only schema change is nullable `User.passwordHash`, delivered by the new
`20260906010000_customer_password_setup` migration. The already-applied Milestone 1
migration is unchanged and existing password hashes are preserved. A new account
has `passwordHash = null`; no fake, default or generated password is created.
Credential login still performs dummy password verification for these accounts
and explicitly rejects a missing hash, even if the dummy password matches.

New accounts default to disabled in the form; staff can explicitly select active.
Active status alone does not enable a passwordless account to sign in. The form
and edit page explain that a password is required. Customer creation sends no
email automatically; staff explicitly send a setup link from the edit page.
Setup populates the nullable hash without changing the User/Customer relationship.

Each create, edit and status action independently calls `requireAdmin()` before
validation or database access. The list, detail and tier read helpers also check
admin authorization. Actions allowlist submitted fields, validate CUIDs and input
lengths with Zod, share login's email normalization, resolve the target Customer's
CUSTOMER user server-side, and accept only existing Tier 1/Tier 2 records. Browser
role, user ID, password hash and session-version fields are ignored.

User and Customer writes use serializable PostgreSQL transactions. Database
unique constraints arbitrate email and non-empty customer-number conflicts,
including simultaneous submissions. Blank customer numbers become null. A failed
Customer insert or update rolls back identity changes as well. Errors returned
to staff omit database details. Serialization conflicts ask the admin to retry.

Account access has one application-level write rule: the dedicated access action
sets **both `User.active` and `Customer.active` to the same requested value** in
one transaction and increments `User.sessionVersion` atomically. Every access
command revokes prior sessions, including repeated commands and re-enabling.
Ordinary detail edits do not write either active flag, preventing stale edit forms
from undoing access changes. Existing drift from direct database edits is shown
as disabled with an access-review notice; the access action normalizes both flags.
All future application writers must use this same rule. Direct database writes
can still create drift, and authentication continues to reject either inactive flag.

Company name, customer number and tier changes preserve sessions. A change to the
normalized login email increments the session version; casing/outer whitespace
normalization alone does not. Current tiers remain resolved from the database,
never from auth tokens. No role-edit or hard-delete functionality is provided.

Milestone 2A added no email flow or environment variables. The following section
describes the subsequent Milestone 2B implementation.

## Milestone 2B: setup invitations and password reset

### Token storage and consumption

The new `20260906020000_account_tokens` Prisma migration adds `AccountToken` and
`AccountTokenPurpose`; neither previously applied migration changes. Each row has
a unique SHA-256 digest of a cryptographically random 32-byte (256-bit) bearer token,
a User relation, purpose, issue-time sessionVersion, expiration, creation time,
consumption/supersession timestamp and email-acceptance timestamp (`deliveredAt`).
Indexes support user/purpose/outstanding-token and expiration queries. A random
token needs no password-style slow hash; brute-forcing its entropy is impractical.
Raw tokens are never stored in PostgreSQL, returned to staff, or logged.

Setup links expire after 24 hours; password reset links expire after one hour.
Validation always requires the correct server-selected purpose, an unexpired,
unconsumed, email-accepted row, matching current sessionVersion, CUSTOMER role and
associated Customer. Setup additionally requires a null hash; reset requires an
existing hash. ADMIN accounts are ineligible for both public token flows.

Issuance and consumption lock the User row before reading current state. Concurrent
reissues leave at most one current link for that purpose; concurrent consumption
can change the password only once. Passwords and confirmation are validated with
the existing untrimmed 15–128 character policy. Argon2id hashing uses the existing
settings and occurs before acquiring the database lock to keep lock duration short.
The token is then revalidated inside the transaction; password hash update,
sessionVersion increment, consumption and invalidation of every other outstanding
account token commit together or all roll back. Neither active flag is written.

### Staff invitations and email failure

`sendSetupLink()` independently calls `requireAdmin()` and resolves the CUSTOMER
identity from the validated customer ID. No browser user ID/role/email determines
the recipient. Passwordless customers can be invited whether active or disabled.
The edit page offers Send/Resend, shows current setup-pending state, and never
shows a password, token or link. Already-set-up accounts have no invitation action.

Before issuing a link, configuration is validated. The new row and supersession
of older unused tokens of the same purpose commit before Resend is called. The
new row is unusable until Resend accepts the email and `deliveredAt` is recorded.
That name records provider acceptance, **not inbox delivery**. The UI uses that
distinction explicitly. A concurrent reissue/email/access change prevents the
older delivery from reporting success or making its token usable.

On provider rejection/timeout, the new token is invalidated and the admin sees a
retry message. If invalidation storage fails, its null `deliveredAt` still denies
use. If a process stops between sending and recording acceptance, the received
link remains unusable. Retry always issues a fresh link; it never attempts to
recover a raw token from storage. Older links may already be superseded even when
delivery fails. No automatic retry queue or delivery webhook is added.

### Customer routes and reset policy

`/setup-account?token=...` and `/reset-password?token=...` validate server-side before
showing password and confirmation fields. Invalid/missing/expired/used/wrong-purpose
links show a generic unavailable message without account details. Actions capture
only the digest and server-selected purpose in Next.js's encrypted closure; they
do not receive raw tokens in client props or trust identity/purpose/expiry fields.
Every POST revalidates against PostgreSQL. A successful change redirects to
`/login?password=updated`; it creates no authenticated session.

The pages are dynamic, noindex, no-store and use `Referrer-Policy: no-referrer`.
Once hydrated, the form removes the bearer query from the current history entry.
A reload then needs the original email link again. Tokens still initially travel
in the email URL and reach the hosting ingress; redact these routes' query strings
in hosting/access logs and do not add analytics or email click tracking to them.
No application code logs token URLs, passwords or provider exception payloads.

`/login` links to `/forgot-password`. All request outcomes use identical generic
wording, including missing/admin/passwordless accounts, throttling and failures.
For allowed, syntactically valid requests, Next.js 16 `after()` performs eligibility
lookup and delivery **after the response**; lookup/provider latency is not exposed
as an account-existence signal. This uses Vercel's request lifetime support with
a 30-second route duration and a 10-second Resend timeout, not an unawaited promise.
It is not a durable queue: failures log only a fixed message and the customer may
request another link. The response promises no account existence or confirmed delivery.

Reset is CUSTOMER-only with an existing password and Customer association.
Disabled customers may also reset a password, but stay disabled and cannot log in.
Null-hash customers must use a staff-issued setup link. ADMIN recovery is deliberately
not exposed publicly and remains a separate controlled operational procedure.

### Invalidation and limits

| Event | Outstanding setup/reset tokens | Sessions/access |
| --- | --- | --- |
| Issue/reissue setup or reset | Supersede unused tokens of the same purpose | No access/version change |
| Complete setup/reset | Invalidate all outstanding purposes | Increment version; preserve both active flags |
| Change normalized login email | Invalidate all in the email-update transaction | Existing version revocation preserved |
| Change account access, including re-enable | Invalidate all in the status-update transaction | Set both flags together; increment version |
| Ordinary business/tier edit or email casing normalization | Preserve | Preserve sessions |
| Expired/consumed/unaccepted token | Always rejected | No effect |

Fresh links can be issued after a status change, including for a disabled account.
Issue-time version binding also rejects tokens if another version-revoking operation
occurs. Future role/security writers must continue the same revocation rule.
Expired/consumed rows remain harmless; no background cleanup system is required.

All limits reuse the atomic PostgreSQL `LoginRateLimit` buckets and HMAC keys with
separate namespaces; no browser IP/forwarding header or in-memory counter is trusted:

- Public reset: 3 requests per normalized email per 15 minutes; 30 global/minute.
- Staff setup mail: 3 per customer per 15 minutes; 30 global/hour.
- Password consumption: 10 per token digest per 15 minutes; 60 global/minute,
  checked before Argon2 work. Invalid attempts count; storage failure denies writes.

The same targeted/global denial-of-service tradeoffs as credential limiting apply.
Limits bound work across instances, not all ingress traffic; production WAF/rate
controls and operational volume review remain appropriate.

### Email configuration and local verification

- Reuse server-only `RESEND_API_KEY`.
- Add `ACCOUNT_FROM_EMAIL`, a sender on a verified Resend domain. This is independent
  of contact-form recipients/senders; account email goes only to the current login email.
- `AUTH_URL` must be an exact canonical origin with no path, credentials, query or
  fragment. HTTPS is required except localhost/loopback development. Request Host
  and forwarded headers are never used to construct links.
- Confirm the actual sender/domain, disable Resend click tracking for account links,
  and verify real inbox delivery as a separately authorized environment/release task.
- Run `npm run db:generate` and apply all three migrations with `npm run db:deploy`
  only against your intended local database. No new packages or secret client variables.

Automated tests use only a fresh isolated PostgreSQL database. Database tests mock
the email boundary; the production browser-test server loads a test-only Node
preload that intercepts Resend HTTP calls. Dummy email configuration overrides local
settings. Captured test messages stay in ignored `.test-runtime/mail-*` directories.
The preload is never imported by application code, and there is no production
email-bypass environment switch. No real emails, deployments, or preview/production
data changes are part of this milestone.

## Production configuration and review

- `DATABASE_URL`: PostgreSQL connection string; use provider-required verified TLS,
  restricted database access, and an appropriate connection-pooling/backups plan.
  Each Node process uses at most five pool connections. Do not disable certificate
  verification to make a deployment work.
- `AUTH_SECRET`: random secret of at least 32 characters, consistent across app
  instances. Rotating it invalidates sessions and resets limiter key identities.
- `AUTH_URL`: exact canonical HTTPS origin.
- `AUTH_TRUST_HOST`: parsed explicitly as `true`, never by string truthiness.
  Development and Vercel are trusted automatically. Other production hosts must
  set this only after verifying their ingress overwrites Host/forwarded headers.
- Do not configure development seed passwords or opt-in on production.
- Run `npm run db:deploy` as a controlled release step before serving protected
  routes. Builds generate the client but never migrate or seed a database.
- Review the pinned Auth.js v5 beta release before launch. It follows the current
  [Auth.js App Router installation](https://authjs.dev/getting-started/installation)
  and [Credentials provider](https://authjs.dev/getting-started/authentication/credentials)
  interfaces requested for this project.
- The existing Next.js 16.2.9 stack is retained. The dependency audit on 2026-09-06
  reports high-severity advisories in Next.js and its bundled PostCSS/sharp tree,
  including [Server Actions denial of service](https://github.com/advisories/GHSA-m99w-x7hq-7vfj).
  Patch and re-test the framework before production launch. No unrelated framework
  upgrade was bundled into this milestone. Review full development-tool advisories
  as well with `npm audit`.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`: isolated credential validation, password hashing and authorization.
- `npm run build`: production build; existing Google Fonts require network access.
- `npx playwright install chromium firefox` (once), then `npm run test:integration`:
  creates an isolated real PostgreSQL cluster with random test credentials, applies
  the migration, seeds three users, runs database/limiter tests, builds production,
  and runs Playwright against `next start` on localhost:3107. It does not use the
  configured development or production database. A free database port is selected
  automatically. Local process creation/termination permissions are required;
  use a non-root OS user. PostgreSQL binaries are a development-only dependency.
  Generated test database files stay under ignored `.test-runtime/`; screenshots
  and failure traces stay under ignored `test-results/`.

Browser checks cover anonymous direct/RSC access, admin/customer separation, both
seed customers, sign-out, disabled user/business login and existing-session denial,
direct callback CSRF and rate limiting, forged claims, and responsive overflow.
Protected/login metadata is noindex; protected paths are excluded in robots.txt.
No public website content or customer navigation redesign is part of this milestone.

Milestone verification completed on 2026-09-06: lint, TypeScript, production build,
31 unit/database tests and six browser scenarios passed. Phone (390px), tablet
(768px) and desktop (1440px) screenshots were inspected. The dependency audit is
not clean; the existing runtime advisories are listed above. Production hosting,
HTTPS cookie behavior at the actual origin, real account provisioning and the
production database have not been configured or verified in this milestone.

Milestone 2A verification: Prisma generation and both migrations ran against a
new isolated local PostgreSQL database. Lint, typecheck, 44 unit tests, 15 database
integration tests and eight browser scenarios passed, along with the production
build. Browser checks include direct HTTP action replay as anonymous/customer
callers and rejection of an old session cookie after admin disable/re-enable.
List/edit layouts were inspected at 390px, 768px and 1440px. No dependencies changed,
so the existing clean Node 24 installation was reused. Preview/production data
and deployments were not touched; the user separately verified Milestone 1 preview.

Milestone 2B verification: Prisma generation and all three migrations passed
against a fresh isolated local PostgreSQL database. Lint, typecheck, 62 unit tests,
38 database integration tests (100 combined), 11 Playwright scenarios and the
production build passed. Coverage includes concurrent issue/consume, transaction
rollback, email failure/reissue, direct unauthorized invitation actions, token
tampering/expiry, disabled setup/reset and revocation of a real browser session.
Setup forms were inspected at 390px, 768px and 1440px. Dependencies and both earlier
migrations remain unchanged. No real email delivery or hosting configuration was
verified, and no preview/production data or deployments were modified.
