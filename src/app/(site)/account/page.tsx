import type { Metadata } from 'next';
import { AccountView } from '@/components/account';

export const metadata: Metadata = { title: 'My bookings' };

export default function AccountPage() {
  return <AccountView />;
}
