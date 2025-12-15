import { NextResponse } from 'next/server';

/**
 * DEPRECATED: JWKS endpoint - JWT authentication has been removed
 *
 * This endpoint is no longer in use. 1Sub now uses email-based verification
 * and link codes instead of JWT tokens.
 *
 * This file exists only to satisfy Next.js build requirements during migration.
 * Will be removed in a future update.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint has been deprecated',
      message: 'JWT authentication is no longer supported. Please use email-based verification or link codes instead.',
      migration_guide: 'https://1sub.io/docs/concepts/authentication'
    },
    { status: 410 } // 410 Gone
  );
}
