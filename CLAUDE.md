# CLAUDE.md

Guidance for Claude (and any AI agent) working in this repository.

## Golden Rules

1. **ALWAYS use `yarn`.** Never use `npm`, `npx`, `pnpm`, or `bun`.
   - Install: `yarn install`
   - Add a dependency: `yarn add <pkg>` / `yarn add -D <pkg>`
   - Run a binary: `yarn <bin>` (e.g. `yarn playwright install`), not `npx`.
   - Never commit `package-lock.json` or `pnpm-lock.yaml`; `yarn.lock` is the only lockfile.
2. **Don't install unnecessary packages.** Check `package.json` first and reuse what is already installed. Only add a package when nothing existing (including the stack's built-ins) can do the job, and say why.
3. **Reuse before you write.** Search for an existing function, hook, component, type, or service before creating a new one. Extend or generalize the existing one instead of copying it.
4. **Avoid duplication.** If the same logic appears in two places, move it into the shared folder (`components/ui`, `utils`, `types`, etc.) and import it from both.
5. **Follow the folder structure below.** Every file goes in the folder that describes *what it is*, and inside that, the folder named after the *feature it belongs to*.

## How This File Is Organized

The **Frontend** and **Backend** sections below are separate rule sets. Follow the section for the kind of code you're working on. Both live in this one folder and share a single `package.json`, and all paths are relative to it (the project root). `src/types/`, `src/utils/` and `src/constants/` are shared by both sides.

### Setup

```bash
yarn install
cp .env.example .env            # then set DATABASE_URL
createdb wobbit_exam            # local PostgreSQL database
yarn migrate
yarn playwright install chromium
```

Keep TypeScript on 6.x. TypeScript 7 doesn't include the JavaScript compiler API, which `ts-jest` and Next.js need.

---

## Folder Structure Principles

These apply to **both** frontend and backend.

- **Group by type first, then by feature.** The top-level folder says what kind of file it is (`components`, `services`, `api` ...). The subfolder says which feature it belongs to (`home`, `auth`, `user` ...).
- **Feature folder names match across every layer.** If a feature is called `home`, it is `home/` everywhere it appears:

  ```
  # frontend
  src/app/home/           # page
  src/components/home/    # components used by that page
  src/api/home/           # API calls for that page
  src/hooks/home/         # hooks for that page
  src/types/home/         # types for that page

  # backend
  src/routes/home/
  src/controllers/home/
  src/services/home/
  src/repositories/home/
  ```

  This way you can find everything about a feature by looking for the same folder name in each layer.
- **Shared/generic code** that isn't tied to one feature goes in a `shared/` (backend) or `ui/` (frontend components) subfolder, or in a top-level `utils/`, `constants/`, `config/` folder.
- **One responsibility per file.** File names describe what the file does (`get-home-stats.ts`, `HomeHeader.tsx`).
- **Every feature folder has an `index.ts`** that re-exports its public pieces, so imports stay short: `import { HomeHeader } from '@/components/home'`.
- **Tests mirror the source tree.** A test for `src/services/home/get-home-stats.ts` lives at `tests/unit/services/home/get-home-stats.test.ts`.
- Don't create a new top-level folder if an existing one fits.

---

## Frontend

### Stack

| Concern   | Tool                     |
| --------- | ------------------------ |
| Framework | Next.js (App Router)     |
| UI        | React                    |
| Language  | TypeScript (strict mode) |
| Styling   | Tailwind CSS             |
| Unit/component tests | Vitest (+ React Testing Library) |
| E2E tests | Playwright               |

### Folder Structure

