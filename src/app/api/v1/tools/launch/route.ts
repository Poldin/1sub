import { NextRequest, NextResponse } from 'next/server';
import { mintJwt, TokenClaims } from '@/lib/tokens';
import { supabaseClient } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCreditBalance, consumeCredits } from '@/lib/credits';

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

    // Fetch tool from database
    const { data: tool, error: toolError } = await supabaseAdmin
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .eq('is_active', true)
      .single();

    if (toolError || !tool) {
      return NextResponse.json(
        { error: 'Tool not found or inactive' },
        { status: 404 }
      );
    }

    // Check user has sufficient credits
    const currentBalance = await getCreditBalance(user.id);
    if (currentBalance.balance < tool.credit_cost_per_use) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          balance: currentBalance.balance,
          required: tool.credit_cost_per_use
        },
        { status: 400 }
      );
    }

    // Generate idempotency key for this launch
    const idempotencyKey = `launch_${user.id}_${toolId}_${Date.now()}`;

    // Consume credits atomically
    try {
      await consumeCredits(
        user.id, 
        tool.credit_cost_per_use, 
        `Tool launch: ${tool.name}`,
        idempotencyKey
      );
    } catch (creditError: unknown) {
      if (creditError instanceof Error && creditError.message.includes('Insufficient credits')) {
        return NextResponse.json(
          { 
            error: 'Insufficient credits',
            balance: currentBalance.balance,
            required: tool.credit_cost_per_use
          },
          { status: 400 }
        );
      }
      if (creditError instanceof Error && creditError.message.includes('already processed')) {
        return NextResponse.json(
          { error: 'Launch request already processed' },
          { status: 409 }
        );
      }
      throw creditError;
    }

    // Log usage
    await supabaseAdmin.from('usage_logs').insert({
      user_id: user.id,
      tool_id: toolId,
      credits_consumed: tool.credit_cost_per_use,
      status: 'success',
      metadata: { 
        launch_url: tool.url,
        tool_name: tool.name,
        timestamp: new Date().toISOString()
      }
    });

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

    // Build launch URL with token appended
    const launchUrl = `${tool.url}?token=${token}&userId=${user.id}`;

    return NextResponse.json({
      launchUrl,
      accessToken: token,
      expiresAt,
      userId: user.id,
      toolId,
      toolName: tool.name,
      creditsConsumed: tool.credit_cost_per_use
    });
  } catch (error) {
    console.error('Error launching tool:', error);
    return NextResponse.json(
      { error: 'Failed to launch tool' },
      { status: 500 }
    );
  }
}

