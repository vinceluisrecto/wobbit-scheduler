# Session 2: Backend (tasks/backend-member.md, tasks/backend-admin.md)

Exported from the raw Claude Code session log for this project. Your messages, the agent's replies, and each tool call (with its one-line description) are included in order.
Tool outputs, system prompts and file contents are omitted.

---

## User (1)

Read CLAUDE.md, docs, and the existing agents in the .claude/agents folder or any necessary documents for you to have context. You are a backend-engineer. Execute the @tasks/backend-admin.md

**Agent:**

I'll start by reading the project docs, agent definition, and current code state.

> 🔧 `Bash` — Read agent definition and list project files

**Agent:**

The task depends on backend-member's Phase A, and none of it is in the tree yet (no migrations, no `requireAdmin`, no mappers). Let me check other branches/worktrees and read the docs.

> 🔧 `Bash` — Check branches, worktrees, and doc sizes

> 🔧 `Read` — ~/Documents/GitHub/wobbit-exam/docs/work-context.md

> 🔧 `Read` — ~/Documents/GitHub/wobbit-exam/tasks/backend-member.md

> 🔧 `Read` — ~/Documents/GitHub/wobbit-exam/docs/work-context.md

> 🔧 `AskUserQuestion` — 

**Agent:**

The user wants the full `tasks/backend-member.md` task (Phase A and Phase B) and not backend-admin. Next I'll read the existing code and config.

> 🔧 `Bash` — Dump existing backend code and config files

**Agent:**

Now the environment: Postgres, databases, Mailpit, and tool versions.

> 🔧 `Bash` — Check database, Mailpit, and tool versions

**Agent:**

Postgres 17.6 and Mailpit are running. `wobbit_exam_test` doesn't exist yet. Before designing, I'll check what the sibling tasks expect from my exports (seed IDs, account shape, emails).

> 🔧 `Bash` — Grep sibling tasks for backend expectations

**Agent:**

Dev DB is empty apart from `schema_migrations`. I'll check the installed Next version's rewrites API (per AGENTS.md) before touching `next.config.ts`.

> 🔧 `Bash` — Read Next.js rewrites docs from installed package

> 🔧 `Bash` — Read the rewrites doc page

**Agent:**

I have the whole picture. Phase A comes first. I'll install the two approved packages now because `sendEmail()` is part of the Phase A exports.

> 🔧 `Bash` — Install nodemailer and its types with yarn

**Agent:**

Now the Phase A contract types, exactly as in §5:

> 🔧 `Bash` — Write contract type files for all member features

**Agent:**

Migrations, verbatim from §6:

> 🔧 `Bash` — Write migrations, create test DB, migrate both twice

**Agent:**

Both migrations apply cleanly on both databases, and the second run is a no-op. Next: config, typed errors, the error handler, and the token/password utils.

> 🔧 `Bash` — Write env config, typed errors, error handler, utils

**Agent:**

Now the shared validators (uuid, name/email/password) and the auth validator:

> 🔧 `Bash` — Write shared and auth validators

**Agent:**

Next the shared transaction helper and the auth repositories:

> 🔧 `Bash` — Write transaction helper and auth repositories

**Agent:**

Microsecond timestamps from `row_to_json` parse correctly. Now the sessions, bookings, and waitlist repositories, including the mappers and `promoteFromWaitlist`:

> 🔧 `Bash` — Write sessions, bookings, waitlist repositories and mappers

**Agent:**

Now the email module (`sendEmail` + E1–E8 templates):

> 🔧 `Bash` — Write sendEmail and the E1–E8 templates

**Agent:**

Now the `requireAuth` / `requireAdmin` middleware, then the services:

> 🔧 `Bash` — Write auth middleware, ownership helper, auth service

> 🔧 `Bash` — Write sessions, bookings, waitlist, account services

**Agent:**

Now controllers and routes:

> 🔧 `Bash` — Write controllers and routes, then type-check backend

**Agent:**

Backend type-checks cleanly. Next: `create-admin.ts`, the seed, and the exported seed IDs.

> 🔧 `Bash` — Write create-admin, seed, and seed constants

**Agent:**

Seed counts check out: 1 spot / 2 spots / full + 2 waiting. Now the approved config edits: scripts, `.env.example`, the D1 rewrite, D3, and D4.

> 🔧 `Bash` — Apply approved config edits and local env vars

