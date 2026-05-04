import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin · Applications',
  description: 'Review job applications and AI screening results',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
