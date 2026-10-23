import type { AdminSessionScope, SessionInput, UpdatePaymentRequest } from '../../types/admin';
import { ValidationError } from '../../utils/errors';
import { readBody, throwIfInvalid, type FieldErrors } from '../shared';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Each check returns the cleaned value, or records a message in `errors`.

function checkText(value: unknown, field: string, errors: FieldErrors): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < 1 || text.length > 100) {
    errors[field] = 'Must be 1 to 100 characters';
  }
  return text;
}

function checkFutureDate(value: unknown, field: string, errors: FieldErrors): string {
  const date = typeof value === 'string' && ISO_DATE_PATTERN.test(value) ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    errors[field] = 'Must be a valid ISO date';
    return '';
  }
  if (date.getTime() <= Date.now()) {
    errors[field] = 'Must be in the future';
  }
  return date.toISOString();
}

function checkInteger(value: unknown, field: string, min: number, max: number, errors: FieldErrors): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    errors[field] = `Must be a whole number from ${min} to ${max}`;
    return 0;
  }
  return value;
}

const fieldChecks: { [K in keyof SessionInput]: (value: unknown, errors: FieldErrors) => SessionInput[K] } = {
  title: (value, errors) => checkText(value, 'title', errors),
  instructor: (value, errors) => checkText(value, 'instructor', errors),
  startsAt: (value, errors) => checkFutureDate(value, 'startsAt', errors),
  durationMinutes: (value, errors) => checkInteger(value, 'durationMinutes', 1, 600, errors),
  capacity: (value, errors) => checkInteger(value, 'capacity', 1, 500, errors),
  priceCents: (value, errors) => checkInteger(value, 'priceCents', 0, 1_000_000, errors),
};

const SESSION_FIELDS = Object.keys(fieldChecks) as (keyof SessionInput)[];

// Create: every field is required.
export function validateCreateSession(body: unknown): SessionInput {
  const input = readBody(body);
  const errors: FieldErrors = {};
  const session = Object.fromEntries(SESSION_FIELDS.map((field) => [field, fieldChecks[field](input[field], errors)]));
  throwIfInvalid(errors);
  return session as unknown as SessionInput;
}

// PATCH: only the fields sent are checked, and at least one is needed.
export function validateUpdateSession(body: unknown): Partial<SessionInput> {
  const input = readBody(body);
  const present = SESSION_FIELDS.filter((field) => input[field] !== undefined);
  if (present.length === 0) {
    throw new ValidationError(undefined, `Send at least one of: ${SESSION_FIELDS.join(', ')}`);
  }

  const errors: FieldErrors = {};
  const changes = Object.fromEntries(present.map((field) => [field, fieldChecks[field](input[field], errors)]));
  throwIfInvalid(errors);
  return changes as Partial<SessionInput>;
}

export function validateUpdatePayment(body: unknown): UpdatePaymentRequest {
  const { paymentStatus } = readBody(body);
  if (paymentStatus !== 'paid' && paymentStatus !== 'unpaid') {
    throw new ValidationError({ paymentStatus: "Must be 'paid' or 'unpaid'" });
  }
  return { paymentStatus };
}

// Missing means 'upcoming'.
export function validateScope(value: unknown): AdminSessionScope {
  if (value === undefined) return 'upcoming';
  if (value !== 'upcoming' && value !== 'past') {
    throw new ValidationError({ scope: "Must be 'upcoming' or 'past'" });
  }
  return value;
}
