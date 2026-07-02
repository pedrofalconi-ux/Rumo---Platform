import { NextResponse } from 'next/server';
import { getCurrentUser, getSessionIdFromRequest } from '../../../../lib/server-auth';

export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user,
    session: {
      id: getSessionIdFromRequest(request) || null,
    },
  });
}
