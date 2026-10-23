---
name: verify
description: Pre-finish checklist for this repo. Runs lint, builds, and the right test suites for what changed, then checks reuse and folder placement. Use before reporting any task as done, or when the user runs /verify.
---

# Verify before finishing

Run these in order and **report the real output**. Never claim a pass you didn't see.

## 1. Find what changed

```bash
git status --short
git diff --stat HEAD
```

Classify each changed file as **frontend** (`src/app`, `src/components`, `src/api`, `src/hooks`, `tests/unit/{components,hooks,api,utils}`, `tests/e2e`), **backend** (`src/server.ts`, `src/create-app.ts`, `src/{routes,controllers,services,repositories,validators,middlewares,db,config}`, `tests/unit/{controllers,services,repositories,middlewares,validators,db}`, `tests/integration`), or **shared** (`src/types`, `src/utils`, `src/constants`, config files).

## 2. Always run

```bash
yarn lint
yarn build          # Next.js build + whole-project type check
```

## 3. Run by area

| Changed | Run |
| --- | --- |
| frontend or shared | `yarn test` |
| a user-facing flow, route, or e2e spec | `yarn test:e2e` |
| backend or shared | `yarn test:server` and `yarn build:server` |
| `src/db/migrations/` | `yarn migrate` on a fresh database, then a second run that's a no-op |

## 4. Review the diff against the golden rules

- [ ] Used `yarn` for every install and script. (The hooks block npm, npx, pnpm and bun, and any other lockfile.)
- [ ] Added no package that wasn't needed. Any new dependency is justified in the report.
- [ ] Reused existing functions and components. No duplicated logic.
- [ ] Every file is in the right **type** folder and the right **feature** subfolder, with names that match across layers.
- [ ] New code has tests in the mirrored location under `tests/`.

## 5. Report

List the commands you ran with their exit codes and pass/fail counts. Paste any failure verbatim, and list anything you skipped along with the reason.
