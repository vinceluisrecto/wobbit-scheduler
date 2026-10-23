import type { Metadata } from 'next';
import { AdminLoginForm, type AdminLoginReason } from '@/components/admin';

export const metadata: Metadata = { title: 'Admin login' };

const reasons: AdminLoginReason[] = ['forbidden', 'expired'];

export default async function AdminLoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const { reason } = await searchParams;
  const knownReason = reasons.find((item) => item === reason);
  return <AdminLoginForm reason={knownReason} />;
}
