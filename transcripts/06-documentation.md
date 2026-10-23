# Session 6: README and documentation

Exported from the raw Claude Code session log for this project. Your messages, the agent's replies, and each tool call (with its one-line description) are included in order.
Tool outputs, system prompts and file contents are omitted.

---

## User (1)

Read CLAUDE.md, docs, and the existing agents in the .claude/agents folder or any necessary documents for you to have context. You are a documentation-engineer. Create a README.md file in the root covering what we buildcovering what we build

> 🔧 `Bash` — Read agent definition, package.json, and repo layout

> 🔧 `Bash` — Read client brief and approved plan

> 🔧 `Bash` — Inspect config, routes, db, and app pages

> 🔧 `Bash` — List plan headings and API routes

> 🔧 `Bash` — Read scope, decisions, concurrency, and docs tasks

> 🔧 `Bash` — Check seed logins, tests layout, and local tooling

**Agent:**

I've read the brief, plan, routes, config and seed. Next I'm running the documented commands so the README only lists ones I've checked.

> 🔧 `Bash` — Run migrate, seed, and create-admin

> 🔧 `Bash` — List .env keys and admin password length only

> 🔧 `Bash` — Verify migrate, seed, create-admin on a scratch database

**Agent:**

Setup works with the example values. Now the lint, test, and build scripts.

> 🔧 `Bash` — Run lint, frontend tests, backend tests

> 🔧 `Bash` — Rerun lint, get test counts, run builds

**Agent:**

Lint, both test suites, and both builds pass. Last, the e2e suite, pointed at the scratch DB if ports 3100 and 4000 are free.

> 🔧 `Bash` — Check whether app ports are in use

> 🔧 `Bash` — Drop the scratch verification database

> 🔧 `Write` — ~/Documents/GitHub/wobbit-exam/README.md

> 🔧 `Bash` — Verify the concurrency test filter command

**Agent:**

I've written `README.md` in the repo root, 67 lines. It covers what the app is (members and admins), the guarantee that a class can't be overbooked, the stack, prerequisites, setup, how to run it, demo logins, tests, and what v1 assumes and leaves out.

**What I checked before documenting it:**
- **Setup steps:** `yarn migrate`, `yarn seed` and `yarn create-admin` all worked on a fresh throwaway database (since dropped), using the `.env.example` values. The seed created 15 members, 7 classes and 37 bookings.
- **Lint and builds:** `yarn lint`, `yarn build` and `yarn build:server` all completed without errors.
- **Frontend tests:** `yarn test` passed (33 files, 184 tests).
- **Backend tests:** `yarn test:server` passed (20 suites, 147 tests), and the concurrency-only run passed (3 suites, 11 tests).
- **Not run:** `yarn test:e2e`. You already have an API running on port 4000, and Playwright would reuse it and change your dev database. I also didn't start Mailpit or the dev servers myself, because they're already running.

**Problems I found:**
- **Your local `.env` has a 10-character `ADMIN_PASSWORD`.** Admin passwords need at least 12, so `yarn seed` and `yarn create-admin` fail on your machine. The `.env.example` value works, so a fresh checkout is fine. You just need a longer password locally.
- **`docs/architecture.md` doesn't exist yet.** I didn't link to it and pointed readers to `docs/work-context.md` and `docs/context.md` instead. I didn't write it because it should wait until the architecture is approved.

The demo checklist from the plan isn't in the README because it wouldn't fit on one page. It would sit better in its own doc under `docs/`.