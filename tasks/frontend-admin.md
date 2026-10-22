# Task 4 of 5 — Frontend: Admin-Facing App

| | |
| --- | --- |
| **Agent** | `frontend-engineer` |
| **Source** | [`docs/work-context.md`](../docs/work-context.md) (APPROVED 2026-10-23) |
| **Runs** | After frontend-member's **foundation** and backend-admin's **`src/types/admin/`**. Build against the types with mocked API calls until the endpoints are live. |
| **Sibling tasks** | `tasks/frontend-member.md` (the foundation you reuse), `tasks/backend-admin.md` (your API), `tasks/qa.md` |

## Read first

1. [`CLAUDE.md`](../CLAUDE.md) and `.claude/agents/frontend-engineer.md`.
2. [`docs/work-context.md`](../docs/work-context.md):
   - **Keep It Simple**
   - §2 Scope (the admin side)
   - §3 Decisions D6, D10, D13, D15, D17
   - **§4.2 Admin design: "find it fast, act in one click"**
   - **§4.3 Responsive and accessibility**
   - §5 Admin endpoints and the shared cancel/remove endpoints
3. frontend-member's **foundation announcement**, for the component names and props.

## What you own

You own **the whole admin area**.
- **UX first, aesthetics second.** The owner must see what matters without hunting, and act in **one click** (two for destructive actions).
- **No decorative animation, and no anime.js.** Only functional transitions: row expand, button states, hover.

## What you reuse (import; don't re-implement)

| From frontend-member | Used for |
| --- | --- |
| `src/api/client.ts`, `src/api/auth/` (`login`, `logout`, `getMe`) | every request and the admin login |
| `src/api/bookings/` (`cancelBooking`), `src/api/waitlist/` (`leaveWaitlist`) | **admin cancel and remove**. These are the same shared endpoints members use. |
| `ui/` kit: `Button`, `Input`, `Badge`, `Skeleton`, `Tabs` | all controls |
| `SpotsBadge`, `format-session-time`, `format-price`, design tokens | consistency |

- **Something missing from `ui/`?** If a piece is generic (for example a progress bar, slide-over panel, or toast), **ask frontend-member to add it to `ui/`**. If it's admin-only, build it in `src/components/admin/`.
- **Never fork a shared component.**

## Files you own

| Area | Paths |
| --- | --- |
| Pages | `src/app/admin/login/page.tsx`, `src/app/admin/page.tsx` (redirects to `/admin/sessions`), and in `src/app/admin/(dashboard)/`: `layout.tsx`, `sessions/page.tsx`, `sessions/new/page.tsx`, `sessions/[id]/page.tsx`, `sessions/[id]/edit/page.tsx` |
| Components | `src/components/admin/` |
| API calls | `src/api/admin/`: `listAdminSessions(scope)`, `createSession`, `getAdminSession`, `updateSession`, `deleteSession`, `updatePayment` |
| Tests | `tests/unit/components/admin/`, `tests/unit/api/admin/` |

## Tasks

- [ ] **`/admin/login`:** email + password with the shared `login()`. If the user's `role !== 'admin'`, show "This account isn't an admin" and call `logout()`. On success, go to `/admin/sessions`.
- [ ] **`(dashboard)/layout.tsx`, the guard + shell:**
  - **Guard:**
    - `getMe()` on mount, showing loading until it answers
    - `401` → `/admin/login`
    - a member role or `403` → `/admin/login` with a message
    - any later `UNAUTHORIZED` from an admin call → `/admin/login`
    - the API is the real security
  - **Sticky header:** logo, **search box**, **"+ New class"** (always visible), Log out.
- [ ] **Schedule `/admin/sessions`** (where `/admin` lands; no separate dashboard):
  - **Today pinned first**, then the coming days, plus a **Past** tab (`?scope=past`)
  - **Each row, at a glance:**
    - time, title, instructor
    - **booked/capacity with a progress bar**
    - **waitlist count**
    - **paid count**
    - **⚠ Unpaid** / **Refund due** markers
  - **Rows expand inline** (no page change): fetch `getAdminSession(id)` on the first expand and show:
    - **Roster (confirmed):** name, email, booked at, and the payment toggle **Mark paid / Mark unpaid** (one click, no confirm; loading → `PATCH` → update the row and counts), plus **Cancel booking** (inline "Confirm?" second click → shared `cancelBooking` → refetch the detail and counts)
    - **Waitlist:** position, name, email, joined at, and **Remove** (inline confirm → shared `leaveWaitlist` → refetch)
    - **Cancelled:** name, email, cancelled at, by member or admin, payment, a **Refund due** badge when paid, and the payment toggle still available (to mark the refund done)
  - **After any action,** refetch that class's detail and update its row. No optimistic updates.
