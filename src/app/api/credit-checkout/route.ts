import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, toolId } = await request.json();

    if (!userId || !toolId) {
      return NextResponse.json(
        { error: 'Missing userId or toolId' },
        { status: 400 }
      );
    }

    // Fetch tool details
    const { data: tool, error: toolError } = await supabase
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

    // Get user's current credit balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current balance from credit_transactions
    const { data: latestTransaction, error: balanceError } = await supabase
      .from('credit_transactions')
      .select('balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentBalance = latestTransaction?.balance_after || 0;
    const creditCost = tool.credit_cost_per_use || 0;

    // Validate sufficient credits
    if (currentBalance < creditCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          currentBalance,
          requiredCredits: creditCost,
          shortfall: creditCost - currentBalance
        },
        { status: 400 }
      );
    }

    // Generate idempotency key
    const idempotencyKey = `tool_${toolId}_${userId}_${Date.now()}`;

    // Consume credits using RPC function
    const { data: consumeResult, error: consumeError } = await supabase
      .rpc('consume_credits', {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: `Tool usage: ${tool.name}`,
        p_idempotency_key: idempotencyKey
      });

    if (consumeError) {
      console.error('Error consuming credits:', consumeError);
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      );
    }

    // Create usage log
    const { error: usageLogError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        tool_id: toolId,
        credits_consumed: creditCost,
        status: 'pending',
        metadata: {
          tool_name: tool.name,
          checkout_timestamp: new Date().toISOString()
        }
      });

    if (usageLogError) {
      console.error('Error creating usage log:', usageLogError);
      // Don't fail the request, just log the error
    }

    // Generate short-lived access token (1 hour)
    const accessToken = jwt.sign(
      { 
        userId, 
        toolId, 
        type: 'tool_access',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' }
    );

    // Get new balance after deduction
    const { data: newTransaction } = await supabase
      .from('credit_transactions')
      .select('balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const newBalance = newTransaction?.balance_after || currentBalance - creditCost;

    return NextResponse.json({
      success: true,
      newBalance,
      toolUrl: tool.url,
      accessToken,
      tool: {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        creditCost
      }
    });

  } catch (error) {
    console.error('Credit checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
