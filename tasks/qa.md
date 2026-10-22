# Task 5 of 5 — QA: Verify All Four Workstreams

| | |
| --- | --- |
| **Agent** | `qa-engineer` |
| **Source** | [`docs/work-context.md`](../docs/work-context.md) (APPROVED 2026-10-23) |
| **Runs** | **Write the test plan now.** Run each section as soon as its workstream reports done (see "When to run" below). Finish with the full regression set. |
| **Verifies** | `tasks/backend-member.md`, `tasks/backend-admin.md`, `tasks/frontend-member.md`, `tasks/frontend-admin.md` |

## Read first

1. [`CLAUDE.md`](../CLAUDE.md) and `.claude/agents/qa-engineer.md`. That file's **Minimum Coverage** table is part of this task.
2. [`docs/work-context.md`](../docs/work-context.md):
   - §1–§3 (problem, scope, decisions)
   - **§4 Design rules**
   - **§5 Contract** (the expected behavior)
   - **§6 Data model and concurrency** (the invariants)
   - §10 Risks
3. Each workstream's completion report: **verify their claims; don't trust them.**

## What you own

You produce independent evidence that:
1. **"If the app says you're booked, you're booked."** Capacity is never exceeded under real concurrency, including during cancellations, waitlist promotion, and admin edits.
2. **"People see straight away if a class is full,"** on a phone.
3. **"I can trust it more than the spreadsheet."** Integrity holds, members see and manage only **their own** data, and the admin area is locked down.
4. Emails go to Mailpit correctly, and the §4 design rules hold.

**Never change business logic, and never change assertions to make tests pass.** Report the defect to its owner instead (the table at the end of this file).

## Files you own

| Path | Type |
| --- | --- |
| `tests/integration/bookings-concurrency.test.ts` | Jest, real PostgreSQL (the test database) |
| `tests/integration/waitlist-concurrency.test.ts` | Jest, real PostgreSQL |
| `tests/integration/admin-concurrency.test.ts` | Jest, real PostgreSQL |
| `tests/e2e/booking.spec.ts`, `waitlist.spec.ts`, `account.spec.ts`, `admin.spec.ts`, `emails.spec.ts`, `responsive.spec.ts` | Playwright |
| Your test plan and reports | in your completion report (or `docs/qa/` if the lead approves) |

`tests/e2e/home.spec.ts` belongs to frontend-member. You run it, but don't edit it.

## When to run what

| When this reports done | Run these sections |
| --- | --- |
| backend-member | A (member concurrency), B (security: auth and member parts), D (persistence and errors), the member emails in E |
| backend-admin | A (admin concurrency), B (admin security), D (admin parts) |
| frontend-member | C (member e2e), the member parts of F (design and responsive), the member emails in E end to end |
| frontend-admin | C (admin e2e), the admin parts of F |
| all four | **G: the full regression set** |

---

## A. Concurrency (real PostgreSQL, the test database; label as **concurrency-real-DB**)

Create N distinct test members and their sessions directly in the database for speed. Mock `sendEmail` in these files.

**`bookings-concurrency.test.ts`** (verifies backend-member)
- [ ] **Final seat:** C=5 with B=4 booked; N=10 different members book at once → exactly **1** `201` and **9** `SESSION_FULL`, no 5xx, `booked_count = 5`.
- [ ] **Empty session:** C=3, N=10 → exactly **3** successes.
- [ ] **Same member:** 5 simultaneous requests → exactly **1** success and the rest `ALREADY_BOOKED`.

**`waitlist-concurrency.test.ts`** (verifies backend-member)
- [ ] **Cancel vs public bookings:** a full class with 1 waiting; the owner cancels while 9 others try to book → **the waiting member always gets the place**, and all 9 get `SESSION_FULL`.
- [ ] **Cancel vs waitlist join:** no free place is ever left open while someone is waiting.
- [ ] **Double cancel:** the owner and an admin cancel the same booking at once (5 requests in total) → exactly **1** `200`, and at most one promotion.
- [ ] **Order:** 3 waiting and 3 simultaneous cancellations → promoted in `created_at` order, with no one promoted twice.

