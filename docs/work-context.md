# Work Context — Studio Class Booking (v1)

> **Status: APPROVED (2026-10-23). Ready to start.** The lead approved the scope, the decisions in [§3](#3-decisions-approved), the design direction in [§4](#4-design-and-ux-direction), and the answers below. Agents start in the order given in §8. Any change to an approved decision needs the lead's sign-off first.

### Resolved questions

| # | Question | Answer (approved) |
| --- | --- | --- |
| Q1 | Email verification on sign-up? | **No verification in v1.** Members can sign up and book immediately, which matters during the evening rush. |
| Q2 | How to send email? | **`nodemailer`** over SMTP to Mailpit. Production later only changes the env vars. |
| Q3 | Which emails do admins receive? | **E8 "Refund due" only.** |
>
> Source brief: [`docs/context.md`](context.md). Standards: [`CLAUDE.md`](../CLAUDE.md). Agent definitions: [`.claude/agents/`](../.claude/agents/). Task files: [`tasks/`](../tasks/).
>
> Paths written in `code` are relative to the **repository root** (for example `src/app/layout.tsx`, `tasks/qa.md`).

## How Agents Use This File

1. Read `CLAUDE.md`, then your own definition in `.claude/agents/<your-role>.md`.
2. Read **Keep It Simple** below, then §1 to §7 of this file (problem, scope, decisions, design, contract, data model, folder map). They apply to everyone.
3. Open **your task file in `tasks/`** (see §8; documentation stays in §8.4) and work only on the tasks listed there, in the files listed there.
4. If a task needs a file outside your section, or something here seems to conflict, stop and ask.

| Role ID (agent `name`) | Task file |
| --- | --- |
| `backend-engineer` | [`tasks/backend-member.md`](../tasks/backend-member.md) (first), then [`tasks/backend-admin.md`](../tasks/backend-admin.md) |
| `frontend-engineer` | [`tasks/frontend-member.md`](../tasks/frontend-member.md), then [`tasks/frontend-admin.md`](../tasks/frontend-admin.md) |
| `qa-engineer` | [`tasks/qa.md`](../tasks/qa.md) |
| `documentation-engineer` | [§8.4 Documentation](#84-documentation-engineer) |

---

## Keep It Simple (applies to every role)

**Don't overcomplicate things.** Build the straightest path that does the job, and stop there. Every feature is just the steps it needs. No further action is needed unless a task in §8 asks for it.

### Frontend: one user action is four steps

Example: a logged-in member clicks **Book**, and the app shows the booking details.

```
1. Component  → <Button> renders and receives an onClick
2. Handler    → handleBook() decides what happens on click
3. Fetch      → only if needed: set loading = true FIRST (the user sees it's loading),
                call src/api/<feature>/, then set loading = false
4. Result     → redirect (router.push) or show the result / error
```

That's it.

```tsx
// Shape to follow. No more layers than this.
const [isLoading, setIsLoading] = useState(false);

async function handleBook() {
  setIsLoading(true);
  try {
    const { booking } = await createBooking(sessionId);
    router.push(`/bookings/${booking.id}`);
  } catch (error) {
    setError(error);
  } finally {
    setIsLoading(false);
  }
}

<Button onClick={handleBook} disabled={isLoading}>{isLoading ? 'Booking…' : 'Book'}</Button>
```

This is the real v1 booking flow. The member is logged in, so there's no form: one tap books (`tasks/frontend-member.md`). Every other action follows the same shape:
- **Join waitlist:** button → handler → loading → `POST` → redirect to `/account`.
- **Cancel booking:** button → inline confirm → handler → loading → `POST` → show the updated list.
- **Mark paid (admin):** button → handler → loading → `PATCH` → show the updated row.

### Backend: one request is four steps

```
1. Route       → maps the URL to a controller (passing through requireAuth / requireAdmin when needed)
2. Controller  → validates input, calls the service, sends the response
3. Service     → applies the business rule (full? past? duplicate? owner? capacity below bookings?)
4. Repository  → runs the SQL (in one transaction when seats change) and returns the rows
```

That's it.

### Rules

- **Don't add things nobody asked for:**
  - no global state library, context provider, or event bus
  - no generic base classes, generic repositories, factories, or dependency-injection containers
  - no job queues or background workers
  - no retry or caching layers, or optimistic updates
- **Animations only where §4 asks for them,** and built the way §4 says: CSS for micro-interactions, and **anime.js** only for the member-side effects listed in §4.1.
- **Emails are sent after the transaction commits.** There's no queue, outbox, or retry job (§6, Email flow). A failed email is logged and never undoes a booking.
- **No abstraction for a single use.** Write it inline first. Extract a function, hook, or component only when a second real caller needs it. Examples with two real callers each:
  - `promoteFromWaitlist()` is used by cancellation and by raising capacity
  - `SessionForm` is used by the admin create and edit pages
  - `Reveal` is used by every landing section
  - `sendEmail()` is used by every notification
- **One endpoint per action, with authorization inside it.** Members and admins cancel through the *same* endpoint, and the service checks "owner or admin". Don't write a second copy for admins.
- **One file does one thing,** in the folder `CLAUDE.md` says. Don't split a 20-line function across three files.
- **Readable over clever.** Use plain `if` statements, early returns, and named functions.
- **If a §8 task looks like it needs more than these four steps,** ask the lead before building it.
- **This rule never overrides correctness or security.** These are required, not extras:
  - the capacity-safe transactions (§6)
  - server-side validation
  - authentication and ownership checks
  - error handling

---

## 1. The Problem

A small community studio takes class bookings over Instagram DMs and a shared spreadsheet. Classes get overbooked, people turn up to sessions that already happened, and the owner spends Sunday nights reconciling. When the week's timetable opens, evening classes fill **within minutes, mostly from phones**.

### Two kinds of user, one login system

| User | Login | What they do |
| --- | --- | --- |
| **Member** (the person booking) | **Sign up / log in** (name, email, password) | Browses the timetable (no login needed). **Logs in to book** a place, or to join the **waitlist** when a class is full. Sees **My bookings** (upcoming and past), booking status (confirmed or cancelled), payment status, and waitlist position (or "You got a place!"). **Cancels** their own upcoming booking and **leaves** a waitlist. |
| **Admin** (the studio owner or staff) | **Same login, `admin` role** (accounts are created by script only) | Creates and edits the class schedule, sees each class's roster and waitlist, **cancels bookings**, removes waitlist entries, and tracks who has paid. |

### What the owner needs, and what each need means for us

| Owner's words | Requirement | How v1 meets it |
| --- | --- | --- |
| "If the app says you're booked, you're booked. I can't have two people in one spot." | Capacity can never be exceeded: not under simultaneous bookings, not during cancellations, not during waitlist promotion, and not during admin edits. | Every seat change is one PostgreSQL transaction that holds the session's row lock, backed by a `CHECK` constraint. The app shows "booked" only after a `201`. The member's account always shows the true status. |
| "People should be able to see straight away if a class is full." | Spots left are visible on the timetable. Full classes are obvious, can't be booked, and offer the waitlist instead. | `spotsLeft`/`isFull`, a "Full" badge, "Join waitlist", a refresh when the window regains focus, and a clear message when a booking loses the race. |
| "I need to trust it more than I trust the spreadsheet." | The database enforces integrity. Every booking belongs to a real account. The owner sees the real roster, waitlist, cancellations, and payments. | Constraints and server-side rules. Cancellations are kept as history. The admin roster replaces the spreadsheet. Members can check and manage their own bookings, so they stop DMing the studio. |

## 2. v1 Scope

### In scope: member side

- **Accounts:**
  - Sign up with name, email, and a password of at least 8 characters.
  - Log in and log out.
  - The session lasts 30 days, so members stay logged in on their phone.
  - **Forgot password:** an emailed reset link (D16). There's no email verification in v1 (Q1).
- **Timetable (public, no login):** upcoming sessions (title, instructor, date/time, duration, price in USD, spots left, full or not). Past sessions are hidden.
- **Booking (login required):** **one tap** books a place for the logged-in member, then redirects to `/bookings/[id]`.
  - A logged-out member who taps Book is sent to `/login?next=/sessions/[id]`, then straight back.
- **Server-enforced booking rules:**
  - The session must exist.
  - The session must not have started.
  - The session must have a free place.
  - A member can hold only one confirmed booking per session.
- **Waitlist (login required, full classes only):**
  - One tap joins. Members see their position in **My bookings**.
  - When a place frees up (a cancellation, or capacity raised), the first member in line is **booked automatically** in the same transaction (D14). Their account then shows "You got a place!".
- **My bookings (`/account`):**
  - **Upcoming:** bookings and waitlist entries.
  - **Past:** classes the member attended or booked.
  - Each item shows the class details, booking status (confirmed or cancelled, and who cancelled it), payment status (paid or unpaid, with "Pay at the studio"), and the waitlist position or result.
- **Cancel my booking:** the member can cancel before the class starts. The place goes straight to the waitlist (D15).
- **Leave a waitlist:** the member can remove their own waiting entry.
- **Landing page:** an aesthetic, animated, uncluttered first impression (§4) that leads to the timetable.
- **Mobile-first everywhere** (§4).

### In scope: emails (D18, sent to **Mailpit** locally)

Every email goes to **Mailpit**, whatever the recipient (member or admin). View them all at **http://localhost:8025**. There's no real delivery in v1.

| # | Email | To | Sent when |
| --- | --- | --- | --- |
| E1 | Welcome | member | sign-up succeeds |
| E2 | Booking confirmed | member | a booking is created (direct booking) |
| E3 | You're on the waitlist (#N) | member | they join a waitlist |
| E4 | **You got a place!** | member | they're promoted from the waitlist (cancellation or capacity increase) |
| E5 | Booking cancelled | member | their booking is cancelled. Different copy for "you cancelled" and "the studio cancelled". |
| E6 | Class details changed | every confirmed member of that class | an admin changes the title, instructor, time, or duration of an upcoming class |
| E7 | Password reset link | member or admin | forgot-password is requested for an existing account |
| E8 | Refund due | **all admins** | a **paid** booking is cancelled (by the member or an admin) |

**What each email contains:**
- a plain-text body plus simple HTML
- the class name
- the class time, in the **recipient's timezone**. The browser sends its timezone at sign-up, and it's stored as `users.time_zone`, so emails match what the member sees on screen.
- a link to the relevant page (`/bookings/[id]`, `/account`, or `/reset-password?token=…`)

### In scope: admin side

- **Login:** at `/admin/login`, with the same auth endpoints. Non-admin accounts are refused. Every `/api/admin/*` endpoint requires the `admin` role.
- **Schedule:** classes (upcoming / past), each showing date/time, title, instructor, booked/capacity, waitlist count, and paid count.
- **Create, edit, delete classes** (D13):
  - Capacity can't go below current bookings.
  - Past classes can't be edited.
  - Raising capacity books from the waitlist automatically.
  - Delete is allowed only if the class never had bookings or waitlist entries.
- **Class details:**
  - Class info.
  - The **roster**: name, email, booked at, payment.
  - The **waitlist**, in order.
  - **Cancelled bookings**, with "Refund due" when they were paid.
- **Actions:**
  - cancel any upcoming booking
  - remove any waitlist entry
  - mark paid or unpaid
- **Admin accounts** are created only with `yarn create-admin` (D11).

### Also in scope

- **Deterministic seed data:** demo members, sessions in every state, bookings with mixed payment, cancelled bookings, a full class with a waitlist, and a demo admin.

### Out of scope (and documented as such)

| Left out | Why / workaround |
| --- | --- |
| Real email delivery (SendGrid, SES, etc.) | v1 runs locally, and every email lands in Mailpit. Going live means changing only the SMTP env vars (D18). |
| SMS notifications, email reminders before class | Not needed for v1. Reminders would need a scheduler (Keep It Simple). |
| Social login (Google, Apple), "remember me" options | Email + password covers v1. |
| Online payments and automated refunds | Payment is tracked manually (D10). A cancelled paid booking shows "Refund due", and the admin refunds outside the app. |
| A cancellation cutoff (e.g. "no cancelling within 2 hours") | A member can cancel any time before the start. A cutoff is easy to add later (D7). |
| Admin user management (listing or editing member accounts) | The roster shows the members per class. A members page is a v2 candidate. |
| Cancelling a whole class, recurring classes | Admins edit or delete each class individually. |
| Multiple admin roles, 2FA, rate limiting, bot protection | A known limitation, documented. |

## 3. Decisions (Approved)

| # | Decision | Approved choice | Affects |
| --- | --- | --- | --- |
| D1 | How the frontend reaches the API | **A Next.js rewrite** in `next.config.ts`: `/api/:path*` → `${API_URL}/api/:path*`. Same origin, so the auth cookie just works. Adds a new **`API_URL`** env var (default `http://localhost:4000`). | shared config, `.env.example` |
| D2 | Seed mechanism | **`src/db/seed.ts`** plus a **`yarn seed`** script. It truncates and re-inserts fixed-UUID data with times relative to `now()`. Demo members share one dev-only password, a constant in `seed.ts` that's printed when the seed runs. The demo admin comes from D11. Dev and test only. | `package.json` |
| D3 | Test database | **A separate `wobbit_exam_test` database.** Jest uses `TEST_DATABASE_URL` when set. | `jest.config.mjs`, `.env.example` |
| D4 | e2e setup | **`playwright.config.ts` `webServer`** starts the API and Next, and runs `yarn seed` first. | `playwright.config.ts` |
| D5 | Error response shape | **`{ "error": { "code", "message", "details"? } }`**. The existing 404 test is updated to match. | error handler, `health.test.ts` |
| D6 | Timezone and currency | **Timezone:** times are shown in the **viewer's device timezone**: `Intl.DateTimeFormat` with no `timeZone` option, and `datetime-local` for admin input. Nothing is hard-coded. (This machine is currently `Asia/Manila`.) Times are stored as `timestamptz` in UTC.<br>**Currency:** **USD**. `STUDIO_CURRENCY = 'USD'` in `src/constants/studio.ts`, formatted with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. | frontend |
| D7 | Past-session rule | **Once `starts_at <= now()`**, nobody can book, join the waitlist, cancel, or edit (the database clock decides). | backend |
| D8 | e2e ownership | **`qa-engineer`** owns `tests/e2e/{booking,waitlist,account,admin}.spec.ts`. **`frontend-engineer`** owns `tests/e2e/home.spec.ts` (the landing page). | QA, frontend |
| D9 | Backend utility unit tests | Test `src/utils/errors.ts` and `src/utils/password.ts` through service, middleware, and integration tests. No config change. | — |
| D10 | Payments | **Manual tracking:**<br>• `price_cents` on each class<br>• `payment_status` plus `paid_at` on each booking<br>• admins toggle it<br>• members see "Pay at the studio" and their payment status<br>• a cancelled paid booking shows "Refund due"<br>No payment provider. | backend, frontend, schema |
| D11 | Admin accounts | **`yarn create-admin`** runs `src/db/create-admin.ts`. It reads **`ADMIN_NAME`**, **`ADMIN_EMAIL`** and **`ADMIN_PASSWORD`** (at least 12 characters) and creates or updates that user with `role = 'admin'`. It never deletes anything. The seed reuses it. | `package.json`, `.env.example` |
| D12 | Authentication (members **and** admins) | **One `users` table with a `role` (`member` / `admin`), plus server-side sessions in PostgreSQL and an `httpOnly` cookie:**<br>• `crypto.scrypt` password hashes<br>• a random 32-byte token, stored only as a SHA-256 hash<br>• cookie `session`: `HttpOnly`, `SameSite=Lax`, `Secure` in production<br>• expiry: **30 days for members, 12 hours for admins**<br>**No new packages.** | backend, schema |
| D13 | Admin class edits | **Create:** the start must be in the future.<br>**Edit:** only before the start, and capacity ≥ confirmed bookings. Raising capacity runs automatic promotion.<br>**Delete:** only if the class has no booking or waitlist rows at all.<br>Edits don't notify members. | backend |
| D14 | Waitlist | **Joining:**<br>• full classes only (`SESSION_NOT_FULL` otherwise)<br>• one waiting entry per member per class, and not while that member is booked<br>• first-come, first-served<br>**Automatic promotion** runs inside the same transaction that frees the place, so a stranger can't take it first.<br>Members see their position and the result in **My bookings**. | backend, frontend, schema |
| D15 | Cancellation | **The member who owns the booking, or an admin,** can cancel, through **one endpoint**.<br>**Soft cancel:** `status = 'cancelled'`, plus `cancelled_at` and `cancelled_by` (`member` / `admin`). The row is never deleted, and payment status is kept.<br>**Before the start only.** The freed place runs automatic promotion (D14). A member who cancelled may book again if there's a place. | backend, frontend, schema |
| D16 | Member accounts | **Login is required to book and to join a waitlist.** The timetable stays public. Sign-up asks for name, email, and a password of at least 8 characters. Emails are unique and case-insensitive.<br>**Password reset by email (E7):**<br>• a random token, stored only as a SHA-256 hash, valid for **1 hour** and **single use**<br>• a successful reset logs that user out everywhere (all of their sessions are deleted)<br>• forgot-password always returns `204`, whether or not the email exists<br>**No email verification in v1** (Q1). | backend, frontend, schema |
| D17 | Design approach | **The member side is aesthetic first, with motion (§4). The admin side is UX first: dense, fast, few clicks. Mobile-first everywhere.** Motion is split:<br>• **anime.js v4** (`animejs`, approved) for the member-side signature effects: hero entrance, staggered lists, scroll reveals (its `onScroll`), and the success check-mark draw (its SVG drawable)<br>• **CSS** for hover/press micro-interactions and the "filling fast" pulse<br>• React's built-in **`<ViewTransition>`** for page transitions<br>**No anime.js on the admin side.** Always respect `prefers-reduced-motion`. | frontend, `package.json` |
| D18 | Email | **Mailpit locally**, with every email going to it (SMTP `localhost:1025`, inbox UI `http://localhost:8025`; v1.30.4 is installed and running on this machine).<br>**Sending:** with **`nodemailer`** (Q2) through one `sendEmail()`. Templates are plain TypeScript functions in one file, with no templating library.<br>**When:** **after the transaction commits**, not awaited, with `.catch()` logging the failure. An email failure never fails or rolls back the request. No queue or outbox in v1.<br>**New env vars:** `SMTP_HOST` (`localhost`), `SMTP_PORT` (`1025`), `MAIL_FROM` (`"Studio <no-reply@studio.local>"`), and `APP_URL` (`http://localhost:3000`, for links in emails). | backend, `package.json`, `.env.example` |

## 4. Design and UX Direction

> The frontend-engineer owns this section's implementation. QA checks it in the regression pass, and docs describes it. The research summary is at the end of this section.

### 4.1 Member side: "beautiful and fun, but never in the way"

The goal: members open the site to book, but they **enjoy being there**. It feels like the studio's vibe (calm, energetic, friendly), not a form.

**Look**
- **Few words, big type.**
  - Every section has one short headline and at most one supporting sentence.
  - No paragraphs longer than two lines on mobile.
  - Let whitespace do the work.
- **A bold, warm palette.**
  - One primary brand color plus one accent, defined as tokens in the `@theme` block of `globals.css` (CLAUDE.md).
  - Soft gradients or blurred color "blobs" behind the hero.
  - Rounded cards (`rounded-3xl`), gentle shadows.
- **Typography:**
  - one display font for headlines and one clean sans for text, loaded with **`next/font`** (built into Next, so no package)
  - fluid sizes with `clamp()`
- **Imagery:** optional class or studio images, or illustrated shapes. Use `next/image` with set dimensions so nothing jumps around as images load.
- **Every state gets designed,** including empty, loading, error, and "Full". Loading uses **skeletons** that match the final layout, not spinners in empty space.

**Motion (what to build)**

| Where | Animation | How |
| --- | --- | --- |
| Hero (landing) | **One signature entrance:** the headline words rise and fade in with a short stagger, the background blobs drift slowly, and the CTA does a soft pulse once. | **anime.js** `animate()` plus `stagger()` on `transform`/`opacity`. The background drift is a looping CSS keyframe. Total ≤ 1.2s. |
| Landing sections | **Reveal on scroll:** each section fades and slides up 16–24px as it enters the viewport. | One shared `Reveal` client component using **anime.js `onScroll`** (works in every browser, including Firefox). **Content renders visible in the HTML.** Only after JavaScript runs, and only when motion is allowed, does `Reveal` set the start state and animate. No JavaScript means no hidden content. |
| Class cards | **Hover/press feedback:** lift (`translateY(-2px)`) plus a stronger shadow on hover, `scale(0.98)` on press (`:active`), and a 150–200ms ease-out. | Tailwind `transition`, `hover:`, `active:` utilities. |
| Spots badge | **"Filling fast" when ≤ 3 spots are left:** a subtle pulse dot. "Full" is a solid, calm badge with no pulse. | A CSS keyframe on a small dot only. |
| Book / Join waitlist button | **Loading state inside the button:** the label becomes "Booking…" with a small inline spinner. The width stays the same, so the layout doesn't jump. | CSS, plus the `isLoading` state from the Keep It Simple flow. |
| Booking success (`/bookings/[id]`), and "You got a place!" in My bookings | **A celebratory moment:** a check mark draws in and the details card rises in. | **anime.js** `createDrawable()` for the SVG stroke, plus `animate()` for the card. No confetti library. |
| Page navigation | **Smooth crossfade between pages**, and the class card **morphs** into the class-detail header. | React's `<ViewTransition>` (React 19.3, which Next 16.4 includes; it works in the App Router with no config, per `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). Without browser support, it navigates normally. |
| Lists (timetable, My bookings) | Items fade in with a short stagger on first load (≤ 300ms total). | **anime.js** `stagger()`, capped. |

**anime.js usage rules**
- Import only the functions you use (`import { animate, stagger, onScroll, createDrawable } from 'animejs'`), so the bundle includes only those modules.
- Use it only in `'use client'` components, inside `useEffect`, and **revert/cancel animations in the cleanup** (on unmount and on route change).
- Don't import it in server components, admin components, or shared `ui/` pieces other than `Reveal`.
- Under `prefers-reduced-motion: reduce`, skip the anime.js call entirely, and leave elements at their final visible state.

**Motion rules (non-negotiable)**
- **Only animate `transform` and `opacity`.** Never `width`, `height`, `top`, `left`, `margin`, or anything else that causes layout. Keep `blur`/`filter` small and static.
- **Durations:** micro-interactions 150–250ms, entrances 300–600ms, and the hero sequence ≤ 1.2s. Use **ease-out** curves (for example `cubic-bezier(0.22, 1, 0.36, 1)`), with no bounce or elastic easing.
- **`prefers-reduced-motion: reduce`:**
  - Turn off movement: no translate, scale, or drift.
  - Keep short opacity fades at most.
  - One global rule in `globals.css`, plus per-component checks where needed.
  - Functional feedback (loading, focus) must still be visible.
- **Motion never blocks an action.** The Book button is tappable immediately, and no animation delays content the user needs.
- **Performance budget on a mid-range phone:**
  - the timetable is usable (LCP) in under 2.5 seconds
  - no layout shift from images or fonts (CLS < 0.1)
  - animations stay smooth, with no dropped frames during scroll
  - check with Chrome DevTools' Lighthouse mobile run, and report the numbers

**Member pages: what to keep simple**
- **Landing `/`:**
  - Hero: headline, one sentence, a primary CTA "See classes" → `/sessions`.
  - A short "How it works": 3 steps, icons with a few words each.
  - A "This week" preview of 3–4 upcoming classes, reusing `SessionCard`.
  - A closing CTA.
  - That's all. No admin links.
- **Timetable `/sessions`:** cards in one column on mobile and 2–3 columns on desktop. Each card shows the time first (largest), then the title, instructor, price, and spots badge. The whole card is a big tap target.
- **Class page `/sessions/[id]`:** a hero header for the class (it morphs from its card), the key facts, and **one large primary action button**:
  - **Book**
  - **Join waitlist**
  - **Log in to book**
  - **You're booked ✓**: links to the booking. This state is known from the `ALREADY_BOOKED` response or from My bookings.
  - **Already started**

  It's a sticky bottom bar on mobile.
- **My bookings `/account`:** tabs for **Upcoming** and **Past**. Waitlist entries appear in Upcoming with "You're #N in line". Cancel is an inline confirm, never a browser `confirm()`.

### 4.2 Admin side: "find it fast, act in one click"

The goal: the owner opens the admin area and **sees what matters without hunting**. **UX first, aesthetics second.** It's clean and consistent, with no decorative animation.

- **The landing page *is* the schedule.** `/admin` goes straight to upcoming classes. There's no separate dashboard click.
- **Today first:** the schedule is grouped into **Today** (pinned at the top), then the coming days, then a **Past** tab.
- **Every row shows what's needed at a glance,** with no clicks:
  - time, title, instructor
  - **booked/capacity** with a small progress bar
  - **waitlist count**
  - **paid count**
  - a **"⚠ Unpaid"** or **"Refund due"** marker when relevant
- **A class row expands in place** to show its roster: the row toggles open inline, with no page change. Each roster line has **one-click** actions:
  - **Mark paid / unpaid:** a single toggle button. No confirm needed, because it's easy to undo.
  - **Cancel booking:** the only destructive action, so it uses an inline "Confirm?" second click.
  - **Waitlist** shows directly under the roster, with **Remove** (inline confirm).
  - The full class page (`/admin/sessions/[id]`) still exists for deep links and editing. The expanded row is the fast path.
- **A search/filter box** at the top filters the loaded schedule by class title, instructor, or member name/email, instantly and client-side.
- **Create a class** with a **"+ New class"** button that's always visible in the header. It opens the form in place (a slide-over panel on desktop, a full screen on mobile). After saving, the new class is highlighted in the list.
- **Keyboard and speed:**
  - Forms submit on Enter.
  - Sensible defaults: duration 60, capacity copied from the last class created.
  - Focus lands on the first field.
- **Feedback:**
  - Every action shows inline success or error text next to the thing that changed. Use a small toast only for "Saved".
  - Optimistic UI is not allowed (Keep It Simple + correctness), so show a brief loading state on the button instead.
- **Mobile admin:**
  - Rows become cards, and the primary actions stay visible (no hidden overflow menus for paid/cancel).
  - Use sticky headers.
  - Touch targets are at least 44px.
- **Style:**
  - a neutral palette with the brand color only for primary actions
  - status colors used consistently: green = paid/confirmed, amber = unpaid/waitlist, red = cancelled/refund due
  - only functional transitions: row expand (`grid-template-rows` 0fr→1fr is fine here because it's a functional disclosure), button states, and hover
  - support for `prefers-reduced-motion`

### 4.3 Responsive and accessibility (both sides)

- **Mobile-first CSS:** design at **375px** first, then `sm` / `md` / `lg` breakpoints.
  - Test at 375 × 667 (small phone), 390 × 844 (modern phone), 768 (tablet), and 1280+ (desktop).
  - No horizontal scrolling at any width.
- **Thumb-friendly:**
  - Primary actions are within thumb reach (sticky bottom bars on mobile for Book or Join waitlist).
  - Tap targets are at least 44×44px, with at least 8px between them.
  - Inputs use the correct mobile keyboard (`type="email"`, `inputMode`, `autoComplete`).
- **Accessibility:**
  - WCAG AA contrast, including text over gradients.
  - A visible focus ring on everything interactive, and logical tab order.
  - Labeled inputs, with errors linked via `aria-describedby`.
  - Status changes announced (`role="status"` / `aria-live`).
  - Animations respect `prefers-reduced-motion`.
- **Dark mode:** out of scope for v1. Keep the colors in tokens so it can be added later.

### 4.4 Research summary (why these choices)

- **CSS scroll-driven animations (`animation-timeline: view()`)** aren't enabled by default in Firefox yet. That's why scroll reveals use **anime.js `onScroll`** instead: it works in every browser. ([ICS MEDIA guide](https://ics.media/en/entry/230718/), [Mozilla Connect thread](https://connect.mozilla.org/t5/ideas/implement-css-scroll-driven-animations-animation-timeline/idc-p/116613), [Chrome blog: scroll-triggered animations](https://developer.chrome.com/blog/scroll-triggered-animations))
- **anime.js v4** (`animejs@4.5.0`, the current version) is modular: you import individual functions, so only what's used is bundled. It covers everything §4.1 needs (`animate`, `stagger`, `onScroll`, `createDrawable`). The lead chose it as the lightweight option.
- **Page transitions:**
  - The local Next.js 16.4.2 docs say `<ViewTransition>` works in the App Router **with no configuration**, and that browsers without support simply don't animate.
  - Older public docs for 16.2.x describe an `experimental.viewTransition` flag. **Follow the installed version's docs**, as `AGENTS.md` instructs.
  - ([Next.js view transitions guide](https://nextjs.org/docs/app/guides/view-transitions), [viewTransition config, older versions](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition))
- **Motion best practice:** animate only `transform`/`opacity`, keep feedback under about 500ms, avoid bounce/elastic easing, prefer **one signature hero animation** over many scattered effects, and treat `prefers-reduced-motion` as mandatory. ([Impeccable "animate" guidance](https://www.skills.sh/pbakaus/impeccable/animate), [motion-design reference](https://cdn.jsdelivr.net/npm/@nqlib/nqui@0.6.3/docs/nqui-skills/impeccable/reference/motion-design.md))
- **anime.js only, no other animation library** (no Motion or GSAP). Hover and press effects stay in CSS, which is cheaper and needs no JavaScript. Page transitions stay with React's built-in `ViewTransition`.

## 5. API Contract

Base path `/api`. JSON only. Field names are camelCase. Times are ISO-8601 UTC strings. Money is in integer **cents (USD)**. The auth cookie is `session` (D12).

### Types (owned by backend-engineer, imported by frontend)

```ts
// src/types/shared/index.ts
export type ApiErrorCode =
  | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'INVALID_RESET_TOKEN'
  | 'SESSION_NOT_FOUND' | 'SESSION_FULL' | 'SESSION_PAST' | 'SESSION_NOT_FULL'
  | 'ALREADY_BOOKED' | 'ALREADY_WAITLISTED' | 'BOOKING_NOT_FOUND' | 'BOOKING_ALREADY_CANCELLED'
  | 'WAITLIST_ENTRY_NOT_FOUND' | 'CAPACITY_BELOW_BOOKINGS' | 'SESSION_HAS_BOOKINGS';
export interface ApiErrorResponse { error: { code: ApiErrorCode; message: string; details?: Record<string, string> } }

// src/types/auth/index.ts
export type UserRole = 'member' | 'admin';
export interface User { id: string; name: string; email: string; role: UserRole }
export interface SignupRequest { name: string; email: string; password: string; timeZone?: string } // IANA zone from the browser; used to format email times
export interface LoginRequest { email: string; password: string }
export interface ForgotPasswordRequest { email: string }
export interface ResetPasswordRequest { token: string; password: string }
export interface UserResponse { user: User }

// src/types/sessions/index.ts
export interface SessionSummary {
  id: string; title: string; instructor: string;
  startsAt: string;        // ISO-8601 UTC
  durationMinutes: number; capacity: number;
  priceCents: number;      // USD cents; 0 = free
  spotsLeft: number;       // capacity - confirmed bookings, never < 0
  isFull: boolean;
}
export interface ListSessionsResponse { sessions: SessionSummary[] }
export interface GetSessionResponse { session: SessionSummary }

// src/types/bookings/index.ts
export type BookingStatus = 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export interface Booking {
  id: string; sessionId: string;
  userId: string; name: string; email: string;      // from the owning user
  status: BookingStatus; cancelledAt: string | null; cancelledBy: 'member' | 'admin' | null;
  paymentStatus: PaymentStatus; paidAt: string | null;
  createdAt: string;
}
export interface BookingWithSession extends Booking { session: SessionSummary }
export interface BookingResponse { booking: BookingWithSession }   // create, get, cancel

// src/types/waitlist/index.ts
export type WaitlistStatus = 'waiting' | 'promoted' | 'removed';
export interface WaitlistEntry {
  id: string; sessionId: string; userId: string; name: string; email: string;
  status: WaitlistStatus;
  position: number | null;          // 1-based while waiting, otherwise null
  bookingId: string | null;         // set once promoted
  createdAt: string;
}
export interface WaitlistEntryWithSession extends WaitlistEntry { session: SessionSummary }
export interface WaitlistEntryResponse { waitlistEntry: WaitlistEntryWithSession }

// src/types/account/index.ts
export interface MyBookingsResponse {
  upcoming: { bookings: BookingWithSession[]; waitlist: WaitlistEntryWithSession[] };
  past: { bookings: BookingWithSession[] };
}

// src/types/admin/index.ts
export interface AdminSessionSummary extends SessionSummary { bookedCount: number; paidCount: number; waitlistCount: number; refundDueCount: number }
export interface SessionInput {          // create: all required; update: at least one field
  title: string; instructor: string; startsAt: string;
  durationMinutes: number; capacity: number; priceCents: number;
}
export interface ListAdminSessionsResponse { sessions: AdminSessionSummary[] }
export interface AdminSessionResponse { session: AdminSessionSummary }
export interface AdminSessionDetailResponse {
  session: AdminSessionSummary;
  bookings: Booking[];              // confirmed first, then cancelled; each by booking time
  waitlist: WaitlistEntry[];        // waiting only, by position
}
export interface UpdatePaymentRequest { paymentStatus: PaymentStatus }
```

### Auth endpoints (shared by members and admins)

| Method and path | Auth | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/auth/signup` | — | `201` `UserResponse` + `Set-Cookie` (always creates a `member`) | `400`, `409 EMAIL_TAKEN` |
| `POST /api/auth/login` | — | `200` `UserResponse` + `Set-Cookie` | `400`, `401 INVALID_CREDENTIALS` (the same message for an unknown email and a wrong password) |
| `POST /api/auth/logout` | any user | `204`; the session row is deleted and the cookie cleared | `401` |
| `GET /api/auth/me` | any user | `200` `UserResponse` | `401` |
| `POST /api/auth/forgot-password` | — | `204` **always**, whether or not the email exists. If it does, E7 is sent. | `400` |
| `POST /api/auth/reset-password` | — | `204`. The password is changed, the token marked used, and **all of that user's sessions deleted**. | `400`, `400 INVALID_RESET_TOKEN` (unknown, expired, or already used) |

### Member endpoints

| Method and path | Auth | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/sessions` | — | `200` `ListSessionsResponse` (upcoming only, by `startsAt`) | `500` |
| `GET /api/sessions/:id` | — | `200` `GetSessionResponse` (past sessions are returned too) | `400`, `404 SESSION_NOT_FOUND` |
| `POST /api/sessions/:id/bookings` | member | `201` `BookingResponse` (no body needed) | `400`, `401`, `404`, `409 SESSION_FULL`, `409 SESSION_PAST`, `409 ALREADY_BOOKED` |
| `POST /api/sessions/:id/waitlist` | member | `201` `WaitlistEntryResponse` | `400`, `401`, `404`, `409 SESSION_NOT_FULL`, `409 SESSION_PAST`, `409 ALREADY_BOOKED`, `409 ALREADY_WAITLISTED` |
| `GET /api/account/bookings` | member | `200` `MyBookingsResponse` | `401` |
| `GET /api/bookings/:id` | owner **or** admin | `200` `BookingResponse` | `400`, `401`, `404 BOOKING_NOT_FOUND` (also returned when it isn't yours: never reveal that it exists) |
| `POST /api/bookings/:id/cancel` | owner **or** admin | `200` `BookingResponse` (promotion happens inside, D14/D15) | `400`, `401`, `404`, `409 BOOKING_ALREADY_CANCELLED`, `409 SESSION_PAST` |
| `DELETE /api/waitlist/:id` | owner **or** admin | `204` (the entry becomes `removed`) | `400`, `401`, `404 WAITLIST_ENTRY_NOT_FOUND` (missing, not waiting, or not yours) |

### Admin endpoints (`admin` role required: `401` when logged out, `403 FORBIDDEN` for members)

| Method and path | Success | Errors |
| --- | --- | --- |
| `GET /api/admin/sessions?scope=upcoming\|past` | `200` `ListAdminSessionsResponse` (`upcoming` is the default, ascending; `past` is descending) | `400`, `401`, `403` |
| `POST /api/admin/sessions` | `201` `AdminSessionResponse` | `400` (including a start in the past), `401`, `403` |
| `GET /api/admin/sessions/:id` | `200` `AdminSessionDetailResponse` | `400`, `401`, `403`, `404` |
| `PATCH /api/admin/sessions/:id` | `200` `AdminSessionResponse` (raising capacity promotes from the waitlist inside the same transaction) | `400`, `401`, `403`, `404`, `409 SESSION_PAST`, `409 CAPACITY_BELOW_BOOKINGS` |
| `DELETE /api/admin/sessions/:id` | `204` | `400`, `401`, `403`, `404`, `409 SESSION_HAS_BOOKINGS` |
| `PATCH /api/admin/bookings/:id/payment` | `200` `BookingResponse` | `400`, `401`, `403`, `404` |

Admins cancel bookings with `POST /api/bookings/:id/cancel` and remove waitlist entries with `DELETE /api/waitlist/:id`. These are the same endpoints members use; the "owner or admin" check happens inside them.

### Other

| Method and path | Success | Errors |
| --- | --- | --- |
| `GET /api/health` | `200` (existing) | `503` (existing) |
| any unknown route | — | `404 NOT_FOUND` |

### Validation rules (server is the authority; client mirrors them for UX only)

- **Sign-up:**
  - `name`: trimmed, 1–100 characters.
  - `email`: trimmed and lowercased, at most 254 characters, matches a basic `local@domain.tld` pattern.
  - `password`: 8–200 characters. Don't trim it.
  - `timeZone`: optional. It must be a valid IANA zone (check it with `Intl.DateTimeFormat`). If it's missing or invalid, store `'UTC'`.
- **Reset password:** `token` is a non-empty string; `password` follows the sign-up rule. Forgot-password `email` follows the sign-up rule.
- **Login:** `email` follows the same rule; `password` is 1–200 characters.
- **`create-admin`:** requires a password of at least 12 characters.
- **Session input:**
  - `title`, `instructor`: trimmed, 1–100 characters.
  - `startsAt`: a valid ISO date in the future.
  - `durationMinutes`: an integer, 1–600.
  - `capacity`: an integer, 1–500.
  - `priceCents`: an integer, 0–1,000,000.
  - `PATCH` needs at least one field.
- **Payment:** `paymentStatus` must be `'paid'` or `'unpaid'`. **Scope:** `upcoming` or `past`.
- **Every request:**
  - Unknown body fields are ignored.
  - A non-JSON body returns `400 VALIDATION_ERROR`.
  - Every `:id` must be a uuid.

## 6. Data Model and Concurrency Strategy

Nothing has been migrated yet, so the final schema goes into two new migrations.

### Migration `src/db/migrations/001_create_users_and_auth.sql`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,                       -- scrypt "salt:hash", never the plain password
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  time_zone     TEXT NOT NULL DEFAULT 'UTC',          -- IANA zone from the browser, for email times
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE password_reset_tokens (
  token_hash TEXT PRIMARY KEY,                       -- SHA-256 of the emailed token
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,                   -- now() + 1 hour
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);

CREATE TABLE user_sessions (
  token_hash TEXT PRIMARY KEY,                       -- SHA-256 of the cookie token
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX user_sessions_expires_at_idx ON user_sessions (expires_at);
```

### Migration `src/db/migrations/002_create_sessions_bookings_waitlist.sql`

```sql
CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  instructor       TEXT NOT NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  capacity         INTEGER NOT NULL CHECK (capacity > 0),
  price_cents      INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  booked_count     INTEGER NOT NULL DEFAULT 0,          -- confirmed bookings only
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booked_count_within_capacity CHECK (booked_count >= 0 AND booked_count <= capacity)
);
CREATE INDEX sessions_starts_at_idx ON sessions (starts_at);

CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  cancelled_at   TIMESTAMPTZ,
  cancelled_by   TEXT CHECK (cancelled_by IN ('member', 'admin')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cancelled_fields_match_status
    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)),
  CONSTRAINT paid_at_matches_status CHECK ((payment_status = 'paid') = (paid_at IS NOT NULL))
);
-- One *confirmed* booking per member per class; a member who cancelled can book again.
CREATE UNIQUE INDEX bookings_session_user_confirmed_unique
  ON bookings (session_id, user_id) WHERE status = 'confirmed';
CREATE INDEX bookings_session_id_idx ON bookings (session_id);
CREATE INDEX bookings_user_id_idx ON bookings (user_id);

CREATE TABLE waitlist_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status     TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'removed')),
  booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_id_matches_status CHECK ((status = 'promoted') = (booking_id IS NOT NULL))
);
CREATE UNIQUE INDEX waitlist_session_user_waiting_unique
  ON waitlist_entries (session_id, user_id) WHERE status = 'waiting';
CREATE INDEX waitlist_session_queue_idx ON waitlist_entries (session_id, created_at) WHERE status = 'waiting';
CREATE INDEX waitlist_user_id_idx ON waitlist_entries (user_id);
```

The local database is PostgreSQL 17.6, so `gen_random_uuid()` is built in and needs no extension.

### The one rule behind every seat change

> **Any operation that changes who holds a seat runs in one transaction and first locks the class's `sessions` row.** This covers booking, joining the waitlist, cancelling, promoting, changing capacity, and deleting.

The lock is the `UPDATE ... sessions` or `SELECT ... FOR UPDATE` on that row. Locking the session row first everywhere gives a single lock order, which prevents deadlocks.

### Book (member, `user_id` from the session cookie)

```
BEGIN
  UPDATE sessions SET booked_count = booked_count + 1
   WHERE id = $1 AND booked_count < capacity AND starts_at > now()
  RETURNING *;
  -- 0 rows → ROLLBACK, then SELECT to tell which error applies: SESSION_NOT_FOUND / SESSION_PAST / SESSION_FULL
  INSERT INTO bookings (session_id, user_id) VALUES ($1, $2) RETURNING *;
  -- unique violation (23505) → ROLLBACK (the increment is undone too) → ALREADY_BOOKED
COMMIT
```

**Why this is safe:** the conditional `UPDATE` takes the row lock. Competing transactions queue on it and re-check the `WHERE` against committed values, so at most `capacity` increments can succeed. The `CHECK` constraint is a second guard. The counter and the booking commit together, so `booked_count = count(confirmed)` always holds.

**Fairness:** promotion runs inside every seat-freeing transaction, so a free place is never left open while people wait. Direct booking succeeds only when the waitlist is empty.

### Join waitlist (member)

```
BEGIN
  SELECT * FROM sessions WHERE id = $1 FOR UPDATE;   -- missing → SESSION_NOT_FOUND
  -- starts_at <= now() → SESSION_PAST;  booked_count < capacity → SESSION_NOT_FULL
  -- confirmed booking exists for (session, user) → ALREADY_BOOKED
  INSERT INTO waitlist_entries (session_id, user_id) VALUES ($1, $2) RETURNING *;
  -- unique violation → ALREADY_WAITLISTED
COMMIT
```

### Cancel (owner or admin) + automatic promotion

```
BEGIN
  SELECT session_id, user_id FROM bookings WHERE id = $1;
  -- missing, OR (caller is not the owner AND caller is not an admin) → BOOKING_NOT_FOUND
  SELECT * FROM sessions WHERE id = <session_id> FOR UPDATE;      -- lock the session first
  -- starts_at <= now() → SESSION_PAST
  UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = <'member' | 'admin'>
   WHERE id = $1 AND status = 'confirmed' RETURNING *;            -- 0 rows → BOOKING_ALREADY_CANCELLED
  UPDATE sessions SET booked_count = booked_count - 1, updated_at = now() WHERE id = <session_id>;
  promoteFromWaitlist(client, <session_id>)
COMMIT
```

`cancelled_by` is `'admin'` when an admin cancels someone else's booking, and `'member'` when owners cancel their own.

### `promoteFromWaitlist(client, sessionId)`: runs inside the caller's transaction

The caller already holds the session lock. This runs after a cancellation and after a capacity increase.

```
loop:
  SELECT * FROM waitlist_entries w
   WHERE w.session_id = $1 AND w.status = 'waiting'
     AND NOT EXISTS (SELECT 1 FROM bookings b
                     WHERE b.session_id = $1 AND b.user_id = w.user_id AND b.status = 'confirmed')
   ORDER BY w.created_at LIMIT 1 FOR UPDATE;                    -- none → stop
  UPDATE sessions SET booked_count = booked_count + 1
   WHERE id = $1 AND booked_count < capacity RETURNING *;       -- 0 rows → stop
  INSERT INTO bookings (session_id, user_id) VALUES ($1, w.user_id) RETURNING *;
  UPDATE waitlist_entries SET status = 'promoted', booking_id = <new id>, updated_at = now() WHERE id = w.id;
```

### Admin edits

**Edit:** the whole edit is one transaction.

```sql
BEGIN;
UPDATE sessions
   SET capacity = COALESCE($2, capacity), title = COALESCE($3, title), /* ...other fields... */ updated_at = now()
 WHERE id = $1 AND starts_at > now() AND booked_count <= COALESCE($2, capacity)
RETURNING *;
-- 0 rows → ROLLBACK, then SELECT to tell which error applies: SESSION_NOT_FOUND / SESSION_PAST / CAPACITY_BELOW_BOOKINGS
-- if capacity went up → promoteFromWaitlist(client, $1)
COMMIT;
```

**Delete:** only if the class has never had any booking or waitlist row.

```sql
DELETE FROM sessions WHERE id = $1
   AND NOT EXISTS (SELECT 1 FROM bookings WHERE session_id = $1)
   AND NOT EXISTS (SELECT 1 FROM waitlist_entries WHERE session_id = $1)
RETURNING id;   -- 0 rows → SESSION_NOT_FOUND or SESSION_HAS_BOOKINGS; the FKs are a second guard
```

**Payment:** `UPDATE bookings SET payment_status = $2, paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE NULL END WHERE id = $1 RETURNING *`.

**Leave or remove a waitlist entry** (owner or admin): `UPDATE waitlist_entries SET status = 'removed', updated_at = now() WHERE id = $1 AND status = 'waiting' AND (user_id = $2 OR <caller is admin>) RETURNING *`. 0 rows → `WAITLIST_ENTRY_NOT_FOUND`.

**Waitlist position:** `1 + count(*)` of waiting entries in the same class created earlier.

**Refund due:** `status = 'cancelled' AND payment_status = 'paid'`.

**Rejected:** count-then-insert without a lock, in-process mutexes, frontend-only checks, background jobs, and hard-deleting cancelled bookings.

### Authentication flow (D12)

```
signup → validate → INSERT users(role 'member', scrypt hash) → 23505 → EMAIL_TAKEN → create a session (below)
login  → find the user by lower(email) → scrypt-verify (timingSafeEqual); failure → INVALID_CREDENTIALS
       → token = randomBytes(32); INSERT user_sessions(sha256(token), user_id, now() + (admin ? 12h : 30d))
       → Set-Cookie session=token; HttpOnly; SameSite=Lax; Path=/; Max-Age=<ttl>; Secure in prod
requireAuth  → read the cookie → SELECT the user FROM user_sessions
               WHERE token_hash = sha256(token) AND expires_at > now()
             → none → 401 UNAUTHORIZED; found → res.locals.user = user → next()
requireAdmin → requireAuth, then role !== 'admin' → 403 FORBIDDEN
logout → DELETE the user_sessions row → clear the cookie → 204
```

There's no separate CSRF token. Two things make cross-site requests fail instead: `SameSite=Lax` blocks the cookie on cross-site `POST`/`PATCH`/`DELETE`, and the API only parses `application/json`, which a cross-site HTML form can't send. Document this.

**Password reset:**

```
forgot → find the user by lower(email) → if none: return 204 (send nothing)
       → token = randomBytes(32); INSERT password_reset_tokens(sha256(token), user_id, now() + 1h)
       → after commit: sendEmail(E7, link = APP_URL/reset-password?token=<token>) → 204
reset  → BEGIN
           UPDATE password_reset_tokens SET used_at = now()
            WHERE token_hash = sha256($token) AND used_at IS NULL AND expires_at > now()
           RETURNING user_id;                                    -- 0 rows → INVALID_RESET_TOKEN
           UPDATE users SET password_hash = <scrypt(new)> WHERE id = user_id;
           DELETE FROM user_sessions WHERE user_id = user_id;    -- log out everywhere
         COMMIT → 204
```

The guarded `UPDATE` makes each token single-use, even if two resets race.

### Email flow (D18)

```
service:  result = await repository.doTheThing(...)        -- the transaction has COMMITTED here
          void sendEmail(template(result)).catch(logError)  -- not awaited; never throws to the caller
          return result
```

- **`src/services/email/send-email.ts`:** the only place that talks SMTP. It uses one nodemailer transport built from `src/config/env.ts` (`SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`).
- **`src/services/email/templates.ts`:** one plain function per email (E1–E8). Each returns `{ to, subject, text, html }`. They use `APP_URL` for links and the recipient's `time_zone` for times.
- **Getting promoted members:** the cancel and capacity-edit repositories **return the promoted bookings**, so the service can send E4. The same goes for the list of affected members needed for E6, and for the admins needed for E8.
- **Never send inside a transaction.** Sending while holding the session lock would slow everyone's bookings.
- **In Jest, `sendEmail` is mocked** (unit tests and integration tests by default), and assertions check which template was called. QA's e2e tests read the real Mailpit inbox through its API: `GET http://localhost:8025/api/v1/search?query=to:<email>`, and `DELETE /api/v1/messages` to clear it between tests.

## 7. Feature Folder Map

The feature names are **`auth`**, **`sessions`**, **`bookings`**, **`waitlist`**, **`account`** (My bookings), and **`admin`**. The folder names match across layers (`CLAUDE.md`). Account and admin code **reuse** the `sessions` / `bookings` / `waitlist` row mappers and `promoteFromWaitlist`. Admin-only SQL lives in `src/repositories/admin/`. Member pages live in the `(site)` route group (the URLs don't change), so the public header and footer stay off `/admin`.

| Layer | auth | sessions | bookings | waitlist | account | admin |
| --- | --- | --- | --- | --- | --- | --- |
| Page | `src/app/(site)/{login,signup,forgot-password,reset-password}/page.tsx` | `src/app/(site)/sessions/page.tsx`, `src/app/(site)/sessions/[id]/page.tsx` | `src/app/(site)/bookings/[id]/page.tsx` | (shown in account) | `src/app/(site)/account/page.tsx` | `src/app/admin/login/page.tsx`; `src/app/admin/page.tsx` (redirect); `src/app/admin/(dashboard)/` with `layout.tsx` (guard + nav), `sessions/page.tsx` (schedule + expandable rows), `sessions/new/page.tsx`, `sessions/[id]/page.tsx`, `sessions/[id]/edit/page.tsx` |
| Components | `src/components/auth/` | `src/components/sessions/` | `src/components/bookings/` | `src/components/waitlist/` | `src/components/account/` | `src/components/admin/` |
| Frontend API | `src/api/auth/` | `src/api/sessions/` | `src/api/bookings/` | `src/api/waitlist/` | `src/api/account/` | `src/api/admin/` |
| Types | `src/types/auth/` | `src/types/sessions/` | `src/types/bookings/` | `src/types/waitlist/` | `src/types/account/` | `src/types/admin/` |
| Routes | `src/routes/auth/` | `src/routes/sessions/` (incl. `POST /:id/bookings`, `/:id/waitlist`) | `src/routes/bookings/` | `src/routes/waitlist/` | `src/routes/account/` | `src/routes/admin/` |
| Controllers / Services | `.../auth/` | `.../sessions/` | `.../bookings/` | `.../waitlist/` | `.../account/` | `.../admin/` |
| Repositories | `src/repositories/auth/` (users, user_sessions) | `src/repositories/sessions/` | `src/repositories/bookings/` | `src/repositories/waitlist/` (incl. `promoteFromWaitlist`) | — (reuses bookings + waitlist) | `src/repositories/admin/` (admin list, create / update / delete, roster, payment; reuses the mappers + `promoteFromWaitlist`) |
| Validators | `src/validators/auth/` | `src/validators/sessions/` | `src/validators/bookings/` | `src/validators/waitlist/` | — | `src/validators/admin/` |
| Middlewares | `src/middlewares/require-auth.ts` (`requireAuth`, `requireAdmin`) | | | | | |
| Utils | `src/utils/password.ts` (backend-only) | | | | | |
| Email | `src/services/email/send-email.ts` + `templates.ts` (backend-only, used by the auth / bookings / waitlist / admin services) | | | | | |
| Scripts | `src/db/create-admin.ts` (D11) | | | | | |
| Unit tests | `tests/unit/{components,api}/<feature>/` (Vitest), `tests/unit/services/<feature>/` and `tests/unit/middlewares/require-auth.test.ts` (Jest) | | | | | |
| Integration | `tests/integration/<feature>.test.ts`; QA owns `*-concurrency.test.ts` | | | | | |
| e2e | QA: `tests/e2e/{booking,waitlist,account,admin}.spec.ts`. Frontend: `home.spec.ts` | | | | | |

**Shared frontend pieces:**
- `src/components/ui/` (`Button`, `Input`, `Badge`, `Skeleton`, `Tabs`, `Reveal`)
- `src/components/layout/` (`Header` with an account menu, `Footer`)
- `src/constants/studio.ts` (`STUDIO_CURRENCY`)
- `src/utils/format-session-time.ts`, `src/utils/format-price.ts`

---

## 8. Work Breakdown by Role

Order: **backend phase A (contract + schema)** → frontend and backend phase B in parallel → QA → documentation. QA writes its plan right away.

### 8.1–8.3 Implementation and QA tasks → `tasks/`

The backend, frontend and QA work is split into **five task files**. **Those files are the task lists.** They don't repeat this file: they point to §2–§7 for scope, the contract, the data model, and design.

| # | File | Agent | Scope | Runs |
| --- | --- | --- | --- | --- |
| 1 | [`tasks/backend-member.md`](../tasks/backend-member.md) | `backend-engineer` | **Foundation:** schema, contract types, errors, auth (incl. `create-admin`), email + all templates, seed, approved config edits. **Member API:** sessions, bookings, cancel + promotion, waitlist, account. | **First** (Phase A unblocks everyone) |
| 2 | [`tasks/backend-admin.md`](../tasks/backend-admin.md) | `backend-engineer` | `/api/admin/*`: schedule list with counts, create / edit (+ promotion on a capacity increase) / delete, roster detail, payments, E6. Reuses task 1's exports. | After task 1 Phase A |
| 3 | [`tasks/frontend-member.md`](../tasks/frontend-member.md) | `frontend-engineer` | **Shared UI foundation** (tokens, fonts, `client.ts`, `ui/` kit, formatters), plus every member page: landing, auth, timetable, class, booking, account. anime.js + `ViewTransition`. | After task 1 Phase A types |
| 4 | [`tasks/frontend-admin.md`](../tasks/frontend-admin.md) | `frontend-engineer` | The admin area: login, guard, schedule with inline roster and one-click actions, search, `SessionForm`. Reuses task 3's foundation. No anime.js. | After task 3's foundation + task 2's types |
| 5 | [`tasks/qa.md`](../tasks/qa.md) | `qa-engineer` | Concurrency (real DB), security and privacy, e2e, persistence, Mailpit emails, design and responsive regression, full regression. | Plan now; sections run as each task reports done |

**Ownership boundaries between the files:**
- **Backend:**
  - Task 1 owns all shared backend code.
  - Task 2 owns only `src/types/admin/` and the `admin/` feature folders, plus one mount line in `src/routes/index.ts`.
  - Admin cancel and waitlist removal use task 1's **shared** endpoints (owner-or-admin check).
- **Frontend:**
  - Task 3 owns the root layout, `globals.css`, the `(site)/` route group, and all shared `ui/` / `api/` / `utils` code.
  - Task 4 owns only `src/app/admin/`, `src/components/admin/` and `src/api/admin/`. It asks task 3 for any new generic `ui/` piece.
- **QA:** owns the concurrency integration files and every e2e spec except `home.spec.ts` (task 3's).

### 8.4 `documentation-engineer`

**Goal:** a reviewer can set up, run, test, and demo the member side (sign up, book, waitlist, My bookings, cancel) and the admin side (schedule, inline roster, payments, cancellations, waitlist) in minutes, and understands our reasoning and limits.

**Tasks**
- [ ] **`README.md` (one page or less):**
  - what it is (one paragraph, both user types)
  - prerequisites
  - setup (`yarn install`, `.env`, `createdb` for the dev and test databases, **Mailpit** (`brew install mailpit`, then run `mailpit`; inbox at http://localhost:8025), `yarn migrate`, `yarn seed`, `yarn create-admin`)
  - how to run
  - **the demo logins** (the seed member password and the admin from `.env.example`, both dev-only)
  - how to test
  - a link to `docs/architecture.md`
  - **assumptions and what was left out** (§2)
- [ ] **`docs/architecture.md`:**
  - **stack and reasons**: Next.js + Express + PostgreSQL, no ORM, server-side sessions instead of JWT, anime.js for member-side motion (CSS for micro-interactions), and nodemailer with Mailpit for email
  - the request flow and layering
  - the API contract
  - the data model
  - **the concurrency "one rule"** and why it's safe
  - **waitlist fairness** (promotion inside the freeing transaction)
  - **auth design** (one users table with a role, owner-or-admin checks, the CSRF reasoning, no rate limiting or verification)
  - manual payments and "Refund due"
  - **the design approach** (member: aesthetic plus motion; admin: UX first; mobile-first; reduced motion)
  - the testing strategy
  - **emails:** the E1–E8 list, Mailpit locally, the after-commit and no-retry design, and what changes for production (only the SMTP env vars)
  - **motion:** what anime.js does and what CSS does
  - limitations
- [ ] **Demo checklist:**
  - Member side:
    - browse while logged out
    - sign up
    - book (see the success animation)
    - see the full class → join the waitlist
    - open My bookings (Upcoming and Past)
    - cancel a booking
  - Admin side:
    - log in → Today pinned
    - expand a class → mark paid
    - cancel a booking → "Refund due"
    - watch a waitlisted member get the place (log in as them → "You got a place!")
    - search
    - "+ New class"
    - capacity error
    - delete the empty class
  - Then:
    - **open Mailpit (http://localhost:8025) and walk through the emails each step sent**
    - forgot password → reset via the Mailpit link
    - run the concurrency tests
    - phone width in devtools, and reduced motion
- [ ] Run every documented command on a clean checkout, and report which you verified.

**Done when:** the README fits one page, every command was run or is marked unverified, the env vars and scripts match the repository exactly, and nothing is claimed that QA's output doesn't support.

**Do not touch:** `src/`, `tests/`, config files, `CLAUDE.md`, `AGENTS.md`, `.claude/`, `docs/context.md`, or this file (`docs/work-context.md`).

---

## 9. Cross-Role Handoffs

| From → To | Handoff | Trigger |
| --- | --- | --- |
| lead → all | This file approved (done) | start |
| backend → frontend | Contract types plus migrations (Phase A) | frontend starts its API layer |
| backend → QA | Endpoints, seed, `create-admin`, and config edits ready, with the report | QA starts integration, concurrency, and security testing |
| frontend → QA | Member and admin pages ready, with the report, Lighthouse numbers, and screenshots | QA starts e2e and the design regression |
| QA → backend / frontend | Defects with reproduction steps | fix, then QA re-runs |
| backend, frontend, QA → docs | Final reports with real output | docs writes the README and architecture doc |

## 10. Risks to Watch

- **Emails aren't guaranteed:** they're sent after commit with no retry or outbox. If Mailpit or SMTP is down, the email is lost; it's logged, and the booking itself is safe. **My bookings is always the source of truth.** An outbox table is the v2 fix if delivery has to be guaranteed.
- **Local only:** every email goes to Mailpit, and nobody receives real mail. That's intentional for v1. Production needs a real SMTP provider (env change only), plus SPF/DKIM setup.
- **No email verification** (Q1): someone could sign up with an email they don't own, and the real owner would then receive the emails. The impact is limited, because that account can only book for itself. Document this; verification is a v2 candidate.
- **Login has no rate limiting or 2FA.** Password minimums are 8 characters for members and 12 for admins. Document this.
- **Lock order:** every seat-changing transaction must lock the `sessions` row **first**. New code paths that lock booking or waitlist rows first risk deadlocks, which would show up as 5xx errors in QA's runs.
- **Pool size in concurrency tests:** with N above the pool max (10), requests queue in the app and prove less. QA reports N against the pool size.
- **Motion vs performance on low-end phones:** any animation that drops frames or delays LCP gets cut. The performance budget in §4.1 wins over any effect.
- **anime.js on phones:** JavaScript animation competes with page load. Effects must start only after first paint, use only `transform`/`opacity`, and be cut if they hurt the §4.1 budget. Content must never depend on JavaScript to become visible (QA checks).
- **`<ViewTransition>`** may animate differently in Safari. That's acceptable; navigation must work everywhere.
- **Device timezone:** a member traveling sees class times in their current timezone. That's correct (it's the real moment), but it could surprise them. The admin enters times in their own device timezone.
- **Relative-time seeds** drift. Re-seed before demos and e2e runs.
- **Payments and refunds are self-reported** by admins.
