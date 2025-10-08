import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({ token: undefined }));
    
    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const claims = await verifyJwt(token);
    
    return NextResponse.json({
      valid: true,
      userId: claims.sub,
      email: claims.email,
      scope: claims.scope,
      issuedAt: claims.iat,
      expiresAt: claims.exp,
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json(
      { valid: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}


