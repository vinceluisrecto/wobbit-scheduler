import { Router } from 'express';
import {
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  resetPasswordController,
  signupController,
} from '../../controllers/auth';
import { requireAuth } from '../../middlewares';

export const authRouter = Router();

authRouter.post('/signup', signupController);
authRouter.post('/login', loginController);
authRouter.post('/logout', requireAuth, logoutController);
authRouter.get('/me', requireAuth, meController);
authRouter.post('/forgot-password', forgotPasswordController);
authRouter.post('/reset-password', resetPasswordController);
