import { requireSession } from '@/lib/auth';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  const user = await requireSession();
  return <ProfileClient initialUser={user} />;
}