**Agent:**

Now a smoke run: seed, create-admin, then the live API against Mailpit.

> 🔧 `Bash` — Run seed and create-admin against dev DB

> 🔧 `Bash` — Smoke-test the live API and Mailpit delivery

**Agent:**

Signup returned 400. I'll look at the body to see why.

> 🔧 `Bash` — Inspect the signup 400 response body

**Agent:**

The API was fine; zsh doesn't word-split `$J`, so my earlier header never got sent. I'll rerun the smoke flow under bash.

> 🔧 `Bash` — Rerun end-to-end smoke flow with bash

> 🔧 `Bash` — Fix date format and guard template building

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/src/services/bookings/bookings.service.ts

> 🔧 `Bash` — Rerun smoke flow and inspect Mailpit emails

> 🔧 `Bash` — Write integration test helpers

**Agent:**

Now the integration test files:

> 🔧 `Bash` — Write health, auth, sessions integration tests

> 🔧 `Bash` — Write bookings/waitlist/account tests and run integration

**Agent:**

All 45 integration tests pass on the first run. That's suspicious enough to check two things: that they really ran against the test DB, and that the dev DB was left alone.

> 🔧 `Bash` — Confirm tests used test DB and guard works

> 🔧 `Bash` — Mutation-test promotion order then restore

**Agent:**

The mutation was caught (1 failed), and the original is restored. Now the unit tests: services with repositories and email mocked, plus `require-auth`.

> 🔧 `Bash` — Write service and middleware unit tests and run them

**Agent:**

46 unit tests pass. Now the full gate from the task: lint, the server tests, both builds, plus the frontend Vitest suite (so I know I broke nothing there).

> 🔧 `Bash` — Run ESLint across the project

**Agent:**

Lint flags the `require()` inside the `jest.mock` factories. I'll switch to `jest.requireActual`, which loads the same helper module without a `require()` call.

> 🔧 `Bash` — Fix lint in mocks, rerun lint and server tests

**Agent:**

Lint is clean and all 91 Jest tests pass (the email assertions still see sends, so the shared mock instance works). Now the builds and Vitest:

> 🔧 `Bash` — Run server build, Next build, and Vitest

**Agent:**

CLAUDE.md now points to a `backend-conventions` skill and a `verify` pre-finish skill. I'll read both and check my work against them.

> 🔧 `Bash` — Read the new backend-conventions and verify skills

> 🔧 `Bash` — Rename promote file and check ports are free

> 🔧 `Bash` — Migrate, seed, create-admin on a fresh throwaway DB

> 🔧 `Bash` — Run Playwright e2e with the new D4 webServer config

> 🔧 `Bash` — Final verify run: lint, builds, all test suites

> 🔧 `Bash` — Restore the gitignored dist build output

**Agent:**

## Backend Engineer Report: `tasks/backend-member.md`

I did the whole backend-member task (Phase A and Phase B), as you asked, and nothing from backend-admin. Lint, both builds, and all 91 Jest tests pass. **The Playwright e2e run did not run** (see Blockers). Nothing is committed.

### What was built
- **Phase A (what backend-admin builds on):**
  - Contract types exactly as in §5, plus the two migrations.
  - One typed error for each `ApiErrorCode`, and the error handler now returns the D5 shape (`{ error: { code, message } }`).
  - `requireAuth` / `requireAdmin`, the row mappers, `promoteFromWaitlist(client, sessionId)`, `sendEmail()`, and all eight email templates (E1–E8).
- **Phase B:**
  - Auth: signup, login, logout, me, forgot-password and reset-password.
  - Sessions, bookings, waitlist and account endpoints, with the §6 transactions.
  - The seed (`yarn seed`) and `yarn create-admin`.
  - The approved config edits: D1 rewrite in `next.config.ts`, D3 test database, D4 Playwright servers, `.env.example`, and the `nodemailer` packages.

### Commands executed
| Command | Exit | Result |
|---|---|---|
| `yarn add nodemailer`, `yarn add -D @types/nodemailer` | 0 | added the two approved packages |
| `yarn migrate` ×2 on the dev, test and a throwaway fresh database | 0 | first run applied 001 and 002; second run was a no-op |
| `yarn seed`, `yarn create-admin` on the fresh database | 0 | 15 members, 7 classes, 37 bookings, admin created |
| `yarn lint` | 0 | clean |
| `yarn test:server` | 0 | **13 suites, 91 tests passed** |
| `yarn build:server` / `yarn build` | 0 / 0 | both compiled; Next.js type check passed |
| `yarn test` (Vitest) | 0 | 2 passed (existing frontend tests) |
| `yarn test:e2e` | 1 | **didn't run**: see Blockers |

