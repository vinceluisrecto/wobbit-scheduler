import type { PoolClient } from 'pg';
import { pool } from './client';

// What a repository transaction returns: the value, or the reason it was refused.
// The service turns the reason into a typed error.
export type TxResult<T, Reason extends string> = { ok: true; value: T } | { ok: false; reason: Reason };

export function succeed<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function refuse<Reason extends string>(reason: Reason): { ok: false; reason: Reason } {
  return { ok: false, reason };
}

// Runs `work` on one client inside BEGIN/COMMIT. A refused result or a thrown error rolls back.
export async function withTransaction<T, Reason extends string>(
  work: (client: PoolClient) => Promise<TxResult<T, Reason>>,
): Promise<TxResult<T, Reason>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query(result.ok ? 'COMMIT' : 'ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// node-postgres error code for a unique violation.
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
