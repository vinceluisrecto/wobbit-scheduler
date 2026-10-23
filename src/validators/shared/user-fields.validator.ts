import type { FieldErrors } from './request-body';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MEMBER_PASSWORD_MIN_LENGTH = 8;
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 200;

// Each check returns the cleaned value, or records a message in `errors`.

export function checkName(value: unknown, errors: FieldErrors): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 1 || name.length > 100) {
    errors.name = 'Name must be 1 to 100 characters';
  }
  return name;
}

export function checkEmail(value: unknown, errors: FieldErrors): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  return email;
}

export function checkPassword(value: unknown, errors: FieldErrors, minLength = MEMBER_PASSWORD_MIN_LENGTH): string {
  const password = typeof value === 'string' ? value : '';
  if (password.length < minLength || password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Password must be ${minLength} to ${PASSWORD_MAX_LENGTH} characters`;
  }
  return password;
}
