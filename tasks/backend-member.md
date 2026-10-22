# Task 1 of 5 — Backend: Foundation + Member API

| | |
| --- | --- |
| **Agent** | `backend-engineer` |
| **Source** | [`docs/work-context.md`](../docs/work-context.md) (APPROVED 2026-10-23) |
| **Runs** | **First.** Every other task depends on Phase A of this one. |
| **Sibling tasks** | `tasks/backend-admin.md` (builds on this), `tasks/frontend-member.md`, `tasks/frontend-admin.md`, `tasks/qa.md` |

## Read first

1. [`CLAUDE.md`](../CLAUDE.md) and `.claude/agents/backend-engineer.md`.
2. [`docs/work-context.md`](../docs/work-context.md):
   - **Keep It Simple**
   - §2 Scope (the member side and emails)
   - §3 Decisions D1–D18 and Q1–Q3
   - **§5 API Contract**
   - **§6 Data Model and Concurrency Strategy**
   - §7 Folder Map

   §5 and §6 are the spec. This file doesn't repeat them.

## What you own

You own the **shared backend foundation**: schema, contract types, errors, auth, email, seed, and config edits. You also own **every member-facing endpoint**.

- **Contract:** the backend-admin task builds on top of your foundation. Keep its exports stable and announce any change.

## Files you own

| Area | Paths |
| --- | --- |
| Contract types | `src/types/{shared,auth,sessions,bookings,waitlist,account}/index.ts` (`src/types/admin/` belongs to backend-admin) |
| Schema | `src/db/migrations/001_create_users_and_auth.sql`, `002_create_sessions_bookings_waitlist.sql` |
| DB scripts | `src/db/client.ts`, `src/db/migrate.ts`, `src/db/seed.ts`, `src/db/create-admin.ts` |
| Plumbing | `src/utils/errors.ts`, `src/utils/password.ts`, `src/middlewares/error-handler.ts`, `src/middlewares/require-auth.ts`, `src/config/env.ts`, `src/create-app.ts`, `src/server.ts`, `src/routes/index.ts` |
| Email | `src/services/email/send-email.ts`, `src/services/email/templates.ts` (**all** templates E1–E8, including the ones backend-admin sends) |
| Features | `src/{routes,controllers,services,repositories,validators}/{auth,sessions,bookings,waitlist,account}/` |
| Tests | `tests/unit/services/{auth,sessions,bookings,waitlist,account}/`, `tests/unit/middlewares/`, `tests/integration/{health,auth,sessions,bookings,waitlist,account}.test.ts` |
| Config (approved edits only) | `next.config.ts` (D1 rewrite), `package.json` (scripts `seed`, `create-admin`; deps `nodemailer` and `@types/nodemailer`), `jest.config.mjs` (D3), `playwright.config.ts` (D4), `.env.example` |

## Phase A: unblock everyone (do first, then announce)

- [ ] **Contract types** `src/types/{shared,auth,sessions,bookings,waitlist,account}/index.ts`, exactly as in §5. `ApiErrorCode` includes the admin codes too.
- [ ] **Migrations 001 + 002**, exactly as in §6. Verify both with `yarn migrate` on a fresh database, then a second run that's a no-op.
- [ ] **Typed errors** in `src/utils/errors.ts`: **one per `ApiErrorCode`**, admin ones included, each with its HTTP status from §5.
- [ ] **`src/middlewares/error-handler.ts`:** the D5 shape, `404 NOT_FOUND`, invalid JSON → `400`, and no stack traces. Update `tests/integration/health.test.ts` to match.
- [ ] **`src/middlewares/require-auth.ts`:** exports `requireAuth` and `requireAdmin` (§6, Authentication flow) and sets `res.locals.user`.
- [ ] **Shared exports backend-admin will import.** Keep them stable:
  - the row mappers in `src/repositories/sessions/` (`toSessionSummary`, computing `spotsLeft`/`isFull`), `src/repositories/bookings/` (`toBooking`), and `src/repositories/waitlist/` (`toWaitlistEntry`)
  - **`promoteFromWaitlist(client, sessionId)`** in `src/repositories/waitlist/`. It takes the caller's transaction client, never opens its own transaction, and returns the promoted bookings with their users.
  - `sendEmail()` plus all **E1–E8** templates in `src/services/email/`
  - the shared validators: uuid, name/email, and the `SessionInput` field rules if you write them
- [ ] **Announce** Phase A to backend-admin, frontend-member and frontend-admin, with the export names and file paths.

## Phase B: auth, email, config

- [ ] `src/utils/password.ts`: `crypto.scrypt`, a random salt, `timingSafeEqual`.
- [ ] **Auth feature** (`src/{repositories,validators,services,controllers,routes}/auth/`):
  - signup (stores `time_zone`, sends **E1**), login (TTL by role, D12), logout, me
  - **forgot-password** (always `204`, sends **E7**) and **reset-password** (the §6 transaction: single-use token, logs the user out everywhere)
  - the same `INVALID_CREDENTIALS` error for an unknown email and a wrong password
