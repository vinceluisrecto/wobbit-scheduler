# Task 3 of 5 — Frontend: Member-Facing Site + Shared UI Foundation

| | |
| --- | --- |
| **Agent** | `frontend-engineer` |
| **Source** | [`docs/work-context.md`](../docs/work-context.md) (APPROVED 2026-10-23) |
| **Runs** | After backend-member's **Phase A** types. Build against them with mocked API calls until the endpoints are live. |
| **Sibling tasks** | `tasks/frontend-admin.md` (uses your foundation), `tasks/backend-member.md` (your API), `tasks/qa.md` |

## Read first

1. [`CLAUDE.md`](../CLAUDE.md) and `.claude/agents/frontend-engineer.md`.
2. [`docs/work-context.md`](../docs/work-context.md):
   - **Keep It Simple** (the four-step flow)
   - §2 Scope (the member side)
   - §3 Decisions D6, D10, D14–D17
   - **§4.1 Member design**
   - **§4.3 Responsive and accessibility**
   - §4.4 Research
   - §5 Contract (auth, member endpoints)
3. `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` (per `AGENTS.md`).

## What you own

You own **everything a member sees**: the landing page, auth pages, timetable, class page, booking page, and My bookings.
- **Shared frontend foundation:** you also own the design tokens, fonts, API client, `ui/` kit, and formatters that frontend-admin reuses. Ship the foundation **first** and announce it.
- **The look:** aesthetic first, animated, uncluttered, and mobile-first (§4.1).

## Files you own

| Area | Paths |
| --- | --- |
| App shell | `src/app/layout.tsx` (html, body, fonts only), `src/app/globals.css` (tokens + reduced-motion rule) |
| Member route group | `src/app/(site)/layout.tsx` (public `Header` + `Footer`), and under `(site)/`: `page.tsx` (landing), `login/`, `signup/`, `forgot-password/`, `reset-password/`, `sessions/`, `sessions/[id]/`, `bookings/[id]/`, `account/` |
| Components | `src/components/{ui,layout,home,auth,sessions,bookings,waitlist,account}/` |
| API calls | `src/api/client.ts`, `src/api/{auth,sessions,bookings,waitlist,account}/` |
| Shared | `src/constants/studio.ts`, `src/utils/cn.ts`, `src/utils/format-session-time.ts`, `src/utils/format-price.ts` |
| Tests | `tests/unit/components/{ui,layout,home,auth,sessions,bookings,waitlist,account}/`, `tests/unit/api/` (except `admin/`), `tests/unit/utils/`, `tests/e2e/home.spec.ts` |
| Config (approved edit only) | `package.json`: `yarn add animejs` (D17) |

**About `(site)/`:** a route group doesn't change URLs (`/sessions` stays `/sessions`). It keeps the public header and footer off the admin pages, which have their own layout. Move the existing `src/app/page.tsx` into `(site)/`.

## Foundation (ship first, announce to frontend-admin)

- [ ] **Design tokens** in `globals.css` `@theme`:
  - brand, accent, neutral, and status colors (green / amber / red)
  - radii and shadows
  - `--ease-out-soft`, `--duration-fast` / `--duration-base` / `--duration-slow`
  - **the global `prefers-reduced-motion` rule**
- [ ] **Fonts:** a display font plus a sans font, via `next/font`, in `src/app/layout.tsx`.
- [ ] **`src/api/client.ts`:** relative `/api` base, JSON, `cache: 'no-store'` and `credentials: 'same-origin'`. It throws a typed `ApiError` carrying `code`, `message` and `details`.
- [ ] **`src/api/auth/`:** `signup` (sends `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone`), `login`, `logout`, `getMe`, `forgotPassword`, `resetPassword`. frontend-admin reuses `login`, `logout` and `getMe`.
- [ ] **Member API calls:**
  - `src/api/sessions/` (`listSessions`, `getSession`)
  - `src/api/bookings/` (`createBooking`, `getBooking`, **`cancelBooking`**)
  - `src/api/waitlist/` (`joinWaitlist`, **`leaveWaitlist`**)
  - `src/api/account/` (`getMyBookings`)

  frontend-admin reuses `cancelBooking` and `leaveWaitlist` (the same shared endpoints), so ship these with the foundation.
