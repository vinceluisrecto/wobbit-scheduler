import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, isApiError } from '@/api/client';

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('calls the same-origin /api path with JSON, no-store and same-origin credentials', async () => {
    const fetchMock = mockFetch(json(201, { ok: true }));

    await expect(apiRequest('/auth/login', { method: 'POST', body: { email: 'a@b.co' } })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co' }),
      cache: 'no-store',
      credentials: 'same-origin',
    });
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('maps the error body to an ApiError with code, message, details and status', async () => {
    mockFetch(
      json(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { email: 'Enter a valid email' } } }),
    );

    const error = await apiRequest('/auth/signup', { method: 'POST', body: {} }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      status: 400,
      details: { email: 'Enter a valid email' },
    });
    expect(isApiError(error, 'VALIDATION_ERROR')).toBe(true);
    expect(isApiError(error, 'SESSION_FULL')).toBe(false);
  });

  it('maps a 409 conflict code', async () => {
    mockFetch(json(409, { error: { code: 'SESSION_FULL', message: 'Full' } }));
    await expect(apiRequest('/sessions/x/bookings', { method: 'POST' })).rejects.toMatchObject({
      code: 'SESSION_FULL',
      status: 409,
    });
  });

  it('turns a non-JSON error (e.g. the API is down behind the proxy) into INTERNAL_ERROR', async () => {
    mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(apiRequest('/sessions')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 502 });
  });

  it('turns a network failure into INTERNAL_ERROR with status 0', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(apiRequest('/sessions')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 0 });
  });
});
