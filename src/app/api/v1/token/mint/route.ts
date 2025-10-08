import { NextRequest, NextResponse } from 'next/server';
import { mintJwt } from '@/lib/tokens';
import { mintTokenSchema } from '@/lib/zodSchemas';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = mintTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload' } }, { status: 400 });
  }
  const token = await mintJwt(parsed.data);
  return NextResponse.json({ ok: true, data: { token } });
}