**`admin-concurrency.test.ts`** (verifies backend-admin)
- [ ] **Capacity edit vs bookings:** always `booked_count <= capacity`, and the edit returns `200` or `CAPACITY_BELOW_BOOKINGS`.
- [ ] **Capacity increase vs bookings with a waitlist:** waiting members are promoted before any direct booking succeeds.
- [ ] **Delete vs booking:** exactly one wins, and there are no orphans.

**For every case above:**
- [ ] Repeat it **20 times** and report the outcome counts per run. Keep N ≤ the pool size (10), or report it.
- [ ] After every run, assert:
  - `booked_count = count(confirmed)`
  - `booked_count <= capacity`
  - every `promoted` entry points at a confirmed booking
  - no member holds both a confirmed booking and a waiting entry for the same class

## B. Security and privacy (integration or scripted requests; real output)

- [ ] Every **member** endpoint: `401` when logged out.
- [ ] Every **admin** endpoint: `401` when logged out, `403` as a member.
- [ ] **Member A can't read, cancel, or leave anything belonging to member B.** Each attempt gets `404`, and the data is unchanged (bookings, waitlist, account).
- [ ] Logout invalidates the session. A password reset logs the user out everywhere.
- [ ] Login and forgot-password failures don't reveal whether an email exists.
- [ ] The cookie has `HttpOnly` and `SameSite=Lax`, and `Secure` when `NODE_ENV=production`.
- [ ] Passwords are never stored in plain text.
- [ ] **Signup can't create an admin:** a `role` field in the body is ignored.
- [ ] Reset tokens are single-use and expire after 1 hour.

## C. End-to-end flows (Playwright with seeded data; label as **e2e**)

**`booking.spec.ts`** (frontend-member + backend-member)
- [ ] Logged out, Book → login → back → book → the booking page shows the details and price.
- [ ] The full class shows **Join waitlist**.
- [ ] The 1-spot class booked by two members in parallel contexts: **one** confirmation; the other sees "just filled up", then Join waitlist.
- [ ] The past class → "already started".

**`waitlist.spec.ts`**
- [ ] Join → My bookings shows "#3 in line".
- [ ] The owner of a booking cancels (in another context) → the first waiting member's My bookings shows **"You got a place!"** after focus or reload.
- [ ] Leave the waitlist.

**`account.spec.ts`**
- [ ] The Upcoming and Past tabs show the right items, with payment status.
- [ ] Cancel an upcoming booking → it shows as cancelled "by you". Booking the same class again works.
- [ ] Forgot password → open the reset link from Mailpit → set a new password → log in with it. Using the link a second time fails.

**`admin.spec.ts`** (frontend-admin + backend-admin)
- [ ] The guard: logged out → login; a member account → refused.
- [ ] Today is pinned first.
- [ ] **Expand a row → mark paid → the counts update without leaving the page.**
- [ ] Cancel a paid booking inline → it moves to Cancelled with **Refund due**.
- [ ] Remove a waitlist entry inline.
- [ ] Search finds a class by member name.
- [ ] **"+ New class"** → the new row is highlighted, and it appears on the public `/sessions`.
- [ ] Capacity below bookings shows an error. Raising capacity on the full class promotes the first waiting member.
- [ ] Delete is offered only for the never-booked class.

## D. Persistence, integrity, and API errors

- [ ] Bookings, cancellations, waitlist status, payments, and sessions survive an API restart.
- [ ] `yarn migrate` applies cleanly to an empty database and is a no-op when run again.
- [ ] Every `CHECK` and partial-unique constraint rejects direct bad inserts (count over capacity, a cancelled status without `cancelled_at`, a promoted status without `booking_id`, duplicate confirmed bookings, duplicate waiting entries).
- [ ] There are no orphan bookings or waitlist entries.
- [ ] **API errors:**
  - unknown route
  - invalid JSON
  - wrong types
  - a bad uuid
  - a bad `scope`
  - database down → a 5xx with the §5 shape and **no stack trace**

## E. Emails (real Mailpit at `http://localhost:8025`; `emails.spec.ts`)

