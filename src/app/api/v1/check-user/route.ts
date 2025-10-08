import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'email required' } }, { status: 400 });
  // Placeholder: lookup user existence
  return NextResponse.json({ ok: true, data: { exists: false } });
}


