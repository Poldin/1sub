import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify JWT token
    try {
      const claims = await verifyJwt(token);
      
      return NextResponse.json({
        valid: true,
        userId: claims.sub,
        email: claims.email,
        scope: claims.scope,
        issuedAt: claims.iat,
        expiresAt: claims.exp
      });
    } catch (jwtError: unknown) {
      return NextResponse.json({
        valid: false,
        error: jwtError instanceof Error ? jwtError.message : 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