Before each test, clear the inbox with `DELETE http://localhost:8025/api/v1/messages`. Read messages with `GET /api/v1/search?query=to:<email>`.

| Check | Owner |
| --- | --- |
| [ ] Sign-up → **E1** | backend-member |
| [ ] Booking → **E2**, with a working `/bookings/[id]` link | backend-member |
| [ ] Joining a waitlist → **E3**, with the correct position | backend-member |
| [ ] Cancel → **E5** to the owner, with the right "you" or "the studio" wording | backend-member |
| [ ] Cancelling a paid booking → **E8** to **every admin** | backend-member |
| [ ] Promotion (by cancel **and** by capacity increase) → **E4**, only to the promoted member | backend-member / backend-admin |
| [ ] An admin changes the time or title → **E6** to every **confirmed** member, and **not** to cancelled or waitlisted ones. A capacity- or price-only change → **no** E6. | backend-admin |
| [ ] Forgot-password → **E7** for a known email, and **nothing** for an unknown one | backend-member |
| [ ] Times in emails match the recipient's sign-up timezone | backend-member |
| [ ] Every link in every email opens the right page | all |
| [ ] **With Mailpit stopped,** booking still returns `201`, and the API logs the email failure | backend-member |

## F. Design and responsive regression (§4; `responsive.spec.ts`, plus Lighthouse; report screenshots and numbers)

- [ ] **Widths 375 / 390 / 768 / 1280** for `/`, `/sessions`, `/sessions/[id]`, `/account`, `/admin/sessions` (collapsed and expanded):
  - no horizontal scroll
  - primary actions visible
  - **tap targets ≥ 44px** (measured with `boundingBox`)
  - the sticky Book bar on mobile
  - admin paid/cancel visible on mobile cards
- [ ] **Reduced motion** (emulated `prefers-reduced-motion: reduce`): no transform animations, all content visible, all actions work.
- [ ] **JavaScript disabled:** landing content is fully visible.
- [ ] **Lighthouse mobile** on `/` and `/sessions`: **LCP < 2.5s** and **CLS < 0.1**. Report the real values and scores.
- [ ] **anime.js:** report the size it adds to the landing JS, and confirm it's **absent from `/admin` bundles**.
- [ ] **Admin click counts from `/admin`:** "mark paid" ≤ 2 and "cancel a booking" ≤ 3. Report the actual counts.
- [ ] **Landing regression:** the hero and CTA work, there are no `/admin` links on public pages, and `home.spec.ts` passes.

## G. Full regression set (after all four report done)

```bash
yarn lint
yarn test            # Vitest: unit/component (mocked)
yarn test:server     # Jest: unit (mocked) + integration (real DB) + concurrency (real DB)
yarn build
yarn build:server
yarn test:e2e        # Playwright: needs Mailpit running; the D4 config starts the API + Next and seeds
```

- [ ] Label every result by type: **unit-mocked / component-mocked / integration-real-DB / concurrency-real-DB / e2e / manual**.
- [ ] Anything you couldn't run → **"not run"**, with the reason. Never report it as passed.

## Where defects go

| Area | Owner task |
| --- | --- |
| Schema, auth, email, seed, member endpoints, booking, cancel, waitlist, promotion | `tasks/backend-member.md` |
| `/api/admin/*`: create, edit, delete, list counts, payment, E6 | `tasks/backend-admin.md` |
| Landing, auth pages, timetable, class page, booking page, account, `ui/` kit, motion | `tasks/frontend-member.md` |
| Admin login, guard, schedule, inline roster, search, `SessionForm` | `tasks/frontend-admin.md` |
| An unclear or contradictory contract | the lead |

## Done when

You deliver a report in your agent definition's format containing:
- the test plan mapped to the sections above
- real output for every section
- concurrency numbers per run
- security, privacy and email results
- design evidence (screenshots, Lighthouse numbers, click counts)
- defects with reproduction steps sent to their owners

**"Pass" counts only with pasted output.**

## Do not touch

- any `src/` file
- other agents' tests (including `home.spec.ts`)
- config files

Don't change assertions to make tests pass.
