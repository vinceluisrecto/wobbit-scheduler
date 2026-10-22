import type { NextFunction, Request, Response } from 'express';
import { AppError, NotFoundError } from '../utils/errors';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError());
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
