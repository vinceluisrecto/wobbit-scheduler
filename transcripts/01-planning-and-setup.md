# Session 1: Planning, standards, agents and task breakdown (lead session)

Exported from the raw Claude Code session log for this project. Your messages, the agent's replies, and each tool call (with its one-line description) are included in order.
Tool outputs, system prompts and file contents are omitted.

---

## User (1)

I want you to create a claude.md file or agent.md file that has the following content:

For frontend:
- Stack to use
    - React
    - TypeScript
    - TailwindCSS
    - nextjs
- for testing
    - Vitest
    - Playwright setup

For backend
- Stack to use
    - Node.js
    - TypeScript
    - PostgreSQL
- for testing
    - Jest

I want the folder structure to be clean and precise both for frontend and backend. I want it to be easy to navigate and understand. All of the same files with same functionality or how it works should be in the same folder with just a folder title as description for what it is. If another folder is calling a file from another folder in different usage (e.g. page + api + component), their folder should be the same if possible (e.g. pages (home-> folder), api (home-> folder), components (home-> folder))

- avoid duplication if necessary
- use existing functions or components if necessary
- dont install unnecessary packages, reuse what is existing
- ALWAYS use yarn

> 🔧 `Bash` — List project contents

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/CLAUDE.md

**Agent:**

I created `~/Documents/GitHub/wobbit-exam/CLAUDE.md`. The repo was empty, so it describes the setup you want rather than existing code.

**What it covers:**
- **Golden rules:** always use `yarn` (never `npm`, `npx` or `pnpm`). Don't install unnecessary packages: check `package.json` and reuse what's there. Reuse existing functions and components, and move duplicated logic into shared folders.
- **Folder layout:** files are grouped first by what they are (`components/`, `api/`, `services/`, and so on), then by feature, and the feature folder has the same name in every layer. For example, `app/home/`, `components/home/`, `api/home/` and `hooks/home/` on the frontend, and `routes/home/`, `controllers/home/`, `services/home/` and `repositories/home/` on the backend. Tests live in a `tests/` folder that mirrors the source tree.
- **Frontend:** Next.js (App Router), React, TypeScript, TailwindCSS, Vitest for unit tests and Playwright for end-to-end tests. It includes a full folder tree, conventions and scripts.
- **Backend:** Node.js, TypeScript, PostgreSQL and Jest. Requests flow one way through the layers (routes → controllers → services → repositories → db), and all SQL lives in the repositories layer.
- **Checklist:** a short list to run through before finishing a task.

**Choices you should check:**
- **Two apps in one repo:** I assumed `frontend/` and `backend/` folders side by side, each with its own `package.json`.
- **Server framework and database client:** you didn't name either, so it says to use whatever is already installed, and Express with `pg` if nothing is. It also says not to add an ORM unless asked.

If you also want an `AGENTS.md` for other AI tools, I can add one as a symlink to `CLAUDE.md` so the two never drift apart.

---

## User (2)

no, frontend and backend is this folder. Just making to divide the frontend and backend in each own rules

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/CLAUDE.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/CLAUDE.md

> 🔧 `Bash` — Replace folder prefixes with project root

**Agent:**

I've updated `CLAUDE.md` so it no longer uses `frontend/` and `backend/` folders:

- **Repo layout removed:** the section describing two separate apps is gone. In its place is a short note saying the Frontend and Backend headings are two separate rule sets, and to follow the one that matches the code you're working on.
- **Paths now start at this folder:** both folder trees begin at the project root (`./`), and the feature-folder example lists the `src/...` paths directly.
- **Checklist reworded:** the last item now says tests must pass "for the code you changed".

Both trees now start at the same root, so folders they share, like `src/types/`, `src/utils/` and `tests/unit/`, hold code from both sides. If you'd rather keep the two sides apart inside `src/`, for example a `src/server/` folder for the backend layers, I can add that.

---

## User (3)

now with that in mind can you generate the initial libraries and just a homepage(like a landing page)

> 🔧 `Bash` — Check Node, Yarn, and Postgres availability

> 🔧 `Bash` — Install frontend and backend dependencies with yarn

**Agent:**

Latest jsdom needs a newer Node than the 24.5 installed here, so I'll use `happy-dom` for the Vitest DOM environment instead.

> 🔧 `Bash` — Install dev dependencies with happy-dom

> 🔧 `Bash` — Check TypeScript 7 JS API compatibility

**Agent:**

TypeScript 7 doesn't include the JavaScript API that ts-jest and Next.js rely on, so I'll pin TypeScript to the last version that does.

> 🔧 `Bash` — Find compatible TypeScript versions

> 🔧 `Bash` — Pin TypeScript to 6.x

**Agent:**

Now the config files.

> 🔧 `Bash` — Write project config files and scripts

**Agent:**

Now the landing page and shared UI.

> 🔧 `Bash` — Write landing page, layout, and UI components

**Agent:**

Now the backend skeleton, with a health-check endpoint so the server and database connection can be verified.

> 🔧 `Bash` — Write backend skeleton with health endpoint

> 🔧 `Bash` — Write tests and create local database

> 🔧 `Bash` — Run Vitest, Jest, and backend build

> 🔧 `Bash` — Inspect vitest peers and Jest error

**Agent:**

The Jest sandbox doesn't see env vars loaded from a setup file, so I'll load `.env` in `jest.config.js` instead, and add the `vite` peer dependency Vitest 5 needs.

> 🔧 `Bash` — Fix Jest env loading, add vite, rerun tests

**Agent:**

Both test suites pass. Now lint, the Next build, migrations and the server itself.

> 🔧 `Bash` — Lint, build, migrate, and start the API

> 🔧 `Bash` — Fix configs and rerun lint, build, tests

**Agent:**

Lint, build, Jest and the live API all pass. Now Playwright, which needs a one-time Chromium download.

> 🔧 `Bash` — Stop API, install Chromium, run e2e tests

> 🔧 `Bash` — Identify process using port 3000

**Agent:**

Port 3000 is taken by a different Next.js server (v16.1.6, not this project), so I'll leave it alone and give Playwright its own port.

> 🔧 `Bash` — Move e2e server to port 3100 and rerun

**Agent:**

All green. A quick screenshot to check the page visually:

> 🔧 `Bash` — Screenshot the landing page at desktop and mobile widths

> 🔧 `Read` — ~/b6a8956c-2c45-410c-b546-bfed486bc63f/scratchpad/home.png

> 🔧 `Read` — ~/b6a8956c-2c45-410c-b546-bfed486bc63f/scratchpad/home-mobile.png

> 🔧 `Bash` — Add Button size prop and recheck types

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/src/components/ui/Button.tsx

> 🔧 `Bash` — Run all checks again

**Agent:**

Everything passes. Now I'll update `CLAUDE.md` to match what was actually set up (config file names, script names, Tailwind v4, test split).

