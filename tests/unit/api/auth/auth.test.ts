import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';

const apiRequest = vi.fn();
vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

const { getMe, signup } = await import('@/api/auth');

const user = { id: 'u1', name: 'Maya', email: 'maya@example.com', role: 'member' as const };

beforeEach(() => {
  apiRequest.mockReset();
});

describe('signup', () => {
  it("sends the device's IANA timezone", async () => {
    apiRequest.mockResolvedValue({ user });

    await signup({ name: 'Maya', email: 'maya@example.com', password: 'long-enough' });

    expect(apiRequest).toHaveBeenCalledWith('/auth/signup', {
      method: 'POST',
      body: {
        name: 'Maya',
        email: 'maya@example.com',
        password: 'long-enough',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  });
});

describe('getMe', () => {
  it('returns the user', async () => {
    apiRequest.mockResolvedValue({ user });
    await expect(getMe()).resolves.toEqual(user);
  });

  it('returns null when logged out (401)', async () => {
    apiRequest.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Log in', 401));
    await expect(getMe()).resolves.toBeNull();
  });

  it('rethrows other errors', async () => {
    apiRequest.mockRejectedValue(new ApiError('INTERNAL_ERROR', 'Boom', 500));
    await expect(getMe()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