### Actual results
- **Unit tests (repositories and email mocked): 46 passed.** They cover every service error path, the owner-or-admin rule, `requireAuth` / `requireAdmin` (no cookie, unknown or expired token, member, admin, member on an admin route → 403), and the email triggers.
- **Integration tests (real Postgres, `wobbit_exam_test`, SMTP mocked): 45 passed.** Every mutating test checks `booked_count = count(confirmed)` and `booked_count <= capacity` afterwards.
- **Mutation check:** I reversed the waitlist promotion order on purpose, a test failed, then I restored it.
- **Live run against Mailpit:** emails arrived as expected:
  - E1 on sign-up, E2 on booking, E3 showing "#3", E5 on cancel.
  - E4 went to the first person in line.
  - E8 went to the admin when a paid booking was cancelled.
  - E7 for a known email, and nothing for an unknown one.
  - Times were in each recipient's timezone.
- **Concurrency test:** not written. That file belongs to QA (`*-concurrency.test.ts`). The capacity safety rests on the §6 conditional `UPDATE` and the row locks.

### Bugs found and fixed while testing
1. **A failing email turned a successful booking into a 500.** The time formatting threw while the email was being built, after the booking had already committed. Two fixes:
   - `sendEmailInBackground` now takes a builder function (`() => template(...)`), so building the email is also covered by the error catch.
   - The admin lookup for E8 no longer runs inline after the commit.
2. The date format options were invalid together. Fixed.

### Changes beyond the spec (please review)
- **New files that aren't listed in the task:**
  - `src/db/transaction.ts`: a shared transaction helper; backend-admin should reuse it.
  - `src/utils/token.ts` and `src/utils/to-iso-string.ts`: small helpers.
  - `src/constants/auth.ts`: session lengths and cookie name.
  - `src/constants/seed.ts`: the fixed seed IDs, emails and demo password. They live here so e2e tests can import them without connecting to the database.
  - `src/types/email/`, and an extra `AuthUser` type in `src/types/auth/`. Both are backend-only; the §5 types are unchanged.
- **`jest.config.mjs` now has `maxWorkers: 1`.** Test files share one test database and wipe it between tests, so they have to run one at a time. This goes slightly past the D3 edit I was approved for.
- **Integration tests refuse to wipe any database whose name doesn't end in `_test`.** I checked that this guard works.
- **Two error-order choices:**
  - Booking a full class you're already in returns `ALREADY_BOOKED`, not `SESSION_FULL`.
  - Joining the waitlist checks `ALREADY_BOOKED` before `SESSION_NOT_FULL`.
- **Admins can book for themselves.** Booking only requires a login, not the member role.
- **`create-admin.ts` imports repositories and validators from `src/db/`,** which goes against the layering rule. It's a script and lives where the plan put it.
- **I added the new variables to your local `.env`,** with the same dev values as `.env.example`.
- **I renamed `promote-from-waitlist.ts` to `promote-from-waitlist.repository.ts`** to match the naming rule in the updated `backend-conventions` skill.

### Blockers
- **`yarn test:e2e`:** you have a `next dev` running on port 3000 (PID 43562) in this folder, and Next 16 refuses to start a second dev server in the same folder. The original config would hit the same problem. I didn't stop your process. Stop it and rerun `yarn test:e2e` to check the D4 config.

### Unresolved risks
- A member who is on a waitlist but also holds a confirmed booking for that class is skipped by promotion and stays "waiting". The normal flows shouldn't produce this.
- The seed's "today" class starts two hours from the current hour, so if you seed late in the evening it lands tomorrow.

### For backend-admin (Phase A exports)
- `requireAdmin`: `src/middlewares`
- Mappers:
  - `toSessionSummary`: `src/repositories/sessions`
  - `toBooking` and `BOOKING_SELECT`: `src/repositories/bookings`
  - `toWaitlistEntry` and `WAITLIST_SELECT`: `src/repositories/waitlist`
