import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, updateSession } from '@/api/admin';
import { ApiError } from '@/api/client';
import { SessionForm } from '@/components/admin';
import { LAST_CAPACITY_STORAGE_KEY } from '@/components/admin/SessionForm';
import { makeSession, NOW } from './fixtures';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/admin', () => ({ createSession: vi.fn(), updateSession: vi.fn() }));

// The datetime-local value for tomorrow at 18:30 on this device, and the ISO it becomes.
const TOMORROW_LOCAL = '2026-10-24T18:30';
const TOMORROW_ISO = new Date(2026, 9, 24, 18, 30).toISOString();

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillNewClass() {
  fill('Title', 'Evening Flow');
  fill('Instructor', 'Ana Reyes');
  fill('Starts', TOMORROW_LOCAL);
  fill('Price (USD)', '12.50');
}

describe('SessionForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(createSession).mockReset();
    vi.mocked(updateSession).mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses the first field and has the defaults (duration 60, capacity 12 with no history)', () => {
    render(<SessionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveFocus();
    expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
    expect(screen.getByLabelText('Capacity')).toHaveValue(12);
    expect(screen.getByRole('button', { name: 'Create class' })).toHaveAttribute('type', 'submit');
  });

  it('defaults the capacity to the last created class', () => {
    window.localStorage.setItem(LAST_CAPACITY_STORAGE_KEY, '20');
    render(<SessionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Capacity')).toHaveValue(20);
  });

  it('creates a class: dollars become cents, local time becomes UTC ISO', async () => {
    const saved = makeSession({ id: 'new-id', capacity: 15 });
    vi.mocked(createSession).mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(<SessionForm onSaved={onSaved} onCancel={vi.fn()} />);

    fillNewClass();
    fill('Capacity', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(createSession).toHaveBeenCalledWith({
      title: 'Evening Flow',
      instructor: 'Ana Reyes',
      startsAt: TOMORROW_ISO,
      durationMinutes: 60,
      capacity: 15,
      priceCents: 1250,
    });
    expect(window.localStorage.getItem(LAST_CAPACITY_STORAGE_KEY)).toBe('15');
  });

  it('submits on Enter', async () => {
    vi.mocked(createSession).mockResolvedValue(makeSession());
    render(<SessionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    fillNewClass();
    // Pressing Enter in a field submits its form (implicit submission); the form's submit event is what fires.
    fireEvent.submit(screen.getByLabelText('Price (USD)').closest('form')!);

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
  });

  it('shows field errors next to each field and sends nothing', () => {
    render(<SessionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    fill('Duration (minutes)', '0');
    fill('Price (USD)', '12.555');
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title');
    expect(screen.getByLabelText('Instructor')).toHaveAccessibleDescription('Enter an instructor');
    expect(screen.getByLabelText('Starts')).toHaveAccessibleDescription(/Pick a date and time/);
    expect(screen.getByLabelText('Duration (minutes)')).toHaveAccessibleDescription(/whole number from 1 to 600/);
    expect(screen.getByLabelText('Price (USD)')).toHaveAccessibleDescription(/price from 0 to 10,000/);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('refuses a start in the past', () => {
    render(<SessionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    fillNewClass();
    fill('Starts', '2026-10-22T18:30');
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    expect(screen.getByLabelText('Starts')).toHaveAccessibleDescription(/Pick a time in the future/);
  });

  it("shows the server's field errors next to the right fields", async () => {
    vi.mocked(createSession).mockRejectedValue(
      new ApiError('VALIDATION_ERROR', 'The request is invalid', 400, { priceCents: 'Must be a whole number' }),
    );
    render(<SessionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    fillNewClass();
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    await waitFor(() => expect(screen.getByLabelText('Price (USD)')).toHaveAccessibleDescription('Must be a whole number'));
  });

  describe('edit mode', () => {
    const session = makeSession({ startsAt: TOMORROW_ISO, bookedCount: 6, capacity: 10, priceCents: 1500 });

    it('is prefilled with the class, in local time and dollars', () => {
      render(<SessionForm session={session} onSaved={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText('Title')).toHaveValue('Morning Flow');
      expect(screen.getByLabelText('Starts')).toHaveValue(TOMORROW_LOCAL);
      expect(screen.getByLabelText('Price (USD)')).toHaveValue('15.00');
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });

    it('sends only the changed fields', async () => {
      const saved = { ...session, capacity: 12 };
      vi.mocked(updateSession).mockResolvedValue(saved);
      const onSaved = vi.fn();
      render(<SessionForm session={session} onSaved={onSaved} onCancel={vi.fn()} />);

      fill('Capacity', '12');
      fill('Price (USD)', '20');
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
      expect(updateSession).toHaveBeenCalledWith(session.id, { capacity: 12, priceCents: 2000 });
    });

    it('explains CAPACITY_BELOW_BOOKINGS next to the capacity field', async () => {
      vi.mocked(updateSession).mockRejectedValue(new ApiError('CAPACITY_BELOW_BOOKINGS', 'Capacity too low', 409));
      render(<SessionForm session={session} onSaved={vi.fn()} onCancel={vi.fn()} />);

      fill('Capacity', '3');
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      await waitFor(() =>
        expect(screen.getByLabelText('Capacity')).toHaveAccessibleDescription(
          "Capacity can't be lower than the 6 people already booked",
        ),
      );
    });

    it('explains SESSION_PAST', async () => {
      vi.mocked(updateSession).mockRejectedValue(new ApiError('SESSION_PAST', 'Started', 409));
      render(<SessionForm session={session} onSaved={vi.fn()} onCancel={vi.fn()} />);

      fill('Title', 'Evening Flow');
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('This class has already started');
    });

    it('does not call the API when nothing changed', () => {
      render(<SessionForm session={session} onSaved={vi.fn()} onCancel={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Nothing changed yet.');
      expect(updateSession).not.toHaveBeenCalled();
    });
  });
});
