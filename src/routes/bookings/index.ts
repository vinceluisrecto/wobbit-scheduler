import { Router } from 'express';
import { cancelBookingController, getBookingController } from '../../controllers/bookings';
import { requireAuth } from '../../middlewares';

export const bookingsRouter = Router();

bookingsRouter.get('/:id', requireAuth, getBookingController);
bookingsRouter.post('/:id/cancel', requireAuth, cancelBookingController);