- `promoteFromWaitlist`: `src/repositories/waitlist`
- `withTransaction`, `succeed`, `refuse`, `isUniqueViolation`: `src/db/transaction.ts`
- `sendEmailInBackground(() => classChangedEmail(...))` and `promotedEmail`: `src/services/email`
- `notifyPromoted(promoted, session)`, the E4 sender: `src/services/bookings`
- `validateUuid` and the field validators: `src/validators/shared`
- The `/admin` mount spot is marked in `src/routes/index.ts`.

---

## User (2)

is everything in the @tasks/backend-member.md integrated? If not execute everything that is not executed yet

**Agent:**

I'll check every checkbox in `tasks/backend-member.md` against the code and the test files, not my memory of them. The tests are the place where a checklist item could have slipped through.

> 🔧 `Bash` — Audit test coverage gaps and running servers

> 🔧 `Bash` — Add missing email-link and invariant assertions, run tests

> 🔧 `Bash` — Verify D4 API command and D1 rewrite via Next

**Agent:**

D1 works: requests through Next on port 3000 reach the API, and the session cookie works through the proxy. The D4 API command also works (seed, then health on 4000). Final gate:

> 🔧 `Bash` — Rerun lint, server tests, and both builds

**Agent:**

Almost everything in `tasks/backend-member.md` was already in place. The checklist review found a few gaps, which I've now filled. One item is still open: the Playwright e2e run, which is blocked by your running `next dev`.

**What I added or verified this round:**
- **Email links:** the task says emails fire "with the right links", but only E2, E3 and E7 had their full link checked in tests. I added link checks for:
  - E1 → `/sessions`
  - E4 → the exact `/bookings/<id>` the promoted member received
  - E5 → `/account`
  - E8 → `/admin/sessions/<id>`
- **Seat invariant:** `account.test.ts` cancels a booking and joins a waitlist, but didn't check `booked_count` afterwards. It now runs the same check as the bookings and waitlist tests.
- **D1 rewrite, tested for the first time:** through your Next server on port 3000, `/api/health` returned 200 and `/api/sessions` returned the 6 upcoming classes. Logging in as Maya worked, and the session cookie carried through to `/api/auth/me` and `/api/account/bookings`.
- **D4 API server:** the exact command Playwright uses (`yarn seed && SERVER_PORT=4000 yarn dev:server`) seeds the database and answers on the health URL.

**Final run:** `yarn lint`, `yarn build:server` and `yarn build` all pass, and `yarn test:server` passes 91 of 91 tests across 13 suites.

**Still not done: Playwright.** Next 16 won't start a second dev server in this folder while yours (PID 43562, port 3000) is running. I didn't stop it. To finish this item, stop that server and run `yarn test:e2e`.

**Small deviation:** the task says the demo password is a constant in `seed.ts`. It lives in `src/constants/seed.ts` (`seed.ts` imports and prints it), so e2e tests can import it without connecting to the database.

The rest of the checklist was already done in the previous round and is still passing. Nothing is committed.

---

## User (3)

after that, can you execute everything in the @tasks/backend-admin.md ? Do you need anything before implementing this? If not execute it and remember you are a backend-engineer. Read any documents if necessary

**Agent:**

I have everything I need. Phase A is in place, I've read the contract (§5), §6 and the task, and none of the admin requirements depend on a decision from you. There's one conflict in the docs, which I'll resolve by following the task file and flag in the report:

- D13 (§3) says "Edits don't notify members".
- The task file, §2's email table, and QA's checklist all require **E6** when the title, instructor, time or duration changes.

Two design points before I write the code:

- **Edit transaction:** it locks the session row first (`SELECT … FOR UPDATE`) and then runs the guarded `UPDATE` from §6. That gives the service the old values to compare for the E6 rule, and keeps the "lock the session first" order.
- **Delete transaction:** it also locks first. Otherwise a booking committing at the same moment could slip past the `NOT EXISTS` checks and hit the foreign key as a 500. I'll also translate a foreign-key violation (23503) to `SESSION_HAS_BOOKINGS` as a second guard.

Phase A comes first: the admin contract types, exactly as in §5.

> 🔧 `Bash` — Write admin contract types and admin validators

**Agent:**

Types are published and the admin validators compile. Next, `src/repositories/admin/`:

> 🔧 `Bash` — Write admin repositories and mapper

**Agent:**

Now the admin services. Each repository result maps to a typed error, and emails go out after commit (D18):

> 🔧 `Bash` — Write admin services, controllers, routes; mount router

