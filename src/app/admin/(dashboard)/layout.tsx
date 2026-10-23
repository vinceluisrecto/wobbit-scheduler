import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' } };

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
