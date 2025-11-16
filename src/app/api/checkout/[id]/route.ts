import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateCreditsFromTransactions } from '@/lib/credits';
import { secureLog } from '@/lib/secure-logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checkoutId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch checkout record
    const { data: checkoutData, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', checkoutId)
      .single();

    if (checkoutError || !checkoutData) {
      return NextResponse.json(
        { error: 'Checkout not found' },
        { status: 404 }
      );
    }

    secureLog.debug('[DEBUG][checkout/get] Request context', {
      authUserId: authUser.id,
      authEmail: authUser.email,
      checkoutId: checkoutId,
      checkoutUserId: checkoutData.user_id,
      vendorId: checkoutData.vendor_id,
    });

    // Verify user owns this checkout
    if (checkoutData.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this checkout' },
        { status: 403 }
      );
    }

    // Fetch tool details (logo, description)
    let toolData = null;
    if (checkoutData.metadata.tool_id) {
      const { data, error: toolError } = await supabase
        .from('tools')
        .select('metadata, description')
        .eq('id', checkoutData.metadata.tool_id)
        .single();

      if (!toolError && data) {
        const metadata = data.metadata as Record<string, unknown> | null;
        const uiMetadata = metadata?.ui as Record<string, unknown> | undefined;
        toolData = {
          logo_url: (uiMetadata?.logo_url as string) || (uiMetadata?.hero_image_url as string) || null,
          description: data.description,
        };
      }
    }

    // Fetch vendor information if vendor_id exists
    let vendorData = null;
    if (checkoutData.vendor_id) {
      const { data, error: vendorError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', checkoutData.vendor_id)
        .single();

      if (!vendorError && data) {
        vendorData = data;
      }
    }

    // Fetch user profile with credits
    // Calculate credits from transactions (source of truth)
    const { data: creditTransactions, error: creditError } = await supabase
      .from('credit_transactions')
      .select('credits_amount, type')
      .eq('user_id', authUser.id);

    if (creditError) {
      console.error('[ERROR][checkout/get] Failed to fetch credit transactions', {
        error: creditError,
        authUserId: authUser.id,
      });
    }

    const userCredits = calculateCreditsFromTransactions(creditTransactions || []);

    return NextResponse.json({
      checkout: checkoutData,
      tool: toolData,
      vendor: vendorData,
      user: {
        id: authUser.id,
        email: authUser.email,
        credits: userCredits,
      },
    });

  } catch (error) {
    console.error('Error fetching checkout data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

