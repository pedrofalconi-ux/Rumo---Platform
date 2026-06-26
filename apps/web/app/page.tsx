import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/server-auth';

export default async function Home() {
  const user = await getCurrentUser();
  if (user?.role === 'traveler') {
    redirect('/app/trips');
  }
  redirect(user ? '/dashboard' : '/login');
}
