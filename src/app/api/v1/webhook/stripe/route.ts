import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  // Placeholder: handle Stripe webhook events with verification later
  return NextResponse.json({ received: true });
}


