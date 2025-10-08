import { NextRequest, NextResponse } from 'next/server';
import { mintJwt, TokenClaims } from '@/lib/tokens';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract the session token
    const sessionToken = authHeader.substring(7);
    
    // Verify the session with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(sessionToken);
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Create token claims
    const claims: TokenClaims = {
      sub: user.id,
      email: user.email || '',
      scope: ['api:access'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    // Generate JWT token
    const token = await mintJwt(claims);
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString();

    return NextResponse.json({
      token,
      expiresAt,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error minting token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}


