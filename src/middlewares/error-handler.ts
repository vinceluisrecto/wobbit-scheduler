import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorResponse } from '../types/shared';
import { AppError, InternalError, NotFoundError, ValidationError } from '../utils/errors';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError());
}

// express.json() marks its own failures (malformed JSON, body too large) with a `type`.
function isBodyParserError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && 'status' in error;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isBodyParserError(error)) return new ValidationError(undefined, 'The request body must be valid JSON');

  console.error(error);
  return new InternalError();
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const appError = toAppError(error);
  const body: ApiErrorResponse = {
    error: { code: appError.code, message: appError.message, ...(appError.details && { details: appError.details }) },
  };
  res.status(appError.statusCode).json(body);
}
