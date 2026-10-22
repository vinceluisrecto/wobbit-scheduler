# Task 2 of 5 — Backend: Admin API

| | |
| --- | --- |
| **Agent** | `backend-engineer` |
| **Source** | [`docs/work-context.md`](../docs/work-context.md) (APPROVED 2026-10-23) |
| **Runs** | After **Phase A** of `tasks/backend-member.md`. It can run in parallel with that task's Phase B. |
| **Sibling tasks** | `tasks/backend-member.md` (the foundation you build on), `tasks/frontend-admin.md` (consumes your API), `tasks/qa.md` |

## Read first

1. [`CLAUDE.md`](../CLAUDE.md) and `.claude/agents/backend-engineer.md`.
2. [`docs/work-context.md`](../docs/work-context.md):
   - **Keep It Simple**
   - §2 Scope (the admin side)
   - §3 Decisions D7, D10, D13, D14, D18 and Q3
   - **§5 Admin endpoints** and admin types
   - **§6 Admin edits**, plus "The one rule behind every seat change" and `promoteFromWaitlist`
3. backend-member's **Phase A announcement**, for the export names and paths.

## What you own

You own the **admin-only API**: everything under `/api/admin/*`, behind `requireAdmin`.
- **Don't build what's already built.** Admins cancel bookings and remove waitlist entries through the *shared* endpoints (`POST /api/bookings/:id/cancel`, `DELETE /api/waitlist/:id`), which backend-member builds with the owner-or-admin check. **Don't add admin copies of those.**

## What you reuse (import; don't re-implement)

| From backend-member | Used for |
| --- | --- |
| `requireAdmin` (`src/middlewares/require-auth.ts`) | protecting the admin router |
| `toSessionSummary`, `toBooking`, `toWaitlistEntry` row mappers | every admin response |
| `promoteFromWaitlist(client, sessionId)` | capacity increases |
| `sendEmail()` + templates **E4**, **E6** | admin-triggered emails |
| Typed errors, the uuid validator, shared types | everything |
| `pool` (`src/db/client.ts`) | queries and transactions |

If something you need is missing or has the wrong shape, **ask backend-member**. Don't edit their files.

## Files you own

| Area | Paths |
| --- | --- |
| Contract types | `src/types/admin/index.ts` (exactly as in §5) |
| Feature | `src/routes/admin/`, `src/controllers/admin/`, `src/services/admin/`, `src/repositories/admin/`, `src/validators/admin/` |
| One-line edit | `src/routes/index.ts`: add the `/admin` mount at the spot backend-member marked |
| Tests | `tests/unit/services/admin/`, `tests/integration/admin-sessions.test.ts`, `tests/integration/admin-payments.test.ts` |

Admin-specific SQL lives in **`src/repositories/admin/`**, in line with CLAUDE.md's feature folders. It covers the session create, update and delete queries, the admin list with counts, the roster by session, the payment update, and the waiting list by session. Shared row mapping and promotion stay in backend-member's repositories.

## Tasks

- [ ] **Phase A (yours):** `src/types/admin/index.ts`, exactly as in §5. Announce it to frontend-admin.
- [ ] **`src/validators/admin/`:** `SessionInput` for create (all fields) and `PATCH` (at least one field), `UpdatePaymentRequest`, and `scope` (`upcoming` / `past`). Reuse the shared uuid validator.
- [ ] **`src/repositories/admin/`:**
  - [ ] `listAdminSessions(scope)`: `upcoming` ascending, `past` descending, with `bookedCount`, `paidCount`, `waitlistCount` and `refundDueCount`, in one query (subqueries or `GROUP BY`, no N+1).
  - [ ] `createSession(input)`.
  - [ ] `getSessionDetail(id)`: the session, its bookings (confirmed first, then cancelled, each by time), and the waiting list by position.
  - [ ] `updateSession(id, input)`: **the §6 guarded update transaction**. When capacity goes up, call `promoteFromWaitlist(client, id)` inside the same transaction. Return the updated session, the promoted bookings, and the confirmed members (for E6).
  - [ ] `deleteSession(id)`: **the §6 guarded delete** (no booking or waitlist rows at all).
  - [ ] `updatePayment(bookingId, status)`: the §6 single `UPDATE` that sets or clears `paid_at`.
- [ ] **`src/services/admin/`:** map the repository results to typed errors:
  - `SESSION_NOT_FOUND`
  - `SESSION_PAST`
  - `CAPACITY_BELOW_BOOKINGS`
  - `SESSION_HAS_BOOKINGS`
  - `BOOKING_NOT_FOUND`
- [ ] **Emails, after commit (D18):**
  - **E6** to every **confirmed** member when an edit changes `title`, `instructor`, `startsAt` or `durationMinutes`. A change to only capacity or price sends **nothing**.
  - **E4** to each member promoted by a capacity increase.
- [ ] **`src/controllers/admin/` + `src/routes/admin/`:**
  - `GET` and `POST` on `/sessions`
  - `GET`, `PATCH` and `DELETE` on `/sessions/:id`
  - `PATCH /bookings/:id/payment`
  - the **whole router** uses `requireAdmin`
- [ ] **Mount** at `/admin` in `src/routes/index.ts` (the one line).

## Tests (Jest)

- [ ] **Unit (mocked repositories and `sendEmail`):** every admin service error path; the E6 trigger rule (which fields cause it); E4 on promotion.
- [ ] **Integration (real PostgreSQL, the test database, `sendEmail` mocked):**
  - **Every admin endpoint:** `401` logged out, `403` as a member.
  - **Create:** `201`, validation failures, a past `startsAt` → `400`; the class appears in the public `GET /api/sessions`.
  - **List:** by scope and order, with correct `bookedCount`, `paidCount`, `waitlistCount` and `refundDueCount` against seeded data.
  - **Detail:** the roster order, cancelled bookings separated, the waiting list in position order.
  - **Edit:**
    - `200`, `SESSION_PAST`, `CAPACITY_BELOW_BOOKINGS`
    - **raising capacity promotes the waitlist in `created_at` order**: the entries become `promoted`, their bookings exist, and `booked_count` is updated
    - E6 sent only for the listed fields, only to confirmed members
  - **Delete:** `204`; `SESSION_HAS_BOOKINGS` when there are confirmed bookings, **only cancelled bookings**, or **only waitlist entries**.
  - **Payment:** `paid` sets `paidAt`, `unpaid` clears it, and `refundDueCount` reflects cancelled + paid.
  - After each mutating test: `booked_count = count(confirmed)` and `booked_count <= capacity`.

## Done when

- `yarn lint`, `yarn test:server`, `yarn build:server` and `yarn build` pass, with **real output** in your report.
- Every `/api/admin/*` endpoint matches §5.

## Do not touch

- backend-member's files: all `src/types/` except `admin/`, migrations, `src/db/`, middlewares, `src/utils/`, email, the auth, sessions, bookings, waitlist and account features
- `src/routes/index.ts` except for the one mount line
- all frontend folders, `tests/e2e/`, QA's concurrency tests
- all config files and `package.json` (you need no new packages)

## Handoffs

| To | What | When |
| --- | --- | --- |
| frontend-admin | `src/types/admin/` published | right away (your Phase A) |
| frontend-admin, QA | Admin endpoints ready, plus your report | done |

Use the completion report format in `.claude/agents/backend-engineer.md`.
