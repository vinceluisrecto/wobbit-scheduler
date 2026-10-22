import { pool } from '../../db/client';

export async function pingDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}
