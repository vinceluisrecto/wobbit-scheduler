import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';

const { push, signup } = vi.hoisted(() => ({ push: vi.fn(), signup: vi.fn() }));
const router = { push, replace: vi.fn(), refresh: vi.fn() }; // stable, like Next's real router
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/api/auth', () => ({ signup }));

const { SignupForm } = await import('@/components/auth');

function fill(name: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignupForm', () => {
  it('validates name, email and password length', () => {
    render(<SignupForm />);
    fill('', 'maya@', 'short');

    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter your name');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters Use at least 8 characters',
    );
    expect(signup).not.toHaveBeenCalled();
  });

  it('signs up and follows ?next=', async () => {
    signup.mockResolvedValue({ id: 'u1' });
    render(<SignupForm next="/sessions/abc" />);

    fill(' Maya ', 'maya@example.com', 'long-enough');

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/sessions/abc'));
    expect(signup).toHaveBeenCalledWith({ name: 'Maya', email: 'maya@example.com', password: 'long-enough' });
  });

  it('says when the email already has an account', async () => {
    signup.mockRejectedValue(new ApiError('EMAIL_TAKEN', 'Taken', 409));
    render(<SignupForm />);

    fill('Maya', 'maya@example.com', 'long-enough');

    expect(await screen.findByText('That email already has an account')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in instead' })).toHaveAttribute('href', '/login');
    expect(push).not.toHaveBeenCalled();
  });

  it('shows server field errors next to their fields', async () => {
    signup.mockRejectedValue(new ApiError('VALIDATION_ERROR', 'Invalid', 400, { name: 'Name must be 1 to 100 characters' }));
    render(<SignupForm />);

    fill('Maya', 'maya@example.com', 'long-enough');

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name must be 1 to 100 characters'),
    );
  });
});
