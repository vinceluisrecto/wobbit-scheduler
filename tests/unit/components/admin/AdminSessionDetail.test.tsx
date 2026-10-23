import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSession, getAdminSession } from '@/api/admin';
import { ApiError } from '@/api/client';
import { AdminSessionDetail } from '@/components/admin';
import { atLocal, makeDetail, makeSession, makeWaitlistEntry, NOW } from './fixtures';
import { router } from './navigation-mock';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/admin', () => ({ getAdminSession: vi.fn(), deleteSession: vi.fn(), updatePayment: vi.fn() }));
vi.mock('@/api/bookings', () => ({ cancelBooking: vi.fn() }));
vi.mock('@/api/waitlist', () => ({ leaveWaitlist: vi.fn() }));

const SESSION_ID = '20000000-0000-4000-8000-000000000001';
const emptyClass = makeDetail({
  session: makeSession({ bookedCount: 0, paidCount: 0, startsAt: atLocal(2, 9) }),
  bookings: [],
  waitlist: [],
});

describe('AdminSessionDetail', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(getAdminSession).mockReset();
    vi.mocked(deleteSession).mockReset();
    router.push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the class info with the same roster as the expanded row, and Edit', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(makeDetail());
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Morning Flow' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Roster' })).toHaveTextContent('Maya Santos');
    expect(screen.getByRole('link', { name: 'Edit class' })).toHaveAttribute('href', `/admin/sessions/${SESSION_ID}/edit`);
  });

  it('hides Delete when the class has bookings', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(makeDetail());
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Delete class' })).not.toBeInTheDocument();
  });

  it('hides Delete when the class has a waitlist', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({ ...emptyClass, waitlist: [makeWaitlistEntry()] });
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Delete class' })).not.toBeInTheDocument();
  });

  it('deletes an empty class after a confirm and goes back to the schedule', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(emptyClass);
    vi.mocked(deleteSession).mockResolvedValue(undefined);
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete class' }));
    expect(deleteSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/sessions'));
    expect(deleteSession).toHaveBeenCalledWith(SESSION_ID);
  });

  it('explains SESSION_HAS_BOOKINGS', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(emptyClass);
    vi.mocked(deleteSession).mockRejectedValue(new ApiError('SESSION_HAS_BOOKINGS', 'Has bookings', 409));
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("This class can't be deleted");
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not offer Edit for a class that has started', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(makeDetail({ session: makeSession({ startsAt: atLocal(-1, 9) }) }));
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Edit class' })).not.toBeInTheDocument();
  });

  it('says when the class does not exist', async () => {
    vi.mocked(getAdminSession).mockRejectedValue(new ApiError('SESSION_NOT_FOUND', 'Class not found', 404));
    render(<AdminSessionDetail sessionId={SESSION_ID} />);

    expect(await screen.findByRole('heading', { name: "We can't find that class" })).toBeInTheDocument();
  });
});
