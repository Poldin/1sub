import { NextRequest, NextResponse } from 'next/server';
import { grantCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  const { userId, amount, reason } = await req.json().catch(() => ({}));
  if (!userId || typeof amount !== 'number') {
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'userId and amount required' } }, { status: 400 });
  }
  const entry = await grantCredits(userId, amount, reason);
  return NextResponse.json({ ok: true, data: { entry } });
}


