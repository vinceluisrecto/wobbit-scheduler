import type { Request, Response } from 'express';
import { getSession, listSessions } from '../../services/sessions';
import type { GetSessionResponse, ListSessionsResponse } from '../../types/sessions';
import { validateUuid } from '../../validators/shared';

export async function listSessionsController(_req: Request, res: Response) {
  const body: ListSessionsResponse = { sessions: await listSessions() };
  res.json(body);
}

export async function getSessionController(req: Request, res: Response) {
  const body: GetSessionResponse = { session: await getSession(validateUuid(req.params.id)) };
  res.json(body);
}
