'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { login } from '@/api/auth';
import { isApiError } from '@/api/client';
import { Button, Input, Notice, TextLink } from '@/components/ui';
import { safeNextPath } from '@/utils/safe-next-path';
import { compactErrors, validateEmail, type AuthFieldErrors } from '@/utils/validate-auth-fields';
import { AuthCard } from './AuthCard';

export interface LoginFormProps {
  /** Where to go after logging in (the `?next=` query). */
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = safeNextPath(next);
  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(nextPath)}` : path);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = compactErrors({
      email: validateEmail(email),
      password: password.length === 0 ? 'Enter your password' : undefined,
    });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.push(nextPath);
      return; // stay in the loading state while the next page opens
    } catch (error) {
      if (isApiError(error, 'INVALID_CREDENTIALS')) {
        setFormError('Email or password is incorrect');
      } else if (isApiError(error, 'VALIDATION_ERROR') && error.details) {
        setFieldErrors(error.details);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
    setIsLoading(false);
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to book your spot."
      footer={
        <>
          New here? <TextLink href={withNext('/signup')}>Create an account</TextLink>
        </>
      }
    >
      {/* method="post": if Enter is pressed before hydration, the native submit never puts the password in the URL. */}
      <form method="post" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Notice tone="danger">{formError}</Notice>}
        <Input
          label="Email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />
        <div className="-mt-2 flex justify-end">
          <TextLink href="/forgot-password">Forgot password?</TextLink>
        </div>
        <Button type="submit" size="lg" fullWidth isLoading={isLoading} loadingLabel="Logging in…">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
