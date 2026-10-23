import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getAdminSession, listAdminSessions, updatePayment } from '@/api/admin';
import { ApiError } from '@/api/client';
import { AdminSchedule } from '@/components/admin';
import { atLocal, makeBooking, makeDetail, makeSession, makeWaitlistEntry, NOW } from './fixtures';
import { router, setUrl } from './navigation-mock';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/admin', () => ({
  listAdminSessions: vi.fn(),
  getAdminSession: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  updatePayment: vi.fn(),
}));
vi.mock('@/api/bookings', () => ({ cancelBooking: vi.fn() }));
vi.mock('@/api/waitlist', () => ({ leaveWaitlist: vi.fn() }));

const today = makeSession({
  id: 'today',
  title: 'Evening Flow',
  instructor: 'Ana Reyes',
  startsAt: atLocal(0, 18),
  bookedCount: 6,
  capacity: 10,
  paidCount: 4,
  waitlistCount: 0,
  refundDueCount: 1,
});
const tomorrow = makeSession({
  id: 'tomorrow',
  title: 'Power Pilates',
  instructor: 'Leo Cruz',
  startsAt: atLocal(1, 7),
  bookedCount: 8,
  capacity: 8,
  paidCount: 8,
  waitlistCount: 2,
});
const past = makeSession({ id: 'past', title: 'Sunday Stretch', startsAt: atLocal(-3, 10) });

function row(title: string) {
  return screen.getByRole('button', { name: new RegExp(title) });
}

function renderSchedule(url = '/admin/sessions') {
  setUrl(url);
  return render(<AdminSchedule />);
}

