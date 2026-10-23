import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSchedule } from '@/components/admin';

export const metadata: Metadata = { title: 'Schedule' };

export default function AdminSessionsPage() {
  // AdminSchedule reads the query string (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <AdminSchedule />
    </Suspense>
  );
}
