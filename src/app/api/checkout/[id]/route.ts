import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checkoutId } = await params;
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
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', authUser.id)
      .single();

    const userCredits = profileData?.credits || 0;

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

