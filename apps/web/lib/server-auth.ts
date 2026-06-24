import { cookies } from 'next/headers';
import { db } from '@rumo/db';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('rumo_session')?.value;
  return db.auth.me(sessionId);
}
