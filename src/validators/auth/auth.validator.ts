import type { ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, SignupRequest } from '../../types/auth';
import { checkEmail, checkName, checkPassword, readBody, throwIfInvalid, type FieldErrors } from '../shared';

function toTimeZone(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return 'UTC';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function validateSignup(body: unknown): Required<SignupRequest> {
  const input = readBody(body);
  const errors: FieldErrors = {};
  const name = checkName(input.name, errors);
  const email = checkEmail(input.email, errors);
  const password = checkPassword(input.password, errors);
  throwIfInvalid(errors);
  return { name, email, password, timeZone: toTimeZone(input.timeZone) };
}

export function validateLogin(body: unknown): LoginRequest {
  const input = readBody(body);
  const errors: FieldErrors = {};
  const email = checkEmail(input.email, errors);
  const password = checkPassword(input.password, errors, 1);
  throwIfInvalid(errors);
  return { email, password };
}

export function validateForgotPassword(body: unknown): ForgotPasswordRequest {
  const input = readBody(body);
  const errors: FieldErrors = {};
  const email = checkEmail(input.email, errors);
  throwIfInvalid(errors);
  return { email };
}

export function validateResetPassword(body: unknown): ResetPasswordRequest {
  const input = readBody(body);
  const errors: FieldErrors = {};
  const token = typeof input.token === 'string' ? input.token : '';
  if (token.length === 0) {
    errors.token = 'A reset token is required';
  }
  const password = checkPassword(input.password, errors);
  throwIfInvalid(errors);
  return { token, password };
}
