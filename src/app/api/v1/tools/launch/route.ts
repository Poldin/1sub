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

    // Parse request body
    const { toolId } = await req.json();
    
    if (!toolId) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Create short-lived access token for this specific tool launch
    const claims: TokenClaims = {
      sub: user.id,
      email: user.email || '',
      scope: ['api:access'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour (shorter than before)
    };

    // Generate JWT token
    const token = await mintJwt(claims);
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString();

    // For now, we'll return a mock launch URL since we don't have real tool URLs
    // In a real implementation, this would look up the tool's actual URL from the database
    const launchUrl = `https://example-tool-${toolId}.com?token=${token}&userId=${user.id}`;

    return NextResponse.json({
      launchUrl,
      accessToken: token,
      expiresAt,
      userId: user.id,
      toolId,
    });
  } catch (error) {
    console.error('Error launching tool:', error);
    return NextResponse.json(
      { error: 'Failed to launch tool' },
      { status: 500 }
    );
  }
}