- [ ] **`src/db/create-admin.ts`** (D11): reads `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters), and creates or updates the user with `role = 'admin'`. It's importable, so the seed reuses it. Add the `yarn create-admin` script.
- [ ] **Email** (D18):
  - `yarn add nodemailer`, `yarn add -D @types/nodemailer`
  - one transport from `env` (`SMTP_HOST` / `SMTP_PORT` / `MAIL_FROM`)
  - templates E1–E8 as plain functions returning `{ to, subject, text, html }`, using `APP_URL` links and the recipient's `time_zone`
  - **sent only after commit, never awaited, `.catch(log)`**
- [ ] **`src/config/env.ts`:** `isProduction`, `TEST_DATABASE_URL` (D3), the D11 vars, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `APP_URL`.
- [ ] **`.env.example`:** `API_URL`, `TEST_DATABASE_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (marked dev-only), `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `MAIL_FROM`, `APP_URL=http://localhost:3000`, with comments.
- [ ] **Config edits:**
  - D1: the `next.config.ts` rewrite `/api/:path*` → `${API_URL}/api/:path*`
  - D3: `jest.config.mjs` uses `TEST_DATABASE_URL`
  - D4: `playwright.config.ts` starts the API and Next, and runs `yarn seed` first

## Phase B: member features

- [ ] **Sessions:** list upcoming and get by id (public).
- [ ] **Bookings:**
  - the §6 **book** transaction
  - get by id
  - the §6 **cancel** transaction (owner **or** admin; `cancelled_by`; calls `promoteFromWaitlist`)
  - list by user
- [ ] **Waitlist:** the §6 **join** transaction, get with its live position, list by user, and **leave/remove** (owner or admin).
- [ ] **Account:** `GET /api/account/bookings`, split into upcoming and past, including waitlist entries and cancelled bookings.
- [ ] **Ownership:** the bookings and waitlist services do the owner-or-admin check, and **return `404` when the caller isn't allowed**.
- [ ] **Emails, after commit:**
  - **E2** after booking, **E3** after joining
  - **E5** to the owner on cancel (wording for "you" vs "the studio")
  - **E4** to every promoted member
  - **E8** to all admins when the cancelled booking was paid
- [ ] Mount `auth`, `sessions`, `bookings`, `waitlist` and `account` in `src/routes/index.ts`. **Leave a clearly marked spot for `/admin`**; backend-admin adds that one line.

## Phase B: seed (D2)

- [ ] `src/db/seed.ts` (`yarn seed`): truncate, then insert fixed UUIDs with times relative to `now()`:
  - ~15 demo members (one shared dev password, printed when the seed runs)
  - the demo admin, via `create-admin`
  - sessions:
    - open with plenty of spots
    - **exactly 1 spot**
    - **≤ 3 spots** ("filling fast")
    - **full with 2 waiting**
    - **past** (with bookings)
    - **today**
    - **0 bookings** (for the admin delete demo)
  - demo member **"Maya"**: upcoming and past bookings, 1 waitlist entry, 1 booking she cancelled, one paid booking and one unpaid
  - one **cancelled + paid** booking (for "Refund due")
- [ ] Export the fixed IDs and demo emails for QA and e2e.

## Tests (Jest)

- [ ] **Unit (mocked repositories and `sendEmail`):**
  - every service's error paths
  - the owner-or-admin rule
  - `require-auth`: no cookie, unknown or expired token, member, admin, member on an admin route → `403`
- [ ] **Integration (real PostgreSQL, the test database, `sendEmail` mocked, data reset per test):**
  - **Auth:**
    - signup (`201`, cookie, `EMAIL_TAKEN` case-insensitive)
    - login (the same `401` for an unknown email and a wrong password), me, logout invalidates the session
    - the password is not stored in plain text
    - TTL: 30 days for members, 12 hours for admins
    - forgot-password: `204` for every email, but E7 only for known ones
    - reset-password: logs the user out everywhere; expired, used and unknown tokens give `INVALID_RESET_TOKEN`; a token can't be used twice
  - **Sessions:** past sessions are hidden, the list is ordered, `priceCents`; get, 404, 400.
  - **Bookings:**
    - `401` logged out; `201`
    - `SESSION_FULL`, `SESSION_PAST`, `ALREADY_BOOKED`
    - get as the owner, as another member (`404`), as an admin (`200`)
    - cancel as the owner (`cancelledBy = 'member'`), as another member (`404`), as an admin (`'admin'`)
    - `BOOKING_ALREADY_CANCELLED`; a past class → `SESSION_PAST`
    - rebooking after cancelling
  - **Waitlist:**
    - join (positions 1, 2)
    - `SESSION_NOT_FULL`, `ALREADY_BOOKED`, `ALREADY_WAITLISTED`
    - cancel → the first waiting member is promoted
    - leave as the owner, as another member (`404`), as an admin
  - **Account:** the upcoming/past split, waitlist with positions, cancelled bookings with `cancelledBy`, only your own data.
  - **Emails:** E1, E2, E3, E4, E5, E7 and E8 fire on the right event, to the right recipients, with the right links. **A `sendEmail` failure still returns `201`.**
  - After each mutating test: `booked_count = count(confirmed)` and `booked_count <= capacity`.

## Done when

- `yarn lint`, `yarn test:server`, `yarn build:server` and `yarn build` pass, with **real output** in your report.
- `yarn migrate`, `yarn seed` and `yarn create-admin` work on a fresh database, with Mailpit running and receiving E1 on sign-up.
- The endpoints match §5 exactly.

## Do not touch

- `src/types/admin/`, `src/{routes,controllers,services,repositories,validators}/admin/`
- all frontend folders
- `tests/e2e/`, QA's `tests/integration/*-concurrency.test.ts`
- any config beyond the edits listed above

## Handoffs

| To | What | When |
| --- | --- | --- |
| backend-admin | Phase A exports: mappers, `promoteFromWaitlist`, `requireAdmin`, `sendEmail` + templates, errors, types, migrations | end of Phase A |
| frontend-member, frontend-admin | Contract types published | end of Phase A |
| QA | Endpoints, seed, `create-admin`, config edits, plus your report | end of Phase B |

Use the completion report format in `.claude/agents/backend-engineer.md`.
