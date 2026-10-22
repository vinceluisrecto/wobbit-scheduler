import type { Request, Response } from 'express';
import { getHealth } from '../../services/health';

export async function getHealthController(_req: Request, res: Response) {
  const health = await getHealth();
  res.status(health.status === 'up' ? 200 : 503).json(health);
}