- [ ] **`src/components/ui/`:**
  - extend **`Button`** so it can be a link or a button, with an inline loading spinner and a fixed width
  - **`Input`**: label, error and hint built in, `aria-describedby`, the correct mobile keyboard props
  - **`Badge`**: status colors
  - **`Skeleton`**
  - **`Tabs`**
  - **`Reveal`**: anime.js `onScroll`; content visible without JavaScript; nothing animates under reduced motion
- [ ] **`src/constants/studio.ts`:** `STUDIO_CURRENCY = 'USD'`.
- [ ] **Formatters:**
  - `format-session-time`: the device timezone (no `timeZone` option), with "Today" / "Tomorrow"
  - `format-price`: USD, with `0` → "Free"
- [ ] **No custom hooks.** Each component keeps its own `useState`, and `getMe()` is called where needed (no global context).
- [ ] **Announce** the foundation to frontend-admin: component names, props, and paths.

## Motion (D17, §4.1)

- [ ] `yarn add animejs`.
- [ ] **Usage rules:**
  - named imports only: `animate`, `stagger`, `onScroll`, `createDrawable`
  - only in `'use client'` components, inside `useEffect`, **with cleanup**
  - **skipped entirely under reduced motion**
  - **never in admin code**
- [ ] **What it animates:**
  - the hero signature (staggered headline, CTA pulse once, ≤ 1.2s)
  - section reveals
  - list staggers (≤ 300ms total)
  - the success check-mark draw (`createDrawable`), with the card rising in
- [ ] **CSS handles:**
  - card hover lift and press scale (150–200ms)
  - the "filling fast" pulse dot (≤ 3 spots)
  - background blob drift
  - only `transform`/`opacity`
- [ ] **Page transitions:** React `<ViewTransition>` crossfades between pages, and the session card morphs into the class header.

## Pages (aesthetic first, §4.1; four steps for every action)

- [ ] **`Header` + `Footer`** (`src/components/layout/`): the logo, "Classes", and an account menu ("Log in" or "My bookings / Log out", via `getMe()`). The header is compact and sticky on mobile. **No admin links.**
- [ ] **Landing `/`** (`src/components/home/`):
  - the hero (headline, one sentence, a "See classes" CTA)
  - "How it works" (3 icon steps)
  - "This week" (3–4 `SessionCard`s)
  - a closing CTA
  - few words; replace the current placeholder sections
- [ ] **`/login`, `/signup`** (`src/components/auth/`):
  - short forms with field errors and the `?next=` redirect
  - "Email or password is incorrect" and "That email already has an account"
  - links between the two pages, and "Forgot password?"
- [ ] **`/forgot-password`:** always shows "If that email has an account, we've sent a reset link".
- [ ] **`/reset-password?token=…`:** success → "Password updated, please log in". `INVALID_RESET_TOKEN` → "This link has expired or was already used", with a link to `/forgot-password`.
- [ ] **`/sessions`:**
  - a responsive card grid (1 column on mobile, 2–3 on desktop); time first and largest, then title, instructor, price, and the spots badge
  - "filling fast" (≤ 3 spots), and "Full" with "Join waitlist"
  - skeletons, empty, and error-with-retry states
  - **refetch on window focus** (one listener, no polling)
