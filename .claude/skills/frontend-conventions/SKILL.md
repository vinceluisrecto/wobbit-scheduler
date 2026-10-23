---
name: frontend-conventions
description: Frontend rules for this repo (Next.js App Router, React, TypeScript strict, Tailwind v4, Vitest, Playwright). Use before creating or editing anything in src/app, src/components, src/api, src/hooks, frontend utils/constants/types, tests/unit/{components,hooks,api,utils} or tests/e2e.
---

# Frontend conventions

## Stack

| Concern | Tool |
| --- | --- |
| Framework | Next.js (App Router) |
| UI | React |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Unit/component tests | Vitest + React Testing Library (`happy-dom`) |
| E2E tests | Playwright |

## Folder structure

```
public/                     # static assets (images, icons, fonts)
src/
├── app/                    # Next.js routing files ONLY (page.tsx, layout.tsx, loading.tsx, error.tsx)
│   ├── layout.tsx          # root: html, body, fonts
│   ├── globals.css         # Tailwind import + @theme tokens + global styles
│   ├── (site)/             # member-facing route group (URLs don't include "(site)")
│   │   ├── layout.tsx      # public Header + Footer
│   │   ├── page.tsx        # "/"
│   │   └── <feature>/page.tsx
│   └── admin/              # admin area, with its own layout
├── components/
│   ├── ui/                 # generic building blocks (Button, Input, Badge, ...)
│   ├── layout/             # app shell (Header, Footer)
│   └── <feature>/          # feature components + index.ts
├── api/
│   ├── client.ts           # the single shared fetch wrapper
│   └── <feature>/          # API calls per feature + index.ts
├── hooks/
│   ├── shared/
│   └── <feature>/
├── types/<feature>/
├── utils/                  # pure helpers (cn, formatters)
└── constants/
tests/
├── unit/                   # Vitest; mirrors src/ (components/<feature>/X.test.tsx)
├── e2e/                    # Playwright; one spec per feature (<feature>.spec.ts)
└── setup/vitest.ts
```

**Feature folder names match across every layer.** A `booking` feature is `booking/` in `app`, `components`, `api`, `hooks`, `types`, and in the backend layers too.

## Conventions

- **`app/` holds routing files only.** Keep pages thin: they fetch data and compose components. UI goes in `components/<feature>/`, and logic in `api/<feature>/` (or `hooks/<feature>/`).
- **Components:**
  - Use Server Components by default. Add `'use client'` only when a component needs state, effects, or browser APIs.
  - PascalCase file names (`HomeHero.tsx`), named exports, and props typed with an interface (`HomeHeroProps`).
- **File naming:** hooks are `useXxx.ts`; everything else is kebab-case (`get-session.ts`). Every feature folder has an `index.ts` that re-exports it.
- **Styling:**
  - Style with Tailwind utilities. No CSS modules, styled-components, or inline `style` unless there's no alternative.
  - **Tailwind is v4:** there's no `tailwind.config.ts`. Design tokens go in the `@theme` block of `src/app/globals.css`.
  - Use `cn()` (`@/utils/cn`) for conditional classes. It only *joins* classes and doesn't resolve conflicts, so never override a component's built-in classes through `className` (e.g. `py-2` over `py-3`). Add a prop like `size` or `variant` instead.
- **Data:**
  - All backend requests go through `src/api/client.ts`. Never `fetch` the backend directly from a component.
  - Don't write Next Route Handlers, Server Actions, or middleware for business logic; that lives in the Express backend.
- **Imports:** use the `@/` alias instead of long relative paths.
- **Reuse:** check `components/ui/` before making a new UI component, and extend an existing one with a prop instead of copying it.

## Scripts

```bash
yarn dev            # Next.js dev server (http://localhost:3000)
yarn build          # production build (also type-checks the whole project)
yarn lint           # ESLint (whole project)
yarn test           # Vitest
yarn test:watch     # Vitest watch mode
yarn test:e2e       # Playwright (starts its own dev server on port 3100)
yarn playwright install chromium   # one-time browser install
```

## Testing

- **Vitest** runs only `tests/unit/{components,hooks,api,utils}/**`, in `happy-dom`.
  - Import `describe` / `it` / `expect` from `vitest` explicitly.
  - Test behavior (what the user sees and does), not implementation details.
  - Mock at the `src/api/` boundary.
- **Playwright:** one spec per feature in `tests/e2e/`. `playwright.config.ts` starts the app with `yarn dev --port 3100`.
- New components, hooks, and utils come with unit tests. New user-facing flows come with an e2e spec.
