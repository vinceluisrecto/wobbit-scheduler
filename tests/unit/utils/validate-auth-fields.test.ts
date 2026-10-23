import { describe, expect, it } from 'vitest';
import { compactErrors, validateEmail, validateName, validateNewPassword } from '@/utils/validate-auth-fields';

describe('auth field validation', () => {
  it('requires a name of at most 100 characters', () => {
    expect(validateName('  ')).toBe('Enter your name');
    expect(validateName('a'.repeat(101))).toMatch(/100 characters/);
    expect(validateName('Maya')).toBeUndefined();
  });

  it('checks the email shape', () => {
    expect(validateEmail('')).toBe('Enter your email');
    expect(validateEmail('maya@')).toBe('Enter a valid email address');
    expect(validateEmail(' maya@example.com ')).toBeUndefined();
  });

  it('needs new passwords of 8 to 200 characters', () => {
    expect(validateNewPassword('short')).toBe('Use at least 8 characters');
    expect(validateNewPassword('a'.repeat(201))).toMatch(/200 characters/);
    expect(validateNewPassword('long-enough')).toBeUndefined();
  });

  it('drops fields without an error', () => {
    expect(compactErrors({ name: undefined, email: 'Enter your email' })).toEqual({ email: 'Enter your email' });
  });
});
