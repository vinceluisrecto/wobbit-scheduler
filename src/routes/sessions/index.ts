import { Router } from 'express';
import { createBookingController } from '../../controllers/bookings';
import { getSessionController, listSessionsController } from '../../controllers/sessions';
import { joinWaitlistController } from '../../controllers/waitlist';
import { requireAuth } from '../../middlewares';

export const sessionsRouter = Router();

sessionsRouter.get('/', listSessionsController);
sessionsRouter.get('/:id', getSessionController);
sessionsRouter.post('/:id/bookings', requireAuth, createBookingController);
sessionsRouter.post('/:id/waitlist', requireAuth, joinWaitlistController);