```
./                              # project root
├── public/                     # static assets (images, icons, fonts)
├── src/
│   ├── app/                    # Next.js routes ONLY (page.tsx, layout.tsx, loading.tsx, error.tsx)
│   │   ├── layout.tsx
│   │   ├── page.tsx            # "/" route
│   │   ├── globals.css         # Tailwind directives + global styles
│   │   └── home/
│   │       └── page.tsx        # "/home" route — composes components from components/home
│   ├── components/
│   │   ├── ui/                 # generic, reusable building blocks (Button, Input, Modal, Card)
│   │   ├── layout/             # app shell pieces (Header, Footer, Sidebar)
│   │   └── home/               # components specific to the home feature
│   │       ├── HomeHeader.tsx
│   │       └── index.ts
│   ├── api/                    # calls to the backend
│   │   ├── client.ts           # single shared fetch wrapper (base URL, headers, error handling)
│   │   └── home/
│   │       ├── get-home-stats.ts
│   │       └── index.ts
│   ├── hooks/
│   │   ├── shared/             # generic hooks (useDebounce, useDisclosure)
│   │   └── home/               # hooks for the home feature (useHomeStats)
│   ├── types/
│   │   ├── shared/
│   │   └── home/
│   ├── utils/                  # pure helper functions (formatDate, cn)
│   └── constants/              # app-wide constants (routes, config values)
├── tests/
│   ├── unit/                   # Vitest — mirrors src/ (components/home/HomeHeader.test.tsx)
│   ├── e2e/                    # Playwright — one spec per feature (home.spec.ts)
│   └── setup/vitest.ts         # Vitest setup (jest-dom matchers, cleanup)
├── next.config.ts
├── postcss.config.mjs          # Tailwind v4 plugin (theme lives in globals.css via @theme)
├── eslint.config.mjs
├── tsconfig.json               # includes "@/*" -> "src/*" path alias
├── vitest.config.mts
├── playwright.config.ts
└── package.json
```

### Conventions

- `app/` contains routing files only. Keep pages thin: fetch data and compose components; put UI in `components/<feature>/` and logic in `hooks/<feature>/` or `api/<feature>/`.
- Use Server Components by default. Add `'use client'` only when the component needs state, effects, or browser APIs.
- Components: PascalCase file names (`HomeHeader.tsx`), named exports, props typed with an interface (`HomeHeaderProps`).
- Hooks: `useXxx.ts`. Other files: kebab-case (`get-home-stats.ts`).
- Style with Tailwind utility classes. No CSS modules, styled-components, or inline `style` unless there's no alternative. Use the shared `cn()` helper (`utils/cn.ts`) for conditional classes.
- Tailwind is v4: there is no `tailwind.config.ts`. Add design tokens (colors, fonts) in the `@theme` block of `src/app/globals.css`.
- `cn()` only joins classes, it doesn't resolve conflicts. Don't override a component's built-in classes via `className` (e.g. `py-2` over `py-3`); add a prop like `size` or `variant` instead.
- All backend requests go through `api/client.ts`. Never call `fetch` to the backend directly from a component.
- Use the `@/` import alias instead of long relative paths.
- Before making a new UI component, check `components/ui/` first.

### Scripts

```bash
yarn dev            # Next.js dev server (http://localhost:3000)
yarn build          # production build (also type-checks the whole project)
yarn start          # run the production build
yarn lint           # ESLint (whole project)
yarn test           # Vitest (unit/component)
yarn test:watch     # Vitest watch mode
yarn test:e2e       # Playwright (starts its own dev server on port 3100)
yarn playwright install chromium   # one-time browser install
```

### Testing

- **Vitest** for utils, hooks, and components. Use React Testing Library and test behavior (what the user sees and does), not implementation details.
- **Playwright** for end-to-end user flows, one spec per feature in `tests/e2e/`. `playwright.config.ts` starts the app via `webServer` with `yarn dev --port 3100`.
- Vitest runs only `tests/unit/{components,hooks,api,utils}/**`, with the `happy-dom` environment. Import `describe`/`it`/`expect` from `vitest` explicitly.
- New components, hooks, and utils should come with unit tests. New user-facing flows should come with an e2e spec.

---

## Backend

### Stack

| Concern  | Tool                     |
| -------- | ------------------------ |
| Runtime  | Node.js                  |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL               |
| Tests    | Jest (with `ts-jest`)    |

Use whatever HTTP framework and Postgres client are already in `package.json`. If none exist yet, use Express and `pg` (node-postgres). Don't add an ORM or query builder unless asked.

### Folder Structure

