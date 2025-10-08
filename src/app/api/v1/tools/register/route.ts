import { NextRequest, NextResponse } from 'next/server';
import { registerTool } from '@/lib/tools';
import { registerToolSchema } from '@/lib/zodSchemas';

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = registerToolSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid payload' } }, { status: 400 });
  }
  const tool = await registerTool(parsed.data);
  return NextResponse.json({ ok: true, data: { tool } });
}


