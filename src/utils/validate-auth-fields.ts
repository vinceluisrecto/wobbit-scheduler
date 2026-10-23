// Client-side mirrors of the auth validation rules (§5), for instant feedback only.
// The server is the authority and its VALIDATION_ERROR details are shown the same way.

export type AuthFieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 200;

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Enter your name';
  if (trimmed.length > 100) return 'Name must be 100 characters or fewer';
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (trimmed.length === 0) return 'Enter your email';
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address';
  return undefined;
}

/** For new passwords (sign-up and reset). */
export function validateNewPassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Use ${PASSWORD_MAX_LENGTH} characters or fewer`;
  return undefined;
}

/** Keeps only the fields that have an error. */
export function compactErrors(errors: AuthFieldErrors): AuthFieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as AuthFieldErrors;
}
