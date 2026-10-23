import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares';
import { joinWaitlist, leaveWaitlist } from '../../services/waitlist';
import type { WaitlistEntryResponse } from '../../types/waitlist';
import { validateUuid } from '../../validators/shared';

// POST /api/sessions/:id/waitlist
export async function joinWaitlistController(req: Request, res: Response) {
  const body: WaitlistEntryResponse = {
    waitlistEntry: await joinWaitlist(validateUuid(req.params.id), getAuthUser(res)),
  };
  res.status(201).json(body);
}

export async function leaveWaitlistController(req: Request, res: Response) {
  await leaveWaitlist(validateUuid(req.params.id), getAuthUser(res));
  res.status(204).end();
}
