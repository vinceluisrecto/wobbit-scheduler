---
name: backend-conventions
description: Backend rules for this repo (Node.js, TypeScript strict, Express, PostgreSQL via pg, Jest). Use before creating or editing anything in src/server.ts, src/create-app.ts, src/routes, src/controllers, src/services, src/repositories, src/validators, src/middlewares, src/db, src/config, backend utils/types, tests/unit/{controllers,services,repositories,middlewares,validators,db} or tests/integration.
---

# Backend conventions

## Stack

| Concern | Tool |
| --- | --- |
| Runtime | Node.js |
| Language | TypeScript (strict mode) |
| HTTP | Express (already installed) |
| Database | PostgreSQL via `pg` (already installed) |
| Tests | Jest + `ts-jest`, `supertest` for integration |

Don't add an ORM or a query builder.

## Folder structure

```
src/
├── server.ts               # entry point: starts the HTTP server
├── create-app.ts           # builds the Express app, registers middlewares + routes (no listen)
├── config/                 # env loading and typed config (env.ts)
├── routes/                 # URL → controller mapping only
│   ├── index.ts            # mounts all feature routers under /api
│   └── <feature>/index.ts
├── controllers/<feature>/  # HTTP layer: read req, validate, call service, send res
├── services/<feature>/     # business logic; no req/res, no raw SQL
├── repositories/<feature>/ # the ONLY layer that talks to PostgreSQL
├── validators/<feature>/   # request validation
├── middlewares/            # auth, error handler, etc.
├── db/
│   ├── client.ts           # the single shared Postgres pool
│   ├── migrate.ts          # applies new files in migrations/ (yarn migrate)
│   └── migrations/         # ordered SQL files (001_create_users.sql)
├── types/<feature>/
├── utils/                  # pure helpers (errors, ...)
└── constants/
tests/
├── unit/                   # mirrors src/ (services/<feature>/x.service.test.ts)
└── integration/            # API + real DB per feature (<feature>.test.ts)
jest.config.mjs             # also loads .env for tests
tsconfig.server.json        # backend-only build (CommonJS → dist/)
```

**Reference example:** the `health` feature (`GET /api/health`) shows the full chain: route → controller → service → repository.

## Conventions

- **Layering runs one way:** `routes → controllers → services → repositories → db`. A layer never imports from a layer above it.
- **SQL:**
  - Repositories own all SQL. **Always use parameterized queries** (`$1, $2`). Never build SQL by concatenating strings.
  - Use the one shared pool from `src/db/client.ts`. Use `pool.connect()` only for transactions, and always `release()` in `finally`.
  - Schema changes go in a **new** file in `src/db/migrations/`. Never edit a migration that has already been applied.
- **Errors:** throw typed errors from `src/utils/errors.ts`. Only the central error middleware turns them into HTTP responses.
- **Config:** read env vars only in `src/config/`. The API port is `SERVER_PORT` (default 4000), not `PORT`, because `next dev` reads that too. Document every env var in `.env.example`.
- **File naming:** kebab-case with a layer suffix (`create-booking.service.ts`, `booking.repository.ts`). Every feature folder has an `index.ts`.
- **Imports:**
  - Use **relative imports** (`../../services/booking`), never `@/`. `tsc` doesn't rewrite aliases, so `@/` breaks the compiled server.
  - Never import from frontend folders (`app/`, `components/`, `hooks/`, `api/`).

## Scripts

```bash
yarn dev:server         # API in watch mode (http://localhost:4000)
yarn build:server       # compile to dist/
yarn start:server       # run the compiled API
yarn test:server        # Jest (unit + integration)
yarn test:server:watch  # Jest watch mode
yarn migrate            # apply pending migrations
```

## Testing

- Jest runs only `tests/unit/{controllers,services,repositories,middlewares,validators,db}/**` and `tests/integration/**`. Don't put Jest tests in `tests/unit/utils/`, which is Vitest's.
- **Unit tests:** services, with repositories mocked (`jest.mock`).
- **Integration tests:** supertest against `createApp()` and a real test PostgreSQL database. Reset data between tests, and call `pool.end()` in `afterAll`.
- New services and endpoints come with tests.