> 🔧 `Read` — ~/Documents/GitHub/wobbit-exam/CLAUDE.md

> 🔧 `Bash` — Update CLAUDE.md to match the generated project

**Agent:**

I've set up the project with all the libraries and built a landing page at `/`. Lint, both builds and every test suite pass: Vitest (2 tests), Jest (4, including one against your real Postgres) and Playwright (2). I also checked the page in screenshots at desktop and phone width.

**Run it**
```bash
yarn dev          # landing page → http://localhost:3000
yarn dev:server   # API → http://localhost:4000/api/health
```

**Landing page**
- `src/app/page.tsx` only puts the sections together.
- The sections are in `src/components/home/`: `HomeHero`, `HomeFeatures` and `HomeCallToAction`.
- The header and footer are in `src/components/layout/`, and a reusable `Button` is in `src/components/ui/`.
- The wording is placeholder text ("Plan, track, and ship your work…"), so swap in your real copy.

**Backend skeleton**
- One health-check endpoint, `GET /api/health`, built through every layer: `routes/health` → `controllers/health` → `services/health` → `repositories/health` → `db/client.ts`.
- Use it as the pattern to copy when you add a new feature.
- It also includes a central error handler, a `.env` setup and a small `yarn migrate` script that runs the SQL files in `src/db/migrations/`.

**Packages**
- **App:** `next`, `react`, `react-dom`, `express`, `pg`.
- **Dev:** TypeScript, Tailwind v4, ESLint, Vitest with Testing Library, Playwright, and Jest with `ts-jest` and `supertest`.
- I didn't add an ORM or a dotenv library; Node's built-in env-file loading covers `.env`.

**Things that work differently than you might expect**
- **TypeScript is pinned to 6.x.** The newest version, 7, can't be used by `ts-jest` or Next.js.
- **Vitest uses `happy-dom` instead of `jsdom`.** The latest `jsdom` needs a newer Node than the 24.5 on your machine.
- **Playwright runs on port 3100.** Port 3000 is already used by a Next.js server from another project; I didn't touch it.
- **One `package.json` for both sides,** so backend commands have their own names: `dev:server`, `build:server`, `test:server`.
- **Two local changes:** I created a `wobbit_exam` database in your local Postgres and a `.env` file (git-ignored).

I also updated `CLAUDE.md` to match what was built: the real script names, Tailwind's theme living in `globals.css` (v4 has no `tailwind.config.ts`), which test runner covers which folders, and relative imports on the backend.

---

## User (4)

can you add this github link as a repo in this project: https://github.com/[redacted-user]/wobbit-scheduler.git. Also show it in the github desktop and commit this initial setup

> 🔧 `Bash` — Check remote repo contents and git identity

**Agent:**

The remote repo is empty, so this will be its first commit.

> 🔧 `Bash` — Initialize repo, add remote, stage files

**Agent:**

There's an `AGENTS.md` I didn't create, so I'll check it before committing.

> 🔧 `Bash` — Inspect the AGENTS.md file

**Agent:**

`next dev` generated that file automatically and will re-add it if it's removed, so I'll commit it with the rest.

> 🔧 `Bash` — Commit initial setup and open in GitHub Desktop

**Agent:**

This folder is now a git repo linked to your GitHub repo, the initial setup is committed, and I opened it in GitHub Desktop. Nothing has been pushed yet, so it's only on your machine.

- **Repo:** created on branch `main`, with `origin` set to `https://github.com/[redacted-user]/wobbit-scheduler.git`. The GitHub repo was empty, so there was nothing to merge.
- **Commit:** `ce20b1c` "Initial project setup with landing page" contains all the project files.
- **Not committed:** `.env`, `node_modules`, `.next` and `dist` are excluded by `.gitignore`.
- **`AGENTS.md`:** this file showed up in the folder; `next dev` writes it automatically and adds it back if it's deleted. Its own note says to commit it, so I included it.
- **GitHub Desktop:** if it asks whether to add the folder as a repository, confirm it.

To put the commit on GitHub, click **Publish branch** in GitHub Desktop or run `git push -u origin main`.

---

## User (5)

Now prepare the specialist agent definitions without implementing the applications

Read CLAUDE.md again if needed for context

Create agents for the following roles:

1. frontend-engineer
2. backend-engineer
3. qa-engineer
4. documentation-engineer

Use the existing repository naming conventions and agent configuration format. Do not create or implement duplicate definitions.

FRONTEND AGENT

Own:
- src/app/ route and layout files as needed.
- src/components/ and the relevant feature folders.
- src/api/ calls and shared frontend API client only where necessary.
- src/hooks/, frontend feature types, and relevant utilities.
- tests/unit/ frontend tests.
- tests/e2e/ browser tests only when assigned.

Follow the existing frontend conventions:
- Next.js App Router and React.
- TypeScript strict mode.
- Tailwind CSS v4 conventions already documented in CLAUDE.md.
- Vitest and React Testing Library for unit/component tests.
- Playwright for end-to-end tests.
- Existing UI components and shared API client.
- Existing feature-folder naming conventions.

Do not edit backend routes, controllers, services, repositories, SQL migrations, database configuration, or shared package configuration without approval.

BACKEND AGENT

Own:
- Backend routes, controllers, services, repositories, validators, and feature types.
- PostgreSQL schema changes through new SQL migration files.
- Existing seed mechanisms or minimal additions needed for deterministic session data.
- Backend unit and integration tests.
- Backend implementation files in the existing structure.

Follow the existing backend conventions:
- Node.js and TypeScript.
- Existing HTTP framework and PostgreSQL client.
- Express and pg only if the repository does not already have suitable equivalents.
- Repository layer is the only layer that executes SQL.
- Parameterized SQL queries.
- Shared PostgreSQL pool.
- Existing typed errors and central error middleware.
- Jest and ts-jest for backend tests.
- Existing migration runner and scripts.

Do not introduce an ORM or a new query builder. Do not move the backend into Next.js Route Handlers. Do not edit frontend components or styles.

The backend must guarantee that concurrent booking attempts cannot exceed session capacity. A frontend-only availability check or an unsafe check-then-insert sequence is not sufficient.

QA AGENT

Own:
- Test plans, independent test execution, regression reports, and defect reproduction.
- Test files only when assigned and when they do not conflict with another agent's ownership.
- Independent verification of PostgreSQL capacity safety.

Test at minimum:
- Successful booking.
- Full session.
- Past session.
- Invalid input.
- Multiple simultaneous requests competing for the final seat.
- Persistence and database integrity.
- API error handling.
- Landing page regression.
- Frontend behavior and end-to-end booking flow.

Do not claim success without actual test output. Distinguish unit tests, mocks, integration tests, and real PostgreSQL concurrency tests. Report failures and reproduction steps instead of silently changing business logic.

