import { Router } from 'express';
import { getHealthController } from '../../controllers/health';

export const healthRouter = Router();

healthRouter.get('/', getHealthController);
