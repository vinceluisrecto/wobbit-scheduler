// Jest covers backend code. Frontend tests run with Vitest (see vitest.config.mts).
import { existsSync } from 'node:fs';

// Load .env so integration tests can reach the database.
// D3: with NODE_ENV=test (Jest's default), src/config/env.ts uses TEST_DATABASE_URL when it's set.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/{controllers,services,repositories,middlewares,validators,db}/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.server.json' }],
  },
  // Integration files share one test database and reset it between tests, so run files one at a time.
  maxWorkers: 1,
};

export default config;