describe('AdminSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(listAdminSessions).mockReset();
    vi.mocked(getAdminSession).mockReset();
    vi.mocked(createSession).mockReset();
    vi.mocked(updatePayment).mockReset();
    router.replace.mockReset();
    window.localStorage.clear();
    // Upcoming = soonest first, as the API returns it.
    vi.mocked(listAdminSessions).mockImplementation(async (scope) => (scope === 'past' ? [past] : [today, tomorrow]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups Today first, then the coming days', async () => {
    renderSchedule();

    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Today', 'Tomorrow']);
    expect(within(screen.getByRole('region', { name: 'Today' })).getByText('Evening Flow')).toBeInTheDocument();
    expect(listAdminSessions).toHaveBeenCalledWith('upcoming');
  });

  it('keeps Today pinned when there are no classes left today', async () => {
    vi.mocked(listAdminSessions).mockResolvedValue([tomorrow]);
    renderSchedule();

    expect(await screen.findByText('No classes left today.')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Today', 'Tomorrow']);
  });

  it('shows past classes on the Past tab', async () => {
    renderSchedule();
    await screen.findByText('Evening Flow');

    fireEvent.click(screen.getByRole('tab', { name: 'Past' }));

    expect(await screen.findByText('Sunday Stretch')).toBeInTheDocument();
    expect(screen.queryByText('Evening Flow')).not.toBeInTheDocument();
    expect(listAdminSessions).toHaveBeenLastCalledWith('past');
  });

  it('shows the counts and markers on each row', async () => {
    renderSchedule();
    await screen.findByText('Evening Flow');

    const todayRow = row('Evening Flow');
    expect(within(todayRow).getByText('6/10')).toBeInTheDocument();
    expect(within(todayRow).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');
    expect(within(todayRow).getByText('0 waiting')).toBeInTheDocument();
    expect(within(todayRow).getByText('4 paid')).toBeInTheDocument();
    expect(within(todayRow).getByText('⚠ 2 unpaid')).toBeInTheDocument();
    expect(within(todayRow).getByText('Refund due')).toBeInTheDocument();

    const fullRow = row('Power Pilates');
    expect(within(fullRow).getByText('8/8')).toBeInTheDocument();
    expect(within(fullRow).getByText('2 waiting')).toBeInTheDocument();
    expect(within(fullRow).queryByText(/unpaid/)).not.toBeInTheDocument();
  });

  it('expands a row inline and loads its roster on the first expand only', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(makeDetail({ session: today }));
    renderSchedule();
    await screen.findByText('Evening Flow');

    const todayRow = row('Evening Flow');
    expect(todayRow).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(todayRow);

    expect(todayRow).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Maya Santos')).toBeInTheDocument();
    expect(getAdminSession).toHaveBeenCalledWith('today');

    fireEvent.click(todayRow); // collapse
    fireEvent.click(todayRow); // expand again: already loaded
    expect(getAdminSession).toHaveBeenCalledTimes(1);
  });

  it('refetches the class after marking paid and updates its row counts', async () => {
    const booking = makeBooking({ sessionId: 'today' });
    vi.mocked(getAdminSession)
      .mockResolvedValueOnce(makeDetail({ session: today, bookings: [booking] }))
      .mockResolvedValueOnce(
        makeDetail({
          session: { ...today, paidCount: 5 },
          bookings: [{ ...booking, paymentStatus: 'paid', paidAt: NOW.toISOString() }],
        }),
      );
    vi.mocked(updatePayment).mockResolvedValue({} as never);
    renderSchedule();
    await screen.findByText('Evening Flow');

    fireEvent.click(row('Evening Flow'));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark paid: Maya Santos' }));

    expect(await screen.findByText('Marked paid')).toBeInTheDocument();
    expect(updatePayment).toHaveBeenCalledWith(booking.id, 'paid');
    expect(within(row('Evening Flow')).getByText('5 paid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark unpaid: Maya Santos' })).toBeInTheDocument();
  });

  describe('search', () => {
    it('filters by title', async () => {
      renderSchedule('/admin/sessions?q=pilates');

      expect(await screen.findByText('Power Pilates')).toBeInTheDocument();
      expect(screen.queryByText('Evening Flow')).not.toBeInTheDocument();
    });

    it('filters by instructor', async () => {
      renderSchedule('/admin/sessions?q=ana%20reyes');

      expect(await screen.findByText('Evening Flow')).toBeInTheDocument();
      expect(screen.queryByText('Power Pilates')).not.toBeInTheDocument();
    });

    it('filters by member name and email in rosters already loaded', async () => {
      vi.mocked(getAdminSession).mockResolvedValue(
        makeDetail({ session: tomorrow, bookings: [], waitlist: [makeWaitlistEntry({ sessionId: 'tomorrow' })] }),
      );
      renderSchedule();
      await screen.findByText('Power Pilates');
      fireEvent.click(row('Power Pilates'));
      await screen.findByText('Lily Navarro');

      act(() => setUrl('/admin/sessions?q=lily@example'));

      expect(screen.getByText('Power Pilates')).toBeInTheDocument();
      expect(screen.queryByText('Evening Flow')).not.toBeInTheDocument();

      act(() => setUrl('/admin/sessions?q=Lily%20Navarro'));
      expect(screen.getByText('Power Pilates')).toBeInTheDocument();
    });

    it('says when nothing matches', async () => {
      renderSchedule('/admin/sessions?q=zumba');

      expect(await screen.findByText(/No classes match "zumba"/)).toBeInTheDocument();
    });
  });

  it('opens the form from "+ New class" (?new=1), then closes it and highlights the new class', async () => {
    const created = makeSession({ id: 'created', title: 'Sunrise Yoga', startsAt: atLocal(2, 6) });
    vi.mocked(createSession).mockResolvedValue(created);
    renderSchedule('/admin/sessions?new=1');
    await screen.findByText('Evening Flow');

    const dialog = screen.getByRole('dialog', { name: 'New class' });
    expect(within(dialog).getByLabelText('Title')).toHaveFocus();
    vi.mocked(listAdminSessions).mockResolvedValue([today, tomorrow, created]);
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Sunrise Yoga' } });
    fireEvent.change(within(dialog).getByLabelText('Instructor'), { target: { value: 'Ana Reyes' } });
    fireEvent.change(within(dialog).getByLabelText('Starts'), { target: { value: '2026-10-25T06:00' } });
    fireEvent.change(within(dialog).getByLabelText('Price (USD)'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create class' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.search).toBe('');
    expect(await screen.findByText('Sunrise Yoga')).toBeInTheDocument();
    expect(row('Sunrise Yoga').closest('li')).toHaveAttribute('data-highlighted', 'true');
    expect(row('Evening Flow').closest('li')).not.toHaveAttribute('data-highlighted');
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('highlights a class saved from a deep-link form page (?saved=<id>)', async () => {
    renderSchedule('/admin/sessions?saved=tomorrow');

    await screen.findByText('Power Pilates');
    expect(row('Power Pilates').closest('li')).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('goes to the admin login when the session expired', async () => {
    vi.mocked(listAdminSessions).mockRejectedValue(new ApiError('UNAUTHORIZED', 'You need to log in', 401));
    renderSchedule();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login?reason=expired'));
  });

  it('offers a retry when the schedule fails to load', async () => {
    vi.mocked(listAdminSessions).mockRejectedValueOnce(new ApiError('INTERNAL_ERROR', 'Boom', 500));
    renderSchedule();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Evening Flow')).toBeInTheDocument();
  });
});