```
./                              # project root
├── src/
│   ├── server.ts               # entry point: starts the HTTP server
│   ├── create-app.ts           # builds the Express app, registers middlewares + routes (no listen)
│   ├── config/                 # env loading and typed config (env.ts)
│   ├── routes/                 # URL → controller mapping only
│   │   ├── index.ts            # mounts all feature routers
│   │   └── home/
│   │       └── index.ts
│   ├── controllers/            # HTTP layer: read req, validate, call service, send res
│   │   └── home/
│   │       ├── get-home-stats.controller.ts
│   │       └── index.ts
│   ├── services/               # business logic — no req/res, no raw SQL
│   │   └── home/
│   │       ├── get-home-stats.service.ts
│   │       └── index.ts
│   ├── repositories/           # the ONLY layer that talks to PostgreSQL
│   │   └── home/
│   │       ├── home.repository.ts
│   │       └── index.ts
│   ├── db/
│   │   ├── client.ts           # single shared Postgres pool
│   │   ├── migrate.ts          # applies new files in migrations/ (yarn migrate)
│   │   └── migrations/         # ordered SQL migrations (001_create_users.sql)
│   ├── middlewares/            # auth, error handler, request logging, validation
│   ├── validators/             # request schemas, grouped by feature (validators/home/)
│   ├── types/
│   │   ├── shared/
│   │   └── home/
│   ├── utils/                  # pure helpers (logger, errors, pagination)
│   └── constants/
├── tests/
│   ├── unit/                   # mirrors src/ (services/home/get-home-stats.service.test.ts)
│   └── integration/            # API + DB tests per feature (home.test.ts)
├── jest.config.mjs             # also loads .env for tests
├── tsconfig.server.json        # backend-only build (CommonJS, outputs to dist/)
├── .env.example                # document every env var here; never commit .env
└── package.json
```

### Conventions

- **Layered flow, one direction only:** `routes → controllers → services → repositories → db`. A layer never imports from a layer above it.
- Repositories own all SQL. Always use parameterized queries (`$1, $2`). Never build SQL with string concatenation.
- Use one shared pool from `db/client.ts`. Never create a new pool or connection elsewhere.
- Schema changes go through a new file in `db/migrations/`. Never edit a migration that has already been applied.
- Throw typed errors from `utils/errors.ts`. Let the central error middleware turn them into HTTP responses; don't send error responses from deep inside services.
- Read config through `config/`. Never read `process.env` directly elsewhere.
- File naming: kebab-case with a layer suffix (`get-home-stats.service.ts`, `home.repository.ts`).
- Backend code uses **relative imports** (`../../services/home`), not `@/`. `tsc` doesn't rewrite path aliases, so `@/` would break the compiled server.
- Backend code must never import from frontend folders (`app/`, `components/`, `hooks/`, `api/`).
- The API runs on `SERVER_PORT` (default 4000). Don't use `PORT`, because `next dev` reads it too.
- The health check is at `GET /api/health`. Use the `health` feature as the reference example for a new feature's routes, controller, service and repository.

### Scripts

```bash
yarn dev:server         # API in watch mode (http://localhost:4000)
yarn build:server       # compile to dist/
yarn start:server       # run the compiled API
yarn test:server        # Jest (unit + integration)
yarn test:server:watch  # Jest watch mode
yarn migrate            # apply pending database migrations
```

### Testing

- Jest runs only `tests/unit/{controllers,services,repositories,middlewares,validators,db}/**` and `tests/integration/**`.
- **Unit tests** (`tests/unit/`): test services with repositories mocked (`jest.mock`).
- **Integration tests** (`tests/integration/`): hit the routes against a real test PostgreSQL database (`DATABASE_URL` in the test env). Reset data between tests.
- New services and endpoints should come with tests.

---

## Checklist Before Finishing a Task

- [ ] Used `yarn` for every install and script.
- [ ] Didn't add packages that weren't needed; reused existing ones.
- [ ] Searched for and reused existing functions/components; no duplicated logic.
- [ ] Files are in the correct type folder **and** the correct feature subfolder, with names matching across layers.
- [ ] `yarn lint` and `yarn build` pass, plus the tests for the code you changed: `yarn test` / `yarn test:e2e` for frontend, `yarn test:server` for backend.
