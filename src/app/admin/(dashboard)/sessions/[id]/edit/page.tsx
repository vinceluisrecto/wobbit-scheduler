import type { Metadata } from 'next';
import { AdminSessionFormPage } from '@/components/admin';

export const metadata: Metadata = { title: 'Edit class' };

export default async function EditSessionPage({ params }: PageProps<'/admin/sessions/[id]/edit'>) {
  const { id } = await params;
  return <AdminSessionFormPage sessionId={id} />;
}