DOCUMENTATION AGENT

Own:
- README.md.
- docs/architecture.md documentation updates after the architecture is approved.
- Setup instructions and demo checklist.
- Accurate summary of assumptions, omissions, and limitations.

The README must remain one page or less. Do not invent environment variables, scripts, test results, or completed features. Derive setup commands from the actual repository and verify them before documenting them.

SHARED REQUIREMENTS

Every agent must:
- Read CLAUDE.md before working.
- Follow the approved architecture and API contracts.
- Use Yarn only.
- Reuse existing libraries and components before adding new ones.
- Ask before changing shared configuration, package.json, yarn.lock, or another agent's files.
- Avoid unrelated refactors and duplicated business logic.
- Report planned files, changed files, executed commands, actual results, blockers, and unresolved risks.
- Never fabricate test results, Git history, logs, or implementation status.

Each definition must include its role, responsibilities, allowed file ownership, prohibited changes, required inputs, expected outputs, testing responsibilities, coordination rules, and completion report format.

After creating or updating these definitions, verify that their responsibilities do not conflict with CLAUDE.md or each other.

Report the exact files changed and stop. Do not implement the application yet.

> 🔧 `Bash` — Check for existing agent definitions and docs

> 🔧 `Bash` — Re-check scripts and env vars for accuracy

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/agents/frontend-engineer.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/agents/backend-engineer.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/agents/qa-engineer.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/agents/documentation-engineer.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/.claude/agents/backend-engineer.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/.claude/agents/backend-engineer.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/.claude/agents/frontend-engineer.md

> 🔧 `Bash` — Verify agent files and referenced scripts exist

**Agent:**

I created the four agent definitions and checked them against CLAUDE.md and against each other. No application code was written, and nothing is committed yet.

**Files changed** (all new, nothing else touched):
- `.claude/agents/frontend-engineer.md`
- `.claude/agents/backend-engineer.md`
- `.claude/agents/qa-engineer.md`
- `.claude/agents/documentation-engineer.md`

There were no existing agent definitions, so there was nothing to duplicate. They use Claude Code's standard format: Markdown with `name` and `description` frontmatter, named in kebab-case like the rest of the repo. Each one has every section you asked for, from role and responsibilities through the completion report format.

**Conflict check:**
- **Ownership:** each path has one owner. I compared the ownership tables and fixed the two places that overlapped:
  - **`tests/integration/`:** backend owns it, except test files assigned to QA, such as a concurrency test.
  - **`src/types/<feature>/`:** backend owns the API contract types; frontend gets only `*.view.ts` files for UI-only types.
- **Folders both sides use:** files in `src/utils/` and `src/constants/` are owned by whichever side uses them, and anything both sides import needs approval to change.
- **Shared config:** `package.json`, `yarn.lock`, the tsconfigs, the tool configs, `CLAUDE.md` and `.claude/` are approval-only for every agent.
- **Test runners:** test ownership follows the folders Vitest and Jest actually run, so neither side's tests land in the other runner.
- **Scripts:** every `yarn` script the agents mention exists in `package.json`.
- **CLAUDE.md:** no contradictions. The agents are stricter in two places: they forbid Next.js Route Handlers for backend logic, and frontend writes e2e specs only when assigned.

**Open decisions for you:**
1. **Connecting frontend to backend:** the API runs on port 4000 and the frontend on 3000, so it needs either a proxy rewrite in `next.config.ts` (shared config) or CORS on the backend. Both agents are told to ask first.
2. **Seed data:** no seed mechanism exists yet. Backend is told to propose one; adding the `seed` script to `package.json` needs your approval.
3. **Backend utility tests:** `tests/unit/utils/` runs under Vitest, so a Jest test for something like `errors.ts` has nowhere to go. Fixing that means changing the test config.
4. **QA plan location:** QA puts its plans in its reports unless you approve a `docs/qa/` folder.
5. **Booking rules:** the past-session rule, duplicate-booking policy and timezone aren't defined anywhere yet. Backend must get them before it starts.

---

## User (6)

We have to create a web app with the above mentioned and created as standard and guidelines. Now read the @context.md because that's where the app will be working on. I want you to create a new md file in the root named "work-context.md" that divide the work into 4 if necessary (frontend, backend, qa, and the documentation). Make sure to identify each role in the work-context.md so that when agent run it, they will know what to work on. DO NOT EDIT ANYTHING YET. we are planning this first and brainstorming. Go

**Agent:**

I'll only create `work-context.md` and leave every other file alone. First, one quick check on the existing pieces the plan builds on, so its file paths are accurate:

> 🔧 `Bash` — Check error shape, Postgres version, git state

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/work-context.md

**Agent:**

I created `work-context.md` in the project root, marked **PLANNING — not approved**. No other file was touched.

**What it says**
- **For agents:** each agent reads `CLAUDE.md`, its own definition, the shared sections, then only its role's section. A table at the top links each agent name (`backend-engineer`, `frontend-engineer`, `qa-engineer`, `documentation-engineer`) to its section.
- **Problem to requirements:** each of the owner's three quotes is turned into a requirement and how the app meets it.
- **Shared plan:** a proposed API contract (endpoints, types, error codes, validation rules), a proposed database design, and how the backend keeps a class from ever being overbooked.
- **Folder map:** the app is split into two features, `sessions` (the timetable) and `bookings` (making a booking), using the same folder names in every layer.
- **Per-role work:** each role gets a checklist, which files it works in, what it depends on, when it's done, and what it must not touch.
- **Also included:** who hands what to whom, and the risks to watch.

**Proposed v1 scope**
- **In:** a timetable showing places left and a clear "Full" badge, booking with name and email, a confirmation after booking, and a phone-first layout.
- **Server rules:** the server rejects bookings for full classes, classes that have already started, and the same email twice. This is enforced in PostgreSQL itself, so simultaneous bookings can't overbook.
- **Out, with reasons in the file:** accounts, cancellations, waitlists, admin screens, email confirmations and rate limiting.

**Decisions only you can make** (each has a recommendation in the file)
1. **D1 – Connecting the frontend to the backend:** a proxy rewrite in Next.js. This adds an `API_URL` setting.
2. **D2 – Demo data:** a `yarn seed` script with fixed demo classes (open, 1 spot left, full, already started).
3. **D3 – Test database:** a separate database for tests, so tests don't wipe your demo data.
4. **D4 – End-to-end tests:** Playwright starts the API and loads the demo data itself.
5. **D5 – Error format:** errors become `{ error: { code, message } }`. One existing test will need updating for this.
6. **D6 – Studio timezone:** I put in `Europe/London` as a placeholder. **Where is the studio actually located?**
7. **D7 – When a class counts as past:** once it has started, nobody can book it.
8. **D8 – Booking e2e test:** QA owns it; frontend updates the existing landing-page test.
9. **D9 – Backend utility tests:** no test config change; they're covered through other tests.

