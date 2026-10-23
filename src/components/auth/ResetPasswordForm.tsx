'use client';

import { useState, type FormEvent } from 'react';
import { resetPassword } from '@/api/auth';
import { isApiError } from '@/api/client';
import { Button, Input, Notice, TextLink } from '@/components/ui';
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '@/utils/validate-auth-fields';
import { AuthCard } from './AuthCard';

export interface ResetPasswordFormProps {
  /** The token from the emailed link (`?token=`). */
  token?: string;
}

type ResetState = 'form' | 'done' | 'invalid-token';

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<ResetState>(token ? 'form' : 'invalid-token');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateNewPassword(password);
    setPasswordError(error);
    setFormError(null);
    if (error || !token) return;

    setIsLoading(true);
    try {
      await resetPassword({ token, password });
      setState('done');
    } catch (apiError) {
      if (isApiError(apiError, 'INVALID_RESET_TOKEN')) {
        setState('invalid-token');
      } else if (isApiError(apiError, 'VALIDATION_ERROR') && apiError.details?.password) {
        setPasswordError(apiError.details.password);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (state === 'done') {
    return (
      <AuthCard title="All set">
        <div className="flex flex-col gap-4">
          <Notice tone="success">Password updated, please log in</Notice>
          <Button href="/login" size="lg" fullWidth>
            Log in
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (state === 'invalid-token') {
    return (
      <AuthCard title="Link not valid">
        <div className="flex flex-col gap-4">
          <Notice tone="warning">This link has expired or was already used</Notice>
          <Button href="/forgot-password" size="lg" fullWidth>
            Get a new link
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="You'll be logged out everywhere else."
      footer={<TextLink href="/login">Back to log in</TextLink>}
    >
      <form method="post" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Notice tone="danger">{formError}</Notice>}
        <Input
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          required
        />
        <Button type="submit" size="lg" fullWidth isLoading={isLoading} loadingLabel="Saving…">
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
