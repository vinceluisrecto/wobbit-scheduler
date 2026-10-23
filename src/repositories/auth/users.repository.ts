import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/client';
import { isUniqueViolation } from '../../db/transaction';
import type { AuthUser, UserRole } from '../../types/auth';
import type { EmailRecipient } from '../../types/email';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  time_zone: string;
}

interface UserWithPasswordRow extends UserRow {
  password_hash: string;
}

export function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role, timeZone: row.time_zone };
}

const USER_COLUMNS = 'id, name, email, role, time_zone';

interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  timeZone: string;
}

// Returns null when the email is already taken (case-insensitive unique index).
export async function insertMember(user: NewUser): Promise<AuthUser | null> {
  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, time_zone) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
      [user.name, user.email, user.passwordHash, user.timeZone],
    );
    return toAuthUser(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function findUserWithPasswordByEmail(
  email: string,
): Promise<{ user: AuthUser; passwordHash: string } | null> {
  const { rows } = await pool.query<UserWithPasswordRow>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ? { user: toAuthUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`, [
    email,
  ]);
  return rows[0] ? toAuthUser(rows[0]) : null;
}

// E8 goes to every admin.
export async function listAdminRecipients(): Promise<EmailRecipient[]> {
  const { rows } = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE role = 'admin' ORDER BY created_at`);
  return rows.map((row) => ({ name: row.name, email: row.email, timeZone: row.time_zone }));
}

// D11: creates the admin, or updates the existing account with that email. Never deletes.
export async function upsertAdmin(
  admin: { name: string; email: string; passwordHash: string },
  db: Pool | PoolClient = pool,
): Promise<AuthUser> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT ((lower(email))) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin'
     RETURNING ${USER_COLUMNS}`,
    [admin.name, admin.email, admin.passwordHash],
  );
  return toAuthUser(rows[0]);
}
