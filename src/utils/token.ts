import { createHash, randomBytes } from 'node:crypto';

// A random 32-byte token for cookies and reset links. Only its SHA-256 hash is stored.
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
