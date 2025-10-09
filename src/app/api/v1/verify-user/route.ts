import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.substring(7);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the JWT token
    const claims = await verifyJwt(token);
    
    // Return simplified user verification response
    return NextResponse.json({
      userId: claims.sub,
      email: claims.email,
      verified: true,
    });
  } catch (error) {
    console.error('User verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

