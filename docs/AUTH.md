# Milestone 1: database and authentication

This foundation is shared by both quoted ordering options. Only login/logout,
authorization, initial models, development fixtures and protected placeholders
are implemented. Customer management, invitations/password reset, catalog,
pricing UI and ordering remain later milestones.

## Architecture

- PostgreSQL with Prisma 7.10.0 and the Node PostgreSQL driver adapter. The generated
  client is ignored and recreated by `db:generate`, `typecheck` and `build`.
- `User` is authentication identity: normalized unique email, Argon2id password
  hash, ADMIN/CUSTOMER role, active flag and session revocation version.
- `Customer` is separate wholesale business data, with a unique user association,
  company name, optional customer number, active flag and required pricing tier.
  One login per customer is the initial choice; multi-user businesses can be
  introduced deliberately later. No unconfirmed business fields are required.
- `PricingTier` contains a unique name and ID, with Tier 1 and Tier 2 development
  records. No discount formula or product pricing is implemented.
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

## Authentication behavior

`/login` accepts existing provisioned credentials only. `/account` resolves the
current role and redirects to `/admin` or `/portal`. Those routes independently
enforce authorization and render simple placeholders. There is no registration
page, registration API, account-creation action or production bootstrap endpoint.

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
increment `User.sessionVersion`. Later password reset/role/disable management must
increment that version in the same transaction as the change. Current status and
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

Use Node 22.12+ or Node 24 LTS, npm, and a local PostgreSQL database. This change was
verified with Node 24.20.0. On PowerShell with script execution disabled, use
`npm.cmd` and `npx.cmd` in place of `npm` and `npx`.

1. Run `npm ci` and copy `.env.example` to `.env` (do not overwrite existing local
   configuration). Prisma CLI/seed load `.env`; Next.js also supports `.env.local`.
2. Set `DATABASE_URL` to your development PostgreSQL database, `AUTH_URL` to
   `http://localhost:3000`, and generate a random `AUTH_SECRET`:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
   All backend and seed variables are server-only; never use a `NEXT_PUBLIC_` prefix.
3. Run `npm run db:generate`, then `npm run db:deploy` to apply the checked-in initial
   migration. Use `npm run db:migrate -- --name descriptive_name` for future changes
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
Real account provisioning/invitation decisions remain Milestone 2.

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
- `npx playwright install chromium` (once), then `npm run test:integration`:
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
