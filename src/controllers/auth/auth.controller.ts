import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { SESSION_COOKIE_NAME } from '../../constants/auth';
import { getAuthUser, getSessionTokenHash } from '../../middlewares';
import { forgotPassword, login, logout, resetPassword, signup, toPublicUser, type LoggedIn } from '../../services/auth';
import type { UserResponse } from '../../types/auth';
import {
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
  validateSignup,
} from '../../validators/auth';

const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: env.isProduction, path: '/' } as const;

function sendLoggedIn(res: Response, status: number, { user, token, ttlMs }: LoggedIn) {
  res.cookie(SESSION_COOKIE_NAME, token, { ...cookieOptions, maxAge: ttlMs });
  const body: UserResponse = { user };
  res.status(status).json(body);
}

export async function signupController(req: Request, res: Response) {
  sendLoggedIn(res, 201, await signup(validateSignup(req.body)));
}

export async function loginController(req: Request, res: Response) {
  sendLoggedIn(res, 200, await login(validateLogin(req.body)));
}

export async function logoutController(_req: Request, res: Response) {
  await logout(getSessionTokenHash(res));
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  res.status(204).end();
}

export function meController(_req: Request, res: Response) {
  const body: UserResponse = { user: toPublicUser(getAuthUser(res)) };
  res.json(body);
}

export async function forgotPasswordController(req: Request, res: Response) {
  await forgotPassword(validateForgotPassword(req.body));
  res.status(204).end();
}

export async function resetPasswordController(req: Request, res: Response) {
  await resetPassword(validateResetPassword(req.body));
  res.status(204).end();
}
