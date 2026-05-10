import { redirect } from 'next/navigation';

// /admin/users is just a friendly URL — the existing /admin page has a
// Members tab that's the actual UI. Redirecting keeps the sidebar nav simple
// without duplicating the table.
export default function AdminUsersRedirect() {
  redirect('/admin?tab=members');
}
