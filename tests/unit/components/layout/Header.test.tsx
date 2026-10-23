import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push, getMe, logout, pathname } = vi.hoisted(() => ({
  push: vi.fn(),
  getMe: vi.fn(),
  logout: vi.fn(),
  pathname: { value: '/sessions' },
}));
const router = { push, replace: vi.fn(), refresh: vi.fn() }; // stable, like Next's real router
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => pathname.value,
}));
vi.mock('@/api/auth', () => ({ getMe, logout }));

const { Header } = await import('@/components/layout');

beforeEach(() => {
  vi.clearAllMocks();
  pathname.value = '/sessions';
});

describe('Header', () => {
  it('logged out: shows "Log in" that comes back to the current page', async () => {
    getMe.mockResolvedValue(null);
    render(<Header />);

    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Fsessions');
    expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute('aria-current', 'page');
  });

  it('logged in: shows My bookings and logs out', async () => {
    getMe.mockResolvedValue({ id: 'u1', name: 'Maya', email: 'maya@example.com', role: 'member' });
    logout.mockResolvedValue(undefined);
    render(<Header />);

    expect(await screen.findByRole('link', { name: 'My bookings' })).toHaveAttribute('href', '/account');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(logout).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('/');
  });

  it('has no admin links', async () => {
    getMe.mockResolvedValue({ id: 'a1', name: 'Admin', email: 'admin@studio.local', role: 'admin' });
    render(<Header />);

    await screen.findByRole('link', { name: 'My bookings' });
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });
});
