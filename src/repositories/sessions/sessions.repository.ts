import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/client';
import type { SessionSummary } from '../../types/sessions';
import { toSessionSummary, type SessionRow } from './session.mapper';

export async function listUpcomingSessions(): Promise<SessionSummary[]> {
  const { rows } = await pool.query<SessionRow>(
    'SELECT * FROM sessions WHERE starts_at > now() ORDER BY starts_at, id',
  );
  return rows.map(toSessionSummary);
}

export async function findSessionById(id: string, db: Pool | PoolClient = pool): Promise<SessionSummary | null> {
  const { rows } = await db.query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id]);
  return rows[0] ? toSessionSummary(rows[0]) : null;
}