**Agent:**

The backend compiles with the router mounted. Now the tests, starting with unit tests (repositories and email mocked):

> 🔧 `Bash` — Write admin service unit tests and run them

> 🔧 `Bash` — Write admin integration tests and run them

> 🔧 `Bash` — Fix roster test capacity and rerun admin tests

**Agent:**

All 27 admin integration tests pass. Two mutation checks to confirm they really test the rules: drop `durationMinutes` from the E6 trigger list, and drop the waitlist guard from the delete.

> 🔧 `Bash` — Mutation-test E6 rule and delete guard, then restore

> 🔧 `Bash` — Run lint, server tests, builds, and Vitest

**Agent:**

`yarn build:server` now fails, and the errors are in files I didn't write: `src/utils/format-price.ts` and `src/utils/prefers-reduced-motion.ts`. I'll check where they came from.

> 🔧 `Bash` — Identify new files from another agent

> 🔧 `Bash` — Typecheck backend excluding the new frontend utils

> 🔧 `Bash` — Live admin smoke run with seed data and Mailpit

> 🔧 `Bash` — Re-seed dev DB and list admin files

**Agent:**

## Backend Engineer Report: `tasks/backend-admin.md`

The admin API is done. All six `/api/admin/*` endpoints are built behind `requireAdmin`, match §5, and are tested. One check is red: **`yarn build:server` fails right now**. The cause is frontend files that another agent added while I worked, not the admin code (see Blockers). Nothing is committed.

I didn't need anything from you before starting. There was one conflict in the docs, and I followed the task file:
- D13 says "Edits don't notify members".
- The task file, §2's email table and QA's checklist all require E6.

### What was built
- **Types:** `src/types/admin/index.ts`, exactly as in §5, published for frontend-admin. I also added one backend-only type, `AdminSessionScope`.
- **Validators:**
  - Create requires every field.
  - `PATCH` needs at least one field.
  - A start time in the past returns `400`.
  - `paymentStatus` and `scope` are checked; `scope` defaults to `upcoming`.
  - Ids reuse the shared uuid validator.
- **Repositories:**
  - The list returns all four counts in one query, using subqueries.
  - The detail orders the roster confirmed first, then cancelled, each by booking time. The waiting list is in position order.
  - The edit locks the session row, then runs the guarded `UPDATE` from §6. When capacity goes up, it calls `promoteFromWaitlist` in the same transaction.
  - The delete locks the row first, and also treats a foreign-key violation as `SESSION_HAS_BOOKINGS`.
  - The payment update is a single `UPDATE`.
- **Services:** each repository result maps to its typed error. Emails go out after commit:
  - E6 goes only when the title, instructor, start time or duration actually changes, and only to members confirmed before the edit.
  - E4 goes to members promoted by a capacity increase.
- **Routes:** the whole admin router uses `requireAdmin`, mounted with one line in `src/routes/index.ts`.

### Commands executed
| Command | Result |
|---|---|
| `yarn lint` | exit 0 |
| `yarn test:server` | **17 suites, 136 tests passed** (45 of them new admin tests) |
| `yarn build` | exit 0 (Next.js type check passed) |
| `yarn test` (Vitest) | 2 passed |
| `yarn build:server` | **exit 2**: see Blockers |
| Backend type check with those frontend files excluded | exit 0 |

### Actual results
- **Unit tests (repositories and email mocked): 18 passed.**
  - Every admin error path.
  - E6 fires for each of the four fields, but not for capacity or price, and not when a field is resent with the same value.
  - E4 goes to promoted members.
- **Integration tests (real Postgres): 27 passed.** Every mutating test is followed by the `booked_count` check.
  - All six endpoints return `401` logged out and `403` as a member.
  - Create: `201`, validation failures, a past start time, and the new class showing in the public timetable.
  - List: both scopes, the default, ordering, and the counts against seeded rows.
  - Detail: roster and waiting-list order.
  - Edit: `SESSION_PAST`, `CAPACITY_BELOW_BOOKINGS`, promotion in `created_at` order (entries inserted out of order on purpose), and who receives E6.
  - Delete: `204`, and `SESSION_HAS_BOOKINGS` for confirmed bookings, only cancelled ones, or only waitlist entries.
  - Payment: `paidAt` is set and cleared, and `refundDueCount` follows it.