- [ ] **`/sessions/[id]`:** a hero header (morphs from its card), the key facts, and **one primary action in a sticky bottom bar on mobile**:
  - logged out → "Log in to book" → `/login?next=…`
  - open → **Book** → `/bookings/[id]`
  - full → **Join waitlist** → `/account`
  - `ALREADY_BOOKED` → "You're booked ✓", with a link to My bookings
  - `SESSION_FULL` → "This class just filled up", then switch to Join waitlist
  - `SESSION_NOT_FULL` → "A place just opened", then switch to Book
  - `ALREADY_WAITLISTED` → "You're already on the waitlist"
  - `SESSION_PAST` → "This class has already started"
  - network or 500 → "Something went wrong, nothing was saved"
- [ ] **`/bookings/[id]`:**
  - the success animation when you arrive from booking
  - details, price, "Pay at the studio", payment status, booking status (cancelled shows "by you" or "by the studio")
  - **Cancel booking** (inline confirm) while it's upcoming and confirmed
  - not found or not yours → a not-found state
- [ ] **`/account`:**
  - logged out → `/login?next=/account`
  - **Upcoming / Past** tabs
  - Upcoming: confirmed bookings (with Cancel), waitlist entries ("#N in line", with Leave), and "You got a place!" highlighted with the check animation
  - Past: previous bookings, including cancelled ones
  - payment status on every item
  - the list stagger animation
  - refetch on focus

## Tests

- [ ] **Vitest (mock at `src/api/`; mock `animejs`):**
  - **UI kit:**
    - `Button`: link and button modes, loading, disabled
    - `Input`: `aria-describedby` wiring
    - `Badge`, `Tabs`
    - `Reveal`: content visible without animation, no `animate` call under reduced motion, cleanup on unmount
  - **Formatters:**
    - `format-session-time`: device timezone, Today / Tomorrow
    - `format-price`: USD, "Free"
  - **`client.ts`:** maps error bodies to `ApiError`.
  - **Auth forms:**
    - validation, errors, `next` redirect
    - signup sends `timeZone`
    - the forgot-password message is identical for any email
    - the reset success and invalid-token states
  - **Sessions:**
    - `SessionCard`: price, "filling fast", Full / "Join waitlist"
    - `SessionList`: refetch on focus
  - **Class page action:** every state and error code above, with loading set first and redirects only on success.
  - **Booking page:** success, cancelled ("by you" / "by the studio"), Cancel with confirm.
  - **Account:** tabs, waitlist position, Leave, Cancel, the promotion highlight.
  - **Hero:** animates only when motion is allowed, and cleans up.
- [ ] **Update** `tests/unit/components/home/HomeHero.test.tsx` and `tests/e2e/home.spec.ts` for the new landing page.
- [ ] **Manual checks, with real numbers in your report:**
  - Lighthouse mobile on `/` and `/sessions`: LCP < 2.5s, CLS < 0.1, and the performance score
  - the reduced-motion OS setting: nothing moves, and everything still works
  - JavaScript disabled: landing content is visible
  - screenshots at **375 / 390 / 768 / 1280** of `/`, `/sessions`, `/sessions/[id]` and `/account`
  - a keyboard-only booking walkthrough
  - the anime.js size added to the landing page JS (from the `yarn build` output)

## Done when

- `yarn lint`, `yarn test`, `yarn build` and `yarn test:e2e` (home spec) pass, with **real output** in your report.
- The manual checks above are reported with real numbers and screenshots.
- The member flows work against the running API with seed data.

## Do not touch

- the backend, `src/db/`, contract types (`src/types/*/index.ts`)
- `src/app/admin/`, `src/components/admin/`, `src/api/admin/`
- QA's e2e specs
- config, apart from `yarn add animejs`

Don't use Route Handlers, Server Actions, or Next middleware for booking or auth logic, and don't add any other animation or UI library.

## Handoffs

| To | What | When |
| --- | --- | --- |
| frontend-admin | The foundation: tokens, `client.ts`, `src/api/auth/`, `ui/` kit, formatters | as soon as it's done |
| QA | Member pages ready, plus your report, Lighthouse numbers, and screenshots | done |

Use the completion report format in `.claude/agents/frontend-engineer.md`.
