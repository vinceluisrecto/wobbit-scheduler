# CLAUDE.md

Guidance for Claude (and any AI agent) working in this repository: a studio class-booking web app with a Next.js frontend and an Express + PostgreSQL backend in **one folder with one `package.json`**.

## Golden rules

1. **Always use `yarn`**: `yarn install`, `yarn add <pkg>`, `yarn add -D <pkg>`, `yarn <bin>`. Never npm, npx, pnpm, or bun. `yarn.lock` is the only lockfile. *(Enforced by hooks.)*
2. **Don't install unnecessary packages.** Check `package.json` first. Add a package only when nothing installed (or built in) can do the job, and say why.
3. **Reuse before you write.** Search for an existing function, component, type, or service, and extend it rather than copying it.
4. **Avoid duplication.** Shared logic goes in a shared folder (`components/ui`, `utils`, `types`, ...) and is imported from both places.
5. **Group by type first, then by feature.** The top-level folder says what a file *is* (`components`, `services`, ...). The subfolder is the *feature*, and **feature folder names match across every layer** (`components/booking`, `api/booking`, `services/booking`, `repositories/booking`).
6. **Tests mirror `src/`** under `tests/`.

## Where the details live

| Topic | Location |
| --- | --- |
| Frontend stack, folders, conventions, scripts, tests | skill **`frontend-conventions`** (`.claude/skills/frontend-conventions/`) |
| Backend stack, folders, layering, SQL rules, scripts, tests | skill **`backend-conventions`** (`.claude/skills/backend-conventions/`) |
| Pre-finish checklist (lint, build, tests, rule review) | skill **`verify`**; run it before reporting a task as done (`/verify`) |
| Yarn-only and lockfile enforcement | hooks in `.claude/settings.json` → `.claude/hooks/` |
| Client brief and the approved v1 plan (scope, API contract, data model, design) | `docs/context.md`, `docs/work-context.md` |
| Per-agent task lists | `tasks/*.md` |
| Agent roles | `.claude/agents/*.md` |

## Setup

```bash
yarn install
cp .env.example .env            # then set DATABASE_URL
createdb studio_spot            # local PostgreSQL
yarn migrate
yarn playwright install chromium
```

## Project facts that are easy to get wrong

- **Shared folders:** `src/types/`, `src/utils/` and `src/constants/` are used by both frontend and backend.
- **TypeScript stays on 6.x.** TypeScript 7 doesn't include the JavaScript compiler API that `ts-jest` and Next.js need.
- **Ports:** Next.js on 3000, the API on `SERVER_PORT` (default 4000), Playwright's own server on 3100.
- **Imports:** frontend code uses the `@/` alias; backend code uses relative imports only.
- **Next.js:** read `node_modules/next/dist/docs/` for current APIs before writing Next code (see `AGENTS.md`).
