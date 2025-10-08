import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: undefined }));
  if (!token) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'token required' } }, { status: 400 });
  try {
    const claims = await verifyJwt(token);
    return NextResponse.json({ ok: true, data: { claims } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_TOKEN', message: 'verification failed' } }, { status: 401 });
  }
}


