import { Router } from 'express';
import { leaveWaitlistController } from '../../controllers/waitlist';
import { requireAuth } from '../../middlewares';

export const waitlistRouter = Router();

waitlistRouter.delete('/:id', requireAuth, leaveWaitlistController);
