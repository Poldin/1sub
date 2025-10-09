import { NextRequest, NextResponse } from 'next/server';
import { consumeCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const { userId, amount, reason } = await req.json().catch(() => ({}));
    if (!userId || typeof amount !== 'number') {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'userId and amount required' } },
        { status: 400 }
      );
    }

    const entry = await consumeCredits(userId, amount, reason);
    return NextResponse.json({ ok: true, data: { entry } });
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    if (message.includes('Insufficient credits')) {
      return NextResponse.json(
        { ok: false, error: { code: 'INSUFFICIENT_CREDITS', message } },
        { status: 400 }
      );
    }
    if (message.includes('already processed')) {
      return NextResponse.json(
        { ok: false, error: { code: 'DUPLICATE_TRANSACTION', message } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}