- [ ] **Search box:** instant client-side filtering of the loaded schedule by title, instructor, or member name/email (searching rosters already loaded for expanded rows).
- [ ] **"+ New class" / Edit:** **one `SessionForm`**, opened in place as a **slide-over panel on desktop and a full-screen sheet on mobile**:
  - **Fields:**
    - title, instructor
    - start (`datetime-local`, device timezone → ISO in UTC)
    - duration (default 60)
    - capacity (defaults to the last created class's value)
    - price in dollars (sent as cents)
  - Submits on **Enter**, focuses the first field, and shows field errors next to each field.
  - **Errors:**
    - `CAPACITY_BELOW_BOOKINGS` → "Capacity can't be lower than the X people already booked"
    - `SESSION_PAST` → "This class has already started"
  - **After saving,** close the panel, refetch the schedule, and **highlight the new or updated row**.
  - `/admin/sessions/new` and `/admin/sessions/[id]/edit` render the same form for deep links.
- [ ] **`/admin/sessions/[id]`** (deep link):
  - the class info, plus **the same roster, waitlist and cancelled components as the expanded row (reuse them)**
  - **Edit**
  - **Delete**: shown only when the class has no booking or waitlist rows; inline confirm → `deleteSession` → back to the schedule; `SESSION_HAS_BOOKINGS` → a clear message
- [ ] **Feedback:** inline success or error text next to the thing that changed, and a small toast only for "Saved".
- [ ] **Style (§4.2):**
  - neutral, with the brand color only for primary actions
  - status colors used consistently: green = paid/confirmed, amber = unpaid/waitlist, red = cancelled/refund due
  - row expand via `grid-template-rows: 0fr → 1fr`
  - respect `prefers-reduced-motion`
- [ ] **Mobile admin (§4.3):**
  - rows become cards, with **paid/cancel visible**: no hidden overflow menus
  - sticky headers
  - tap targets ≥ 44px
  - no horizontal scroll at 375px

## Tests (Vitest, mocking at `src/api/`)

- [ ] **Guard:** `401` → login; member role / `403` → login with a message.
- [ ] **Admin login:** an admin succeeds; a member account is refused and logged out.
- [ ] **Schedule:**
  - Today is grouped first, and the Past tab works
  - the counts and markers render
  - **expanding a row loads the roster**
- [ ] **Roster actions:**
  - the payment toggle updates the row and counts
  - cancel needs the confirm and calls the **shared** `cancelBooking`
  - "Refund due" shows for cancelled + paid bookings
- [ ] **Waitlist:** Remove with confirm calls the shared `leaveWaitlist`.
- [ ] **Search:** filters by title, instructor, and member name/email.
- [ ] **`SessionForm`:**
  - create and edit modes
  - dollars → cents
  - the defaults (duration 60, last capacity)
  - Enter submits
  - field and API errors
  - the highlight after saving
- [ ] **Delete:** the visibility rule and the confirm.
- [ ] **Manual checks, with real numbers in your report:**
  - **click counts from `/admin`:** "mark a booking paid" (target ≤ 2) and "cancel a booking" (target ≤ 3)
  - screenshots of `/admin/sessions` (collapsed and expanded) and the form at **375 / 768 / 1280**
  - a keyboard-only walkthrough of marking paid, cancelling, and creating a class
  - confirmation that the **admin route bundle contains no `animejs`** (from the `yarn build` output)

## Done when

- `yarn lint`, `yarn test` and `yarn build` pass, with **real output** in your report.
- The manual checks above are reported.
- The admin flows work against the running API with seed data, logged in as the demo admin.

## Do not touch

- frontend-member's files: the `(site)/` pages, `src/app/layout.tsx`, `globals.css`, `src/components/{ui,layout,home,auth,sessions,bookings,waitlist,account}/`, `src/api/` except `admin/`, utils, constants
- the backend, `src/db/`, contract types
- QA's e2e specs
- all config and `package.json` (you need no new packages)

Don't import `animejs` in admin code.

## Handoffs

| To | What | When |
| --- | --- | --- |
| frontend-member | Requests for any generic `ui/` pieces you need | as soon as you find them |
| QA | Admin pages ready, plus your report, click counts, and screenshots | done |

Use the completion report format in `.claude/agents/frontend-engineer.md`.
