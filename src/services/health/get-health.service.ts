import { pingDatabase } from '../../repositories/health';
import type { HealthStatus } from '../../types/health';

export async function getHealth(): Promise<HealthStatus> {
  try {
    await pingDatabase();
    return { status: 'up', database: 'up' };
  } catch {
    return { status: 'down', database: 'down' };
  }
}
