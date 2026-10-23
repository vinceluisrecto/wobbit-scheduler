import { pool } from '../../db/client';
import { refuse, succeed, withTransaction, type TxResult } from '../../db/transaction';

export async function insertPasswordResetToken(tokenHash: string, userId: string, ttlMs: number): Promise<void> {
  await pool.query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + $3 * interval '1 millisecond')`,
    [tokenHash, userId, ttlMs],
  );
}

// The guarded UPDATE makes each token single-use, even if two resets race.
// A successful reset also logs the user out everywhere.
export function resetPasswordWithToken(
  tokenHash: string,
  passwordHash: string,
): Promise<TxResult<null, 'INVALID_RESET_TOKEN'>> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ user_id: string }>(
      `UPDATE password_reset_tokens SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [tokenHash],
    );
    if (rows.length === 0) return refuse('INVALID_RESET_TOKEN');

    const userId = rows[0].user_id;
    await client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    return succeed(null);
  });
}
