import { ValidationError } from '../../utils/errors';

export type FieldErrors = Record<string, string>;

// Anything that isn't a JSON object (missing, array, non-JSON content type) reads as {},
// so the field checks report the missing fields instead of crashing.
export function readBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export function throwIfInvalid(errors: FieldErrors): void {
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}
