import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
