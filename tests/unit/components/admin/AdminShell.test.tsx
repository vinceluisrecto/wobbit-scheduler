import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMe, logout } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AdminShell } from '@/components/admin';
import { router, setUrl } from './navigation-mock';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/auth', () => ({ getMe: vi.fn(), logout: vi.fn() }));

const admin = { id: 'a1', name: 'Studio Owner', email: 'owner@example.com', role: 'admin' as const };
const member = { id: 'm1', name: 'Maya Santos', email: 'maya@example.com', role: 'member' as const };

function renderShell() {
  return render(
    <AdminShell>
      <p>Schedule content</p>
    </AdminShell>,
  );
}

describe('AdminShell (guard)', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset();
    vi.mocked(logout).mockReset();
    router.replace.mockReset();
    router.push.mockReset();
    setUrl('/admin/sessions');
  });

  it('shows a loading state until /auth/me answers, then the page for an admin', async () => {
    vi.mocked(getMe).mockResolvedValue(admin);
    renderShell();

    expect(screen.getByText('Checking your account…')).toBeInTheDocument();
    expect(screen.queryByText('Schedule content')).not.toBeInTheDocument();
    expect(await screen.findByText('Schedule content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New class' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search classes and members' })).toBeInTheDocument();
  });

  it('sends a logged-out visitor (401) to the admin login', async () => {
    vi.mocked(getMe).mockResolvedValue(null);
    renderShell();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
    expect(screen.queryByText('Schedule content')).not.toBeInTheDocument();
  });

  it('sends a member to the admin login with a message', async () => {
    vi.mocked(getMe).mockResolvedValue(member);
    renderShell();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login?reason=forbidden'));
    expect(screen.queryByText('Schedule content')).not.toBeInTheDocument();
  });

  it('sends a 403 to the admin login with a message', async () => {
    vi.mocked(getMe).mockRejectedValue(new ApiError('FORBIDDEN', 'Forbidden', 403));
    renderShell();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login?reason=forbidden'));
  });

  it('opens the new-class form through the URL from the header', async () => {
    vi.mocked(getMe).mockResolvedValue(admin);
    renderShell();

    fireEvent.click(await screen.findByRole('button', { name: '+ New class' }));

    expect(window.location.search).toBe('?new=1');
  });

  it('writes the search to the URL as you type', async () => {
    vi.mocked(getMe).mockResolvedValue(admin);
    renderShell();

    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'maya' } });

    expect(window.location.search).toBe('?q=maya');
  });

  it('logs out and returns to the admin login', async () => {
    vi.mocked(getMe).mockResolvedValue(admin);
    vi.mocked(logout).mockResolvedValue(undefined);
    renderShell();

    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
    expect(logout).toHaveBeenCalled();
  });
});
