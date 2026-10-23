import type { ApiErrorCode, ApiErrorResponse } from '@/types/shared';

/** Every failed request becomes an ApiError. `status` is 0 when the request never got a response. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, status: number, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

function isErrorBody(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value as { error: unknown };
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * The single shared fetch wrapper. Same-origin `/api` (Next forwards it to Express, D1),
 * so the httpOnly `session` cookie is sent automatically.
 */
export async function apiRequest<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Could not reach the server', 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await readJson(response);
  if (response.ok) return data as T;

  if (isErrorBody(data)) {
    throw new ApiError(data.error.code, data.error.message, response.status, data.error.details);
  }
  throw new ApiError('INTERNAL_ERROR', 'Something went wrong', response.status);
}
