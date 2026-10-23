import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSession } from '../fixtures';

const { listSessions } = vi.hoisted(() => ({ listSessions: vi.fn() }));
vi.mock('@/api/sessions', () => ({ listSessions }));
vi.mock('animejs', () => ({ animate: vi.fn(() => ({ revert: vi.fn() })), stagger: vi.fn(), onScroll: vi.fn() }));

const { SessionList } = await import('@/components/sessions');

beforeEach(() => {
  listSessions.mockReset();
});

describe('SessionList', () => {
  it('shows skeletons, then the classes', async () => {
    listSessions.mockResolvedValue([makeSession(), makeSession({ id: 'session-2', title: 'HIIT Burn' })]);
    render(<SessionList />);

    expect(screen.getByLabelText('Loading classes')).toBeInTheDocument();
    expect(await screen.findByText('HIIT Burn')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('refetches when the window regains focus', async () => {
    listSessions.mockResolvedValueOnce([makeSession({ spotsLeft: 8 })]);
    render(<SessionList />);
    expect(await screen.findByText('8 spots left')).toBeInTheDocument();

    listSessions.mockResolvedValueOnce([makeSession({ spotsLeft: 0, isFull: true })]);
    await act(async () => {
      fireEvent.focus(window);
    });

    expect(await screen.findByText('Full')).toBeInTheDocument();
    expect(listSessions).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state', async () => {
    listSessions.mockResolvedValue([]);
    render(<SessionList />);
    expect(await screen.findByText('No classes scheduled yet')).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    listSessions.mockRejectedValueOnce(new Error('offline'));
    render(<SessionList />);

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the classes");

    listSessions.mockResolvedValueOnce([makeSession()]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Sunset Vinyasa')).toBeInTheDocument();
  });

  it('keeps the classes on screen when a background refetch fails', async () => {
    listSessions.mockResolvedValueOnce([makeSession()]);
    render(<SessionList />);
    await screen.findByText('Sunset Vinyasa');

    listSessions.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      fireEvent.focus(window);
    });

    expect(screen.getByText('Sunset Vinyasa')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('limits the number of classes', async () => {
    listSessions.mockResolvedValue([1, 2, 3, 4, 5].map((n) => makeSession({ id: `s${n}`, title: `Class ${n}` })));
    render(<SessionList limit={3} />);

    await screen.findByText('Class 1');
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});
