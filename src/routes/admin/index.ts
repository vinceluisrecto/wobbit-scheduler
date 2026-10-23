import { Router } from 'express';
import {
  createSessionController,
  deleteSessionController,
  getAdminSessionController,
  listAdminSessionsController,
  updatePaymentController,
  updateSessionController,
} from '../../controllers/admin';
import { requireAdmin } from '../../middlewares';

export const adminRouter = Router();

// Every /api/admin/* route needs the admin role: 401 logged out, 403 for members.
adminRouter.use(requireAdmin);

adminRouter.get('/sessions', listAdminSessionsController);
adminRouter.post('/sessions', createSessionController);
adminRouter.get('/sessions/:id', getAdminSessionController);
adminRouter.patch('/sessions/:id', updateSessionController);
adminRouter.delete('/sessions/:id', deleteSessionController);
adminRouter.patch('/bookings/:id/payment', updatePaymentController);
