import type { Metadata } from 'next';
import { AdminSessionDetail } from '@/components/admin';

export const metadata: Metadata = { title: 'Class' };

export default async function AdminSessionPage({ params }: PageProps<'/admin/sessions/[id]'>) {
  const { id } = await params;
  return <AdminSessionDetail sessionId={id} />;
}
