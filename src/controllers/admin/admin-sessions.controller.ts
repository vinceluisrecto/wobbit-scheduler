import type { Request, Response } from 'express';
import {
  createSession,
  deleteSession,
  getSessionForAdmin,
  listSessionsForAdmin,
  updateSession,
} from '../../services/admin';
import type { AdminSessionDetailResponse, AdminSessionResponse, ListAdminSessionsResponse } from '../../types/admin';
import { validateCreateSession, validateScope, validateUpdateSession } from '../../validators/admin';
import { validateUuid } from '../../validators/shared';

export async function listAdminSessionsController(req: Request, res: Response) {
  const body: ListAdminSessionsResponse = { sessions: await listSessionsForAdmin(validateScope(req.query.scope)) };
  res.json(body);
}

export async function createSessionController(req: Request, res: Response) {
  const body: AdminSessionResponse = { session: await createSession(validateCreateSession(req.body)) };
  res.status(201).json(body);
}

export async function getAdminSessionController(req: Request, res: Response) {
  const body: AdminSessionDetailResponse = await getSessionForAdmin(validateUuid(req.params.id));
  res.json(body);
}

export async function updateSessionController(req: Request, res: Response) {
  const id = validateUuid(req.params.id);
  const body: AdminSessionResponse = { session: await updateSession(id, validateUpdateSession(req.body)) };
  res.json(body);
}

export async function deleteSessionController(req: Request, res: Response) {
  await deleteSession(validateUuid(req.params.id));
  res.status(204).end();
}