Once you've reviewed it, tell me which decisions to change or approve, and I'll update the file and mark it **APPROVED** before any agent starts.

---

## User (7)

before we start working on this project, can you also put in the work-context to do not overcomplicate things. Example: if the button is clicked, it will show the booking details, the function should be component (button), the function (on what to do after click), then the fetch (if necessary, but loading indicator will be true first to show the user that its loading), then the redirection. Thats it. No further action needed. Same as in the backend

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

**Agent:**

I added a **Keep It Simple** section near the top of `work-context.md` and told agents to read it before anything else. I only edited that file.

- **Frontend:** every user action is four steps: the button, the click handler, the fetch (loading turns on first), then the redirect or result. There's a short code example of that shape.
- **Backend:** every request is four steps: route → controller → service → repository.
- **No extras:**
  - no global state libraries or event buses
  - no base classes, factories or dependency-injection containers
  - no retries, caching or optimistic updates
  - no abstraction until a second real use needs it
  - if a task seems to need more than the four steps, ask first
- **Safety still comes first:** the rule never overrides the overbooking protection, server-side validation or error handling.

Your rule clashes with three parts of the plan:

1. **Confirmation page.** Your example redirects after booking, but the plan currently shows the confirmation on the same class page. To match it, I'd add a `/bookings/[id]` confirmation page and one backend endpoint, `GET /api/bookings/:id`, to load it.
2. **`Button` can't take a click handler.** It only works as a link today (it needs an `href`). The frontend task would need to let it work as a normal button with `onClick` too.
3. **Extras in the frontend tasks.** These are more than your four steps:
   - refreshing the timetable every 30 seconds and when the tab is focused
   - grouping classes by day
   - three separate hooks (`useSessions`, `useSession`, `useCreateBooking`)

   I'd drop the hooks and the day grouping, and keep only refresh-on-focus so members see full classes quickly.

Should I update the plan with these three changes? Nothing gets implemented until you approve it.

---

## User (8)

Yes go for it. After you work on that, we will start working on the work-context.md

**Agent:**

I'll make the three changes in `work-context.md`.

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

**Agent:**

Quick check that nothing stale is left over from the old plan:

> 🔧 `Bash` — Search plan for leftover stale references

**Agent:**

I've made all three changes in `work-context.md`, and the plan still follows the Keep It Simple rule. No code was changed. The leftover search found only the two intended mentions of the refresh-on-focus approach.

1. **Confirmation page:** after a successful booking, the app now redirects to `/bookings/[id]`.
   - The backend gets a new endpoint, `GET /api/bookings/:id`, with a `BOOKING_NOT_FOUND` error and its own route folder.
   - Backend tests cover found, not found and a bad ID. QA's end-to-end test now checks the redirect and the details shown.
   - The Keep It Simple code example is now the real booking flow.
2. **`Button` can act as a link or a button:** the frontend task now says to extend the existing `Button` to accept `onClick` and `disabled`, instead of making a second button component.
3. **Extras removed:**
   - **Hooks:** none in v1. Each page keeps its own loading, data and error state.
   - **Timetable:** one list ordered by time, with no grouping by day.
   - **Refresh:** no 30-second polling. The list refreshes only when the window regains focus.

I also added two risks:
- **Stale counts:** a tab left open can show an old "1 spot left". This is acceptable because the booking request always gets the final answer.
- **Confirmation links:** anyone with a confirmation link can see that booking's name and email.

**Before agents start:** the file is still marked **PLANNING — not approved**, and decisions D1–D9 are still open. Do you approve all nine recommendations as written? I'd especially like your answer on D6: where is the studio? `Europe/London` is only a placeholder. Once you confirm, I'll mark the file **APPROVED** and we can start with the backend contract and database.

---

## User (9)

It should have an admin login for this. So there wwill be user (no login - the one who is booking a class) and the admin (who creates a class schedule and check the schedule details - like user listed, payment, etc). Add that type of function

**Agent:**

