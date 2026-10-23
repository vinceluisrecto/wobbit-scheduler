import type { PoolClient } from 'pg';
import { env } from '../config/env';
import { upsertAdmin } from '../repositories/auth';
import type { AuthUser } from '../types/auth';
import { hashPassword } from '../utils/password';
import { ADMIN_PASSWORD_MIN_LENGTH, checkEmail, checkName, checkPassword, type FieldErrors } from '../validators/shared';
import { pool } from './client';

interface AdminInput {
  name?: string;
  email?: string;
  password?: string;
}

// D11: creates the admin, or updates the account with that email to role 'admin'. Never deletes.
// The seed calls this inside its own transaction.
export async function createAdmin(input: AdminInput, client?: PoolClient): Promise<AuthUser> {
  const errors: FieldErrors = {};
  const name = checkName(input.name, errors);
  const email = checkEmail(input.email, errors);
  const password = checkPassword(input.password, errors, ADMIN_PASSWORD_MIN_LENGTH);
  if (Object.keys(errors).length > 0) {
    const problems = Object.entries(errors).map(([field, message]) => `  ADMIN_${field.toUpperCase()}: ${message}`);
    throw new Error(`Cannot create the admin:\n${problems.join('\n')}`);
  }

  return upsertAdmin({ name, email, passwordHash: await hashPassword(password) }, client);
}

if (require.main === module) {
  createAdmin(env.admin)
    .then((admin) => console.log(`Admin ready: ${admin.name} <${admin.email}>`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
