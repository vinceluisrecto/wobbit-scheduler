import { Router } from 'express';
import { accountRouter } from './account';
import { adminRouter } from './admin';
import { authRouter } from './auth';
import { bookingsRouter } from './bookings';
import { healthRouter } from './health';
import { sessionsRouter } from './sessions';
import { waitlistRouter } from './waitlist';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/sessions', sessionsRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/waitlist', waitlistRouter);
apiRouter.use('/account', accountRouter);

apiRouter.use('/admin', adminRouter);
