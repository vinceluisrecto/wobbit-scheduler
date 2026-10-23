# Studio Spot

A class-booking web app for a small community studio that used to take bookings over Instagram DMs and a spreadsheet.

- **Members** can browse the public timetable and see spots left. They sign up and book a place with one tap, or join the waitlist when a class is full. They can cancel, and they see all their bookings, payments and waitlist positions under **My bookings**.
- **Admins** (the owner and staff) use the same login with an `admin` role. They manage the schedule, see each class's roster and waitlist, cancel bookings, and mark bookings paid.

**The main guarantee:** if the app says you're booked, you're booked. Every change to who holds a seat runs in one PostgreSQL transaction that locks the class row first, and a `CHECK` constraint backs it up. That covers booking, cancelling, waitlist promotion and capacity edits. When a place frees up, the first member on the waitlist is promoted inside that same transaction, so nobody else can take the place first.

**Stack:** Next.js 16 (App Router, React 19, Tailwind v4, anime.js) · Express 5 · PostgreSQL (`pg`, no ORM) · cookie sessions stored server-side · nodemailer → Mailpit · Vitest, Jest + Supertest, Playwright. One folder, one `package.json`.

## Prerequisites

Node 24, Yarn 1, PostgreSQL 17, and [Mailpit](https://mailpit.axllent.org/) for local email (`brew install mailpit`).

## Setup

```bash
yarn install
cp .env.example .env                 # dev-only defaults; ADMIN_PASSWORD needs 12+ characters
createdb studio_spot                 # dev database
createdb studio_spot_test            # Jest wipes this one between tests
yarn migrate
yarn seed                            # demo members, classes, bookings, and the admin
yarn playwright install chromium     # only for e2e
```

`yarn create-admin` creates or updates the admin from `ADMIN_*` in `.env`. It never deletes anything, and `yarn seed` already calls it.

## Run

```bash
mailpit             # inbox at http://localhost:8025
yarn dev:server     # API on SERVER_PORT (default 4000)
yarn dev            # app on http://localhost:3000 (forwards /api/* to API_URL)
```

**Demo logins (dev only):**

| Who | Where | Email | Password |
| --- | --- | --- | --- |
| Member | `/login` | `maya@example.com` (also `leo@`, `ava@`, ...) | `studio-demo-2026` |
| Admin | `/admin/login` | `admin@studio.local` | `ADMIN_PASSWORD` from `.env` |

Seeded class times are relative to when you ran the seed, so run `yarn seed` again before a demo.

## Test

```bash
yarn lint
yarn test                            # Vitest: frontend unit tests
yarn test:server                     # Jest: backend unit + integration tests, including concurrency
yarn test:server concurrency         # only the booking, waitlist and admin race tests
yarn test:e2e                        # Playwright on port 3100; seeds the DB and starts both servers
```

Builds for production: `yarn build` / `yarn start` for the app, and `yarn build:server` / `yarn start:server` for the API.

## Assumptions and what's left out (v1)

- **Payments are tracked by hand.** Classes are priced in USD, members pay at the studio, and admins mark bookings paid. A cancelled paid booking shows "Refund due", and the refund happens outside the app.
- **Email goes only to Mailpit.** It's sent after the transaction commits, without retries. If sending fails, the booking still stands. To go live, you only change the `SMTP_*` env vars.
- **Classes can't be booked, cancelled or edited after they start.** Cancelling is allowed any time before the start, with no cutoff.
- **Times are shown in the viewer's device timezone.**
- **Not built:** email verification, rate limiting, 2FA, social login, online payments, reminders/SMS, recurring classes, cancelling a whole class, and a members admin page.

The full v1 plan (scope, API contract, data model, concurrency design) is in [`docs/work-context.md`](docs/work-context.md). The client brief is in [`docs/context.md`](docs/context.md).
