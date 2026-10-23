import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../constants/auth';
import { findUserBySessionToken } from '../repositories/auth';
import type { AuthUser } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { hashToken } from '../utils/token';

function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) return decodeURIComponent(value.join('='));
  }
  return null;
}

// Sets res.locals.user and res.locals.sessionTokenHash for the rest of the request.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readSessionCookie(req);
  if (!token) throw new UnauthorizedError();

  const tokenHash = hashToken(token);
  const user = await findUserBySessionToken(tokenHash);
  if (!user) throw new UnauthorizedError();

  res.locals.user = user;
  res.locals.sessionTokenHash = tokenHash;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (getAuthUser(res).role !== 'admin') throw new ForbiddenError();
    next();
  });
}

// For controllers behind requireAuth / requireAdmin.
export function getAuthUser(res: Response): AuthUser {
  return res.locals.user as AuthUser;
}

export function getSessionTokenHash(res: Response): string {
  return res.locals.sessionTokenHash as string;
}
