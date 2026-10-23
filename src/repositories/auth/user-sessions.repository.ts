import { pool } from '../../db/client';
import type { AuthUser } from '../../types/auth';
import { toAuthUser, type UserRow } from './users.repository';

export async function insertUserSession(tokenHash: string, userId: string, ttlMs: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + $3 * interval '1 millisecond')`,
    [tokenHash, userId, ttlMs],
  );
}

export async function findUserBySessionToken(tokenHash: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id, u.name, u.email, u.role, u.time_zone
       FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ? toAuthUser(rows[0]) : null;
}

export async function deleteUserSession(tokenHash: string): Promise<void> {
  await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash]);
}
