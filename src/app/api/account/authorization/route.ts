import { NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/authorization';

export async function GET() {
  const context = await getAuthorizationContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(context);
}
