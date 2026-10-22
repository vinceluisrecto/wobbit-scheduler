// Jest covers backend code. Frontend tests run with Vitest (see vitest.config.mts).
import { existsSync } from 'node:fs';

// Load .env so integration tests can reach the database.
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
};

export default config;