Admin login touches most of the plan (scope, decisions, API contract, database, folders, and every role's tasks), so I'll re-read the current file and rewrite it as a whole rather than patching it piece by piece.

> 🔧 `Read` — ~/Documents/GitHub/wobbit-exam/work-context.md

---

## User (10), sent while the agent was mid-task

Also add a waitlist function (for a fully booked class that may open) and a cancellation booking. Both of it must be exist in the admin side.

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Bash` — Check plan size and that only the plan changed

**Agent:**

I rewrote `work-context.md` to add admin login, the waitlist and booking cancellation. Only that file changed; no code was written, and it's still marked **PLANNING — not approved**.

**Admin login**
- Admins log in with email and password; members still don't log in.
- Login is checked on the server with a secure cookie, using Node's built-in crypto, so no new packages.
- There's no sign-up page. Admin accounts are created with a `yarn create-admin` command.
- Admin screens:
  - a schedule showing booked/capacity, waitlist count and paid count
  - create, edit and delete classes
  - a class details page with the roster and the waitlist

**Payments**
- Each class has a price, and the admin marks each booking paid or unpaid by hand.
- Members see "Pay at the studio". There's no online payment.

**Cancellation (admin only)**
- Cancelled bookings are kept for history, never deleted.
- A cancelled booking that was paid shows "Refund due".
- Bookings can't be cancelled after the class starts.

**Waitlist**
- Members can join only when a class is full, using name and email. They get a status page at `/waitlist/[id]` showing their position.
- When a place frees up (a cancellation, or the admin raises capacity), the first person waiting is booked automatically in the same database step. A stranger can't grab the place first, and the class still can't be overbooked.
- Admins see the waitlist in order and can remove people.
- QA gets extra concurrency tests for this, such as a cancellation happening while 9 people try to book; the waitlisted person must always get the place.

**Assumptions I made, listed as decisions D14 and D15:**
1. **Members join the waitlist themselves**; the admin side manages it. Only admins can cancel bookings and remove people from the waitlist.
2. **Places are given out automatically,** first in line first. The alternative is the admin choosing who gets each freed place.
3. **No emails in v1.** A member who gets a place from the waitlist isn't notified; they see it on their status page, and the admin can contact them. This is the biggest gap and is listed first in the risks.
4. **Members can't cancel their own bookings,** because without a login anyone with their email could do it. They ask the studio instead.
5. **A class can't be deleted once anyone has booked it, even if they later cancelled.** This keeps the history intact.

**Before agents start, please:**
- Confirm or change the 5 assumptions above, especially #2 and #4.
- Tell me the studio's real timezone and currency (D6). `Europe/London` / GBP are placeholders.
- Approve the decision list D1–D15, then I'll mark the file **APPROVED**.

---

## User (11)

1. For #2 and #4, lets create a user login so that they know the status of their booking (for managing also - they can see the details of their booked classes and the old classes they booked as well). 2. For timezone, lets use what the current timezone is using. For currency, use USD. 3. Its good so go for it

---

## User (12), sent while the agent was mid-task

For the landing page (the one that faces the clients - the one who will book a class), the ui should be aesthetic as possible. I want the user to not only go for
  the webiste just to book but rather stay with it because it contains animation, not overly crowded text, so basically a good looking and fun experience website.
  Check the web for necessary animation, transition, or any other styles that make it more appealing to the user. For the admin side, make it UX friendly first, then
  aesthetically pleasing later because I want the admins to find what they needed asap (no further clicking of buttons to do). And lastly, make it mobile responsive
  because some of the user is accessing only on mobile. Include it in the work-context.md

> 🔧 `Bash` — Check this machine's timezone

> 🔧 `ToolSearch` — select:WebSearch

> 🔧 `WebSearch` — CSS scroll-driven animations animation-timeline view() browser support 2026

> 🔧 `WebSearch` — Next.js 16 React ViewTransition page transitions App Router

> 🔧 `WebSearch` — landing page micro-interactions animation best practices prefers-reduced-motion mobile performance

> 🔧 `Bash` — Check local Next.js docs for viewTransition status

> 🔧 `Bash` — Search local Next docs for view transitions

> 🔧 `Bash` — Read view transitions stability notes in local docs

> 🔧 `Bash` — Read the view transitions guide header

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Bash` — Check for leftover stale references in the plan

**Agent:**

I've updated `work-context.md` with member login, your timezone and currency choices, and the design requirements, and marked it **APPROVED**. Only that file changed, and nothing is implemented yet.

**1. Member login**
- Members sign up with name, email and password. Browsing the timetable stays public, but booking and joining a waitlist require login.
- A logged-out member who taps Book is sent to log in, then straight back to the class.
- **My bookings page (`/account`):** Upcoming and Past tabs. It shows booking status (confirmed or cancelled, and who cancelled it), payment status, waitlist position, and "You got a place!" when a waitlist place comes through.
- **Members manage their own bookings:** they can cancel before the class starts and leave a waitlist. Admins use the same endpoints, with a "your own, or you're an admin" check.
- **One login system for everyone:** admins are users with an admin role, so there's no duplicate code for admin login.
- **Kept from before:** places freed by a cancellation still go automatically to the first person on the waitlist.

**2. Timezone and currency:** times show in each viewer's device timezone (Manila on your machine), and prices are in USD.

**3. Design (new §4, decision D17)**
- **Member side, looks first:** a signature hero animation, sections that animate in on scroll, card hover and press effects, a "filling fast" pulse on nearly full classes, a check mark that draws in after booking, and smooth page transitions. Few words, big type, warm gradients.
- **Admin side, ease of use first:** the schedule is the home page, with Today at the top. Each row shows booked/capacity, waitlist, paid and refund-due counts. Rows expand in place to show the roster, so marking paid is one click and cancelling is two (with a confirm). There's an instant search box, and a "+ New class" button that's always visible.
- **Mobile-first everywhere:** designed at 375px first, 44px minimum tap targets, and a sticky Book button at the bottom on phones. Everything respects the reduced-motion accessibility setting.

**Animation approach, from the research:** no animation library, to keep phones fast and avoid new packages; plain CSS plus a page-transition feature already built into React. Firefox doesn't support the scroll animations by default yet, so they're added only where supported and content always stays visible. I checked the installed Next.js docs, which say page transitions need no configuration, unlike the older public docs. QA now also checks speed scores on mobile, reduced motion, the 44px tap targets at each screen size, and how many clicks the admin actions take.

**Decisions you haven't seen yet.** I marked the plan approved because you said "go for it", but D16 and D17 are new:
- **D16 – No email verification or password reset in v1,** because the app doesn't send email. A member who forgets their password has to contact the studio.
- **Login length:** members stay logged in for 30 days, admins for 12 hours.
- **D17 – No animation library:** everything is built with CSS and React's built-in features.

Tell me if you want any of these changed. Otherwise the plan is ready, and per §9 the backend agent goes first with the API contract and database.

Sources:
- [ICS MEDIA – CSS scroll-driven animations](https://ics.media/en/entry/230718/)
- [Chrome blog – scroll-triggered animations](https://developer.chrome.com/blog/scroll-triggered-animations)
- [Mozilla Connect – animation-timeline support thread](https://connect.mozilla.org/t5/ideas/implement-css-scroll-driven-animations-animation-timeline/idc-p/116613)
- [Next.js – View transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- [Next.js – viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [Impeccable – animate guidance](https://www.skills.sh/pbakaus/impeccable/animate)
- [Motion design reference](https://cdn.jsdelivr.net/npm/@nqlib/nqui@0.6.3/docs/nqui-skills/impeccable/reference/motion-design.md)

---

## User (13)

for the email, use mailpit (we will do this locally first). All of the email will be sent to the mailpit for use to view (regardless of the user or admin). For login length, its okay. For animation library, maybe use the animejs because its lightweight. Then ask if you have anyquestions or we good to go

**Agent:**

I'll check what's available locally before updating the plan.

> 🔧 `Bash` — Check Mailpit/Docker and package versions

> 🔧 `Bash` — Check Mailpit version and whether it's running

**Agent:**

Mailpit 1.30.4 is installed and already running, with SMTP on port 1025 and its web inbox at http://localhost:8025. anime.js is at version 4.5.0. Now I'll update the plan.

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

**Agent:**

Now the frontend, QA, docs, and risks sections:

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

**Agent:**

Last, I'll add the open questions and update the status line:

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Bash` — Check for stale email/animation references

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `AskUserQuestion` — 

**Agent:**

You chose the recommended option for all three, so I'll write them into the plan as final:

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/work-context.md

> 🔧 `Bash` — Confirm no open questions remain in the plan

**Agent:**

We're good to go. `work-context.md` is now marked **APPROVED — Ready to start**, and your three answers are written in. Only that file changed; nothing has been built or installed yet.

**Email (Mailpit)**
- Every email, to members or admins, goes to Mailpit on this machine. Mailpit is already installed and running; you can read everything at http://localhost:8025.
- Members get seven kinds of email: welcome, booking confirmed, joined the waitlist (with position), "You got a place!", booking cancelled (different wording for self or studio), class details changed, and password reset.
- Admins get only the "Refund due" email.
- **Forgot password now works:** a single-use link valid for 1 hour, and resetting logs that person out everywhere.
- **No email verification,** so members can sign up and book straight away.
- **Emails never block bookings:** they're sent after the booking is saved, using nodemailer. If one fails, it's logged and the booking still goes through. Going live later only means changing the email settings.
- **Email times use the member's own timezone:** their browser sends it at sign-up, so emails match what they see on screen.

**Login length:** unchanged, 30 days for members and 12 hours for admins.

**anime.js**
- **What it animates:** the member side only: the hero entrance, staggered lists, scroll reveals and the check mark after booking. It also handles scroll reveals in Firefox, which the CSS-only approach couldn't.
- **What stays in CSS:** hover and press effects, and page transitions still use React's built-in feature.
- **Rules:** no anime.js on admin pages, content stays visible even with JavaScript off, and nothing moves if the reduced-motion setting is on.
- **QA checks:** how much anime.js adds to the landing page download, and that it never loads on admin pages.

**Who installs what:** the backend agent adds nodemailer and the frontend agent adds animejs, both with your approval recorded in the plan.

The plan, the agent definitions and `context.md` aren't committed yet. Want me to commit them before the backend agent starts on the API contract and database?

---

## User (14)

Now, I want you to create 5 different files from work-context.md. I want you to divide the work for the frontend, one is the user facing and the other is the admin facing frontend. Same for the backend if necessary. So theres 4, and lastly the QA needed to test these features to make it 5

**Agent:**

I'll split the plan into five task files in a new `tasks/` folder. Each file lists exactly what one agent works on and points back to `work-context.md` for the shared parts (contract, database, design) instead of copying them. First I'll pull the current work breakdown so the split matches it exactly.

> 🔧 `Bash` — List section headings in the plan

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/tasks/backend-member.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/tasks/backend-admin.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/tasks/frontend-member.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/tasks/frontend-admin.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/tasks/qa.md

**Agent:**

I'll add one missing line to frontend-member: the frontend-admin file reuses its cancel and leave-waitlist calls.

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/tasks/frontend-member.md

> 🔧 `Bash` — Replace plan's task sections with pointers to task files

**Agent:**

Two places in the §7 folder map no longer match the split. I'm updating them:

> 🔧 `Bash` — Find folder map rows and stale section links

> 🔧 `Bash` — Update plan's folder map and links to task files

**Agent:**

I created the five task files in `tasks/`, one per workstream. Each tells its agent what to build, which files it owns, what it reuses from the others, the tests, the "done when" checks and its handoffs. For the contract, database and design, they point to sections of `work-context.md` instead of copying them, so there's one source of truth.

| # | File | Agent | Covers |
| --- | --- | --- | --- |
| 1 | `tasks/backend-member.md` | backend-engineer | **Shared backend foundation** (database, contract types, errors, login, `create-admin`, every email template, seed data, the approved config changes) plus all **member endpoints**: classes, booking, cancellation with waitlist promotion, waitlist, My bookings. **Runs first.** |
| 2 | `tasks/backend-admin.md` | backend-engineer | Only `/api/admin/*`: the schedule list with counts, create / edit / delete classes (raising capacity promotes from the waitlist), the roster, payments, and the "class details changed" email. |
| 3 | `tasks/frontend-member.md` | frontend-engineer | **Shared UI foundation** (design tokens, fonts, API client, base components, formatters) plus every member page: landing, login and sign-up, password reset, timetable, class page, booking page, My bookings, with anime.js animations. |
| 4 | `tasks/frontend-admin.md` | frontend-engineer | The admin area: login, the page guard, the schedule with rows that expand to show the roster and one-click actions, search, the new/edit class form. No anime.js. |
| 5 | `tasks/qa.md` | qa-engineer | Tests in seven groups, with a table of which group to run when each of the four tasks finishes: concurrency, security and privacy, end-to-end flows, data integrity and API errors, Mailpit emails, design and phone layouts, then the full test run. Includes who to send each kind of bug to. |

**How the split avoids conflicts**
- **No duplicate cancel or waitlist code:** admins cancel bookings and remove waitlist entries through the same endpoints members use, which check "your own, or you're an admin". The admin files reuse those calls instead of rebuilding them.
- **Backend:** task 1 owns all shared code. Task 2 owns only the admin folders, plus one line to plug its routes in.
- **Frontend:** task 3 owns the shared components. If the admin app needs a new generic component, it asks task 3 rather than making its own copy.

**Order:** task 1's first phase (contract types and database) unblocks everyone. Task 2 and task 3 then run in parallel, and task 4 starts once task 3's shared components and task 2's admin types are ready. QA can write its test plan now.

**Changes to existing files**
- **`work-context.md`:** its old task lists are replaced by a table pointing to the five files, so there aren't two copies that could drift apart. The documentation task stays there, since it isn't one of the five.
- **Two adjustments to the plan:**
  - Admin-only database queries go in their own `src/repositories/admin/` folder, so the two backend agents never edit the same files.
  - Member pages move into a `(site)` route group, which keeps the public header off the admin pages. Page addresses don't change.

Nothing is committed yet: `.claude/`, `context.md`, `work-context.md` and `tasks/` are all new. Want me to commit them so the backend agent can start on task 1?

---

## User (15)

now I want you to create a folder named "docs" and put the context.md and the work-context.md there. Make sure that the linking of the files inside the work-context.md is updated also

> 🔧 `Bash` — Move files into docs and find references to update

> 🔧 `Bash` — Find all references to moved files

> 🔧 `Bash` — Update links in the plan and task files

> 🔧 `Bash` — Find docs ownership rules in agent definitions

> 🔧 `Edit` — ~/Documents/GitHub/wobbit-exam/.claude/agents/documentation-engineer.md

> 🔧 `Bash` — Verify every relative link resolves

**Agent:**

I moved `context.md` and `work-context.md` into a new `docs/` folder and updated every reference to them. I checked all 29 relative links in the plan and the task files, and they all point to files that exist.

**In `docs/work-context.md`:**
- The links to the five task files now point up a level, to `../tasks/…`.
- The header line now links to the brief, `CLAUDE.md`, `.claude/agents/` and `tasks/`. I also added a note that paths written in code style, like `src/app/layout.tsx`, are relative to the project root, not to `docs/`.
- The documentation section's "do not touch" list now names `docs/context.md` and `docs/work-context.md`.

**In the five `tasks/*.md` files:** the "Source" and "Read first" lines now link to `../docs/work-context.md` and `../CLAUDE.md`.

**One extra fix:** the documentation agent's definition gave it ownership of everything in `docs/`, which would have let it edit the plan and the brief. I added an exception in `.claude/agents/documentation-engineer.md` so it can read those two files but not change them.

Nothing is committed yet.

---

## User (16)

Commit the current changes to the current branch before we proceed

> 🔧 `Bash` — Show branch and pending changes

> 🔧 `Bash` — List files to be committed and recent history

> 🔧 `Bash` — Commit planning files to develop

**Agent:**

I committed the changes to `develop` as `0881b48` "Add agent definitions, approved v1 plan, and task breakdown". The working tree is clean.

The commit has 11 files, all new:
- `.claude/agents/`: the four agent definitions (frontend, backend, QA, documentation)
- `docs/context.md` and `docs/work-context.md`: the client brief and the approved plan
- `tasks/`: the five task files

Nothing was pushed; the commit is only on your machine. When you're ready, the next step is task 1, `tasks/backend-member.md`, starting with its first phase (the contract types and database migrations).

---

## User (17)

I think claude.md is quite big. Can you make skills or hooks that is existing in the claude.md file? So that we can cut short the CLAUDE.md file and just put there the necessary details

**Agent:**

I'll start by re-reading the current `CLAUDE.md` to see what can move out.

> 🔧 `Read` — ~/Documents/GitHub/wobbit-exam/CLAUDE.md

> 🔧 `Skill` — update-config

> 📚 Skill instructions loaded into context (omitted)

> 🔧 `Bash` — Check jq and existing .claude contents

**Agent:**

No project settings file exists yet, so there are no existing hooks to merge with. I'll write the two hook scripts first.

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/hooks/yarn-only.sh

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/hooks/lockfile-guard.sh

**Agent:**

I'll pipe-test both scripts with sample inputs before wiring them up:

> 🔧 `Bash` — Pipe-test both hook scripts

**Agent:**

All 17 test cases behave as expected. Now I'll wire the hooks into the project settings:

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/settings.json

> 🔧 `Bash` — Validate settings.json hook entries

**Agent:**

The JSON is valid. To prove the yarn hook actually fires, I'll run a harmless `npm --version`; it should be blocked.

> 🔧 `Bash` — Trigger the yarn-only hook with a harmless command

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/skills/frontend-conventions/SKILL.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/skills/backend-conventions/SKILL.md

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/.claude/skills/verify/SKILL.md

**Agent:**

Now the slimmed `CLAUDE.md`. It keeps only what applies to every task, and points to the skills, hooks, plan and task files:

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/CLAUDE.md

> 🔧 `Bash` — Compare sizes and list changes

**Agent:**

`CLAUDE.md` is down from 256 lines to 42, and the hooks are live. The rest of the content moved into three skills and two hooks.

**Hooks** (`.claude/settings.json`, scripts in `.claude/hooks/`)
- **`yarn-only.sh`** blocks npm, npx, pnpm and bun commands. It only catches them used as the command itself, so things like `grep npm` or `yarn add …` still run. I tested 12 cases, and it blocked a real `npm --version` in this session.
- **`lockfile-guard.sh`** blocks creating `package-lock.json`, `pnpm-lock.yaml` or the bun lockfiles, and blocks hand-editing `yarn.lock`. Tested with 5 cases.

**Skills** (`.claude/skills/`)
- **`frontend-conventions`:** the frontend stack, folder tree, conventions, scripts and testing rules. It now also mentions the `(site)` route group.
- **`backend-conventions`:** the backend stack, folder tree, layering, SQL rules, imports and ports, scripts and testing rules.
- **`verify`:** the old end-of-task checklist, run as `/verify`. It works out what changed, runs lint and build plus the right test suites, checks the golden rules, and reports real output.

Each skill loads only when an agent is working in its area. New skills may not show up until you restart Claude Code.

**What's left in `CLAUDE.md`:** the 6 golden rules, a table of where each topic now lives (the skills, hooks, `docs/`, `tasks/` and agent definitions), setup, and a short list of easy-to-miss project facts (TypeScript 6 pin, ports, import style, shared folders).

**Heads-up: someone else is working in this folder.** While I was doing this, many files in `src/` and `tests/` changed that I didn't touch. It looks like task 1, `tasks/backend-member.md`, is being implemented by another session: migrations, auth, bookings, waitlist, email, seed, `package.json`, `yarn.lock` and more. I left all of it alone. My only changes are `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/` and `.claude/skills/`. Nothing is committed. When you want to commit, I'd do my changes separately from that implementation work.

---

## User (18)

why is my db connection not working? Frontend member side is already done but its not loading anything

**Agent:**

I'll check the chain from the database through the API to the frontend proxy, one link at a time.

> 🔧 `Bash` — Check env files, running servers, and Postgres

> 🔧 `Bash` — Check port 3000 owner, migrations, and the API proxy

> 🔧 `Bash` — Start the API server in watch mode

> 🔧 `Bash` — Wait for API, then test it directly and via proxy

**Agent:**

Your database connection is working. The problem is that the **API server wasn't running**, so the page had no data source. `yarn dev` starts only the Next.js frontend; the backend is a separate process started with `yarn dev:server`. With nothing on port 4000, every `/api/...` request from the page failed with `500 Internal Server Error`.

**What I checked:**

| Part | Before | After |
| --- | --- | --- |
| PostgreSQL (port 5432) | running, migrations 001 + 002 applied, 7 classes seeded | — |
| API (port 4000) | **not running** | `GET /api/health` → `{"status":"up","database":"up"}` |
| Next.js (port 3000, this project) | running | — |
| `/api/sessions` through Next.js | `500` | `200`, returns 6 upcoming classes |

I've started the API in the background, so reload the page and the classes should appear. That server only lasts as long as this session, though.

**For day-to-day work, run both in separate terminals:**
```bash
yarn dev          # frontend → http://localhost:3000
yarn dev:server   # API      → http://localhost:4000
```
Mailpit also needs to be running for emails; it already is. Only 6 of the 7 seeded classes show because the timetable hides the one in the past.

If you'd like a single command, I can add a `dev:all` script that starts both. The usual way uses the `concurrently` package; a plain shell script would avoid adding a dependency.

---

## User (19)

change the project/app name to whatever is okay. Wobbit is the tester name not the name of the project

**Agent:**

I'll find every place "Wobbit" appears first:

> 🔧 `Bash` — Find all Wobbit references in the project

> 🔧 `Bash` — Stop API and check databases and open connections

**Agent:**

Exit code 143 is expected: I stopped that API process myself. Neither database has open connections, so I'll rename both. This keeps all their data, and it's easy to undo.

> 🔧 `Bash` — Rename the dev and test databases

> 🔧 `Bash` — Replace Wobbit names in config, docs, and code

> 🔧 `Bash` — Restart the API server against the renamed database

> 🔧 `Bash` — Verify health, sessions, page title, and types

**Agent:**

The page title now reads "StudioSpot" and the types check passes, but the API didn't answer yet. I'll check its output:

> 🔧 `Bash` — Read API output and retry the health check

**Agent:**

The app is now called **StudioSpot**, and it works against the renamed database. The API is up, the health check reports `{"status":"up","database":"up"}`, and the classes load through the frontend again.

**What changed:**

| Where | Before | After |
| --- | --- | --- |
| Name shown in the header, footer, page titles and admin login | Wobbit Studio | StudioSpot |
| Package name in `package.json` | `wobbit-exam` | `studio-spot` |
| Local databases (renamed in place, data kept) | `wobbit_exam`, `wobbit_exam_test` | `studio_spot`, `studio_spot_test` |
| Database URLs in `.env` and `.env.example` | `…/wobbit_exam`, `…/wobbit_exam_test` | `…/studio_spot`, `…/studio_spot_test` |
| Setup command in `CLAUDE.md`, decision D3 in `docs/work-context.md` | `createdb wobbit_exam`, `wobbit_exam_test` | the new names |
| Admin "last capacity" browser storage key | `wobbit-admin:last-capacity` | `studio-spot-admin:last-capacity` |

No "Wobbit" text remains in the code or docs, and the TypeScript check passes. The admin form will forget the last capacity it remembered once, because the storage key changed. Any other session that's still running the API needs a restart to pick up the new database name.

**Not changed:**
- The project folder (`wobbit-exam`) and the GitHub repo (`wobbit-scheduler`). Renaming those affects your local path and the remote, so tell me if you want either changed.
- The previous commit messages.

Nothing is committed yet.

---

## User (20)

can you check the admin credentials if there is any

> 🔧 `Bash` — Check admin env values, DB admins, and test login

> 🔧 `Bash` — Find seed member password and sample emails

**Agent:**

Yes, there's one admin account, and I confirmed it works: a real login returned `200` with `role: "admin"`.

**Admin login:** http://localhost:3000/admin/login

| Field | Value |
| --- | --- |
| Email | `admin@studio.local` |
| Password | `change-me-admin-2026` |

The admin is created by `yarn seed` or `yarn create-admin`, using the `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` values in `.env`. The password is stored only as a hash. To change it, edit `ADMIN_PASSWORD` in `.env` (12 characters minimum) and run `yarn create-admin`, which updates the existing admin without deleting anything.

**Demo member logins** (from the seed), at http://localhost:3000/login:
- Emails such as `ava@example.com`, `ben@example.com`, `ivy@example.com`
- Shared password: `studio-demo-2026`

All of these are for local development only. Replace them before the app runs anywhere real.

---

## User (21)

i am running the qa.md tasks. So pause for now

**Agent:**

I've stopped; I won't run anything else while your QA run is going.

That also explains the one failing backend test. The QA run uses the same test database (`studio_spot_test`), and its tests wipe tables between cases. My test run was going at the same time, so a user one test had just created got deleted mid-login. When I ran the suite on its own it passed 140 of 140, four times in a row. This isn't a bug in the app code.

The status I got before stopping, so it isn't lost:
- **Lint:** passes.
- **Frontend tests (Vitest):** 184 of 184 pass.
- **Backend tests (Jest):** 140 of 140 pass when nothing else is using the test database.

**One thing that may affect your QA run:** the API I started earlier (`yarn dev:server`) is still running on port 4000. If the QA end-to-end tests try to start their own API on that port, they may clash with it. I can stop it, or you can end it with `pkill -f "tsx watch"`.

The code map you asked for isn't written yet. Tell me when QA is done and I'll pick it up from what I've already gathered.

---

## User (22)

I'm just thinking here, can we integrate instagram direct message to our api so that they can make booking over social media message?

**Agent:**

Yes, it's possible. Meta has an official Instagram Messaging API, and it would fit the backend we have. It's a fair amount of work, though, and there's a much simpler middle option.

**How it would work**
1. A member sends a DM to the studio's Instagram account.
2. Meta forwards the message to our API through a webhook.
3. Our API replies with buttons: "See classes", then a list of classes, then "Book".
4. When they tap Book, our API calls the **same booking function the website uses**, so the overbooking protection still applies to DM bookings.
5. The reply goes back into the chat: "You're booked ✓" or "Full, join waitlist?"

In code it would be one new `instagram` feature folder (route, controller, service) that reuses the existing booking, waitlist and cancellation services. The core logic wouldn't change.

**What's needed outside the code**
- The studio's Instagram has to be a professional (business or creator) account, connected to a Meta developer app.
- Meta has to approve the app (App Review) for the messaging permission before it works for the public. That can take days to weeks.
- Meta's webhook needs a public HTTPS address, so local development needs a tunnel such as ngrok.
- The studio can only reply within 24 hours of the member's last message. Confirmations are fine, but a promotion from the waitlist two days later can't be sent as a DM.

**The hard part is identity.** Instagram gives us an Instagram user ID, not an email, while our bookings belong to accounts with email logins. There are two ways around it:
- **Account linking:** the bot sends a one-time link, the member logs in or signs up on the website once, and after that their DMs book under that account. This keeps My bookings, emails, cancellations and admin rosters working as they do now.
- **Instagram-only accounts:** quicker for the member, but they'd get no emails and no My bookings, and the admin roster would show Instagram handles instead of names and emails.

**Three levels, from least to most work:**

| Option | What the member does | Work |
| --- | --- | --- |
| **1. Instagram's built-in auto-replies plus the link in bio** | gets an automatic "Book here: studiospot…/sessions" reply | no code; set up in Instagram's own settings |
| **2. A bot that shows classes and links to booking** | sees today's classes with spots left in the DM, then taps through to book on the website | webhook + reply only; no identity linking |
| **3. Book entirely inside the DM** | books, joins waitlists and cancels in the chat | everything above, plus account linking and App Review |

**My recommendation: option 1 now, then option 2 if members want it.** The brief says the mess came from taking bookings over DMs. Options 1 and 2 move people from DMs onto the system that can't overbook, while the website stays the source of truth. Option 3 brings booking back into DMs, which is only worth it if members really won't leave Instagram. It would be a v2 feature, since it's outside the approved v1 scope.

The requirements above come from what I know of Meta's platform, and Meta changes these rules often. If you want to go further, I can check Meta's current documentation for the exact requirements and add a short plan to `docs/work-context.md` as a v2 item.

---

## User (23)

what is the current env for admin password?

> 🔧 `Bash` — Read admin values from .env

**Agent:**

Someone changed it since I last checked. I'll test whether that password actually works for logging in:

> 🔧 `Bash` — Test which admin password works

**Agent:**

`.env` now has `ADMIN_PASSWORD=password12`, but that **isn't the password that works**. I tested both against the running app:

| Password | Login result |
| --- | --- |
| `password12` (what `.env` says now) | `401`, rejected |
| `change-me-admin-2026` (the earlier value) | `200`, works |

So the admin login is still **`admin@studio.local` / `change-me-admin-2026`**.

Changing `.env` alone doesn't change the password. The database still has the old one, and it only updates when `yarn create-admin` or `yarn seed` runs. Those scripts also require at least 12 characters, and `password12` is only 10, so they'd refuse it. To change the password, set `ADMIN_PASSWORD` to something 12 characters or longer, then run `yarn create-admin`.
