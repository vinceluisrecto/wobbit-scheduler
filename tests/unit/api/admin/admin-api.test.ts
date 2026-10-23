import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSession,
  deleteSession,
  getAdminSession,
  listAdminSessions,
  updatePayment,
  updateSession,
} from '@/api/admin';
import { apiRequest } from '@/api/client';

vi.mock('@/api/client', () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);
const SESSION_ID = '20000000-0000-4000-8000-000000000001';

describe('admin API calls', () => {
  beforeEach(() => {
    request.mockReset();
  });

  it('lists upcoming classes by default and past classes on request', async () => {
    request.mockResolvedValue({ sessions: [] });

    await listAdminSessions();
    await listAdminSessions('past');

    expect(request).toHaveBeenNthCalledWith(1, '/admin/sessions?scope=upcoming');
    expect(request).toHaveBeenNthCalledWith(2, '/admin/sessions?scope=past');
  });

  it('creates a class and returns it', async () => {
    const input = {
      title: 'Flow',
      instructor: 'Ana',
      startsAt: '2026-10-24T10:00:00.000Z',
      durationMinutes: 60,
      capacity: 10,
      priceCents: 1500,
    };
    request.mockResolvedValue({ session: { id: SESSION_ID } });

    await expect(createSession(input)).resolves.toEqual({ id: SESSION_ID });
    expect(request).toHaveBeenCalledWith('/admin/sessions', { method: 'POST', body: input });
  });

  it('gets the class detail with roster and waitlist', async () => {
    const detail = { session: { id: SESSION_ID }, bookings: [], waitlist: [] };
    request.mockResolvedValue(detail);

    await expect(getAdminSession(SESSION_ID)).resolves.toBe(detail);
    expect(request).toHaveBeenCalledWith(`/admin/sessions/${SESSION_ID}`);
  });

  it('patches only the given fields', async () => {
    request.mockResolvedValue({ session: { id: SESSION_ID } });

    await updateSession(SESSION_ID, { capacity: 12 });

    expect(request).toHaveBeenCalledWith(`/admin/sessions/${SESSION_ID}`, { method: 'PATCH', body: { capacity: 12 } });
  });

  it('deletes a class', async () => {
    request.mockResolvedValue(undefined);

    await deleteSession(SESSION_ID);

    expect(request).toHaveBeenCalledWith(`/admin/sessions/${SESSION_ID}`, { method: 'DELETE' });
  });

  it('updates a booking payment status', async () => {
    request.mockResolvedValue({ booking: { id: 'b1', paymentStatus: 'paid' } });

    await expect(updatePayment('b1', 'paid')).resolves.toEqual({ id: 'b1', paymentStatus: 'paid' });
    expect(request).toHaveBeenCalledWith('/admin/bookings/b1/payment', {
      method: 'PATCH',
      body: { paymentStatus: 'paid' },
    });
  });
});
