import { redirect } from 'next/navigation';

// The admin landing page is the schedule (§4.2): no separate dashboard.
export default function AdminPage() {
  redirect('/admin/sessions');
}
