import { MEMBER_SESSION_TTL_MS } from '../../../src/constants/auth';
import { pool } from '../../../src/db/client';
import { insertUserSession } from '../../../src/repositories/auth';
import type { UserRole } from '../../../src/types/auth';
import { hashPassword } from '../../../src/utils/password';
import { generateToken, hashToken } from '../../../src/utils/token';

export const TEST_PASSWORD = 'password123';

interface TestUser {
  id: string;
  name: string;
  email: string;
  cookie: string; // ready for supertest's .set('Cookie', ...)
}

let counter = 0;

// Creates a user and a logged-in session directly in the database.
export async function createUser(
  options: { role?: UserRole; name?: string; email?: string; timeZone?: string } = {},
): Promise<TestUser> {
  counter += 1;
  const name = options.name ?? `User ${counter}`;
  const email = options.email ?? `user${counter}@example.com`;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, time_zone) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, email, await hashPassword(TEST_PASSWORD), options.role ?? 'member', options.timeZone ?? 'UTC'],
  );

  const token = generateToken();
  await insertUserSession(hashToken(token), rows[0].id, MEMBER_SESSION_TTL_MS);
  return { id: rows[0].id, name, email, cookie: `session=${token}` };
}
