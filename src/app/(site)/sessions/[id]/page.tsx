import type { Metadata } from 'next';
import { SessionDetail } from '@/components/sessions';

export const metadata: Metadata = { title: 'Class' };

export default async function SessionPage({ params }: PageProps<'/sessions/[id]'>) {
  const { id } = await params;
  return <SessionDetail sessionId={id} />;
}
