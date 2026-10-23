import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getAdminSession, updateSession } from '@/api/admin';
import { AdminSessionFormPage } from '@/components/admin';
import { atLocal, makeDetail, makeSession, NOW } from './fixtures';
import { router } from './navigation-mock';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/admin', () => ({ getAdminSession: vi.fn(), createSession: vi.fn(), updateSession: vi.fn() }));

describe('AdminSessionFormPage (deep links)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(getAdminSession).mockReset();
    vi.mocked(createSession).mockReset();
    vi.mocked(updateSession).mockReset();
    router.push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('/admin/sessions/new creates a class and returns to the schedule with it highlighted', async () => {
    vi.mocked(createSession).mockResolvedValue(makeSession({ id: 'created' }));
    render(<AdminSessionFormPage />);

    expect(screen.getByRole('heading', { name: 'New class' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sunrise Yoga' } });
    fireEvent.change(screen.getByLabelText('Instructor'), { target: { value: 'Ana Reyes' } });
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-10-25T06:00' } });
    fireEvent.change(screen.getByLabelText('Price (USD)'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/sessions?saved=created'));
  });

  it('/admin/sessions/[id]/edit loads the class into the same form', async () => {
    const session = makeSession({ startsAt: atLocal(1, 18) });
    vi.mocked(getAdminSession).mockResolvedValue(makeDetail({ session }));
    vi.mocked(updateSession).mockResolvedValue(session);
    render(<AdminSessionFormPage sessionId={session.id} />);

    expect(await screen.findByLabelText('Title')).toHaveValue('Morning Flow');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Evening Flow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/admin/sessions?saved=${session.id}`));
    expect(updateSession).toHaveBeenCalledWith(session.id, { title: 'Evening Flow' });
  });

  it('does not show the form for a class that has started', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(makeDetail({ session: makeSession({ startsAt: atLocal(-1, 9) }) }));
    render(<AdminSessionFormPage sessionId="20000000-0000-4000-8000-000000000001" />);

    expect(await screen.findByText(/already started, so it can't be edited/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });
});
