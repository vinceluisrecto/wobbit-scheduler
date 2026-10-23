import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth';

export const metadata: Metadata = { title: 'Reset password' };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === 'string' ? token : undefined} />;
}