- **Mutation checks:**
  - Removing `durationMinutes` from the E6 trigger made 2 tests fail, as it should.
  - Removing the delete's waitlist check failed no test, because the foreign key still rejects the delete with the same error. The behaviour stays correct, but the tests can't tell the two guards apart.
- **Live run on seed data with Mailpit:** the capacity raise sent only E4 to Lily. The rename sent E6 to the 7 confirmed members and not to Maya, who is waiting. No invariant violations. I re-seeded the dev database afterwards.

### Blockers
- **`yarn build:server` fails.** A parallel frontend agent added `src/utils/format-price.ts` (it imports `@/constants/studio`) and `src/utils/prefers-reduced-motion.ts` (it uses `window`). `tsconfig.server.json` compiles all of `src/utils`, so the backend build picks them up. These are frontend files plus a shared config, so I didn't touch either. Either fix needs your or the lead's call:
  - exclude the frontend-only util files in `tsconfig.server.json`, or
  - move those helpers out of the shared `src/utils/`.
- **`yarn test:e2e`** is still blocked by your `next dev` on port 3000.

### Contract changes
- None to §5. frontend-admin can build against `src/types/admin/` now.

### Unresolved risks
- **Payment changes are allowed on cancelled bookings.** This lets an admin clear "Refund due" after refunding outside the app. Marking a booking paid again resets `paidAt`.
- **An unknown `/api/admin/*` path returns `401`/`403` instead of `404`,** because the admin check runs first for every admin path.
- **Admin concurrency tests** (capacity edits racing bookings) belong to QA's `admin-concurrency.test.ts` and haven't been written.

---

## User (4)

is everything in the @tasks/backend-admin.md integrated? If not execute everything that is not executed yet

**Agent:**

I'll check the task's checkboxes one by one against the code and tests, then rerun the "Done when" commands. `yarn build:server` was the open item last time.

> 🔧 `Bash` — Recheck server build and recently changed files

> 🔧 `AskUserQuestion` — 

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/tsconfig.server.json

> 🔧 `Bash` — Rerun full Done-when gate after tsconfig fix

> 🔧 `Bash` — Clean rebuild server and lint backend paths only

**Agent:**

Yes. Everything in `tasks/backend-admin.md` is now done. The one item still open last time, `yarn build:server`, passes after the `tsconfig.server.json` change you approved. Full `yarn lint` is failing again, but only on two frontend files that another agent is writing right now.

**What I checked:** every checkbox against the code and tests. That covers the types, validators, the six repository functions, the five error mappings, E6 and E4, the router behind `requireAdmin`, the mount line, and all unit and integration scenarios, including the `booked_count` check after each mutating test. Nothing else was missing.

**What I changed:** `tsconfig.server.json` now excludes the frontend-only helpers: `src/utils/format-price.ts`, `format-session-time.ts`, `prefers-reduced-motion.ts` and `src/constants/studio.ts`. After a clean rebuild, `dist/` contains only backend files.

**"Done when" results:**

| Command | Result |
|---|---|
| `yarn build:server` | exit 0 (clean rebuild) |
| `yarn test:server` | 17 suites, 136 of 136 tests passed |
| `yarn build` | exit 0 |
| `yarn test` (Vitest) | 2 passed |
| `yarn lint`, backend paths only | exit 0 |
| `yarn lint`, whole project | **exit 1** |

The two lint errors are `react-hooks/set-state-in-effect` in `src/components/sessions/SessionDetail.tsx:58` and `SessionList.tsx:38`. That folder is new and untracked, created by the parallel frontend agent; none of my files are involved. The frontend engineer needs to fix those for the full `yarn lint` to pass.

`yarn test:e2e` is still blocked by your `next dev` on port 3000. Nothing is committed.

---

## User (5)

what is the admin credential?

**Agent:**

The demo admin login comes from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env`, which I set to the same dev values as `.env.example`:

- **Email:** `admin@studio.local`
- **Password:** `change-me-admin-2026`

Log in at `/admin/login` once the frontend has built it, or call `POST /api/auth/login` directly. Admin sessions last 12 hours.

To change it, edit those two values in `.env` (the password needs at least 12 characters) and run `yarn create-admin`. That updates the existing admin account in place, and `yarn seed` recreates it from the same values. They're dev-only, so use different values anywhere real.

The demo members (for example `maya@example.com`) share the password `studio-demo-2026`.
