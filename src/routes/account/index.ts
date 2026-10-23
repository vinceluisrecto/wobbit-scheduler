import { Router } from 'express';
import { getMyBookingsController } from '../../controllers/account';
import { requireAuth } from '../../middlewares';

export const accountRouter = Router();

accountRouter.get('/bookings', requireAuth, getMyBookingsController);
