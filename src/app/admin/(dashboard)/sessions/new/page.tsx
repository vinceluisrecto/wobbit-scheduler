import type { Metadata } from 'next';
import { AdminSessionFormPage } from '@/components/admin';

export const metadata: Metadata = { title: 'New class' };

export default function NewSessionPage() {
  return <AdminSessionFormPage />;
}
