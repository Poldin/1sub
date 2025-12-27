/**
 * API Endpoint: /api/vendor/tools/[id]/update
 *
 * Update an existing tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database';
import { updateTool } from '@/domains/tools';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: toolId } = await context.params;
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: tool, error: fetchError } = await supabase
      .from('tools')
      .select('vendor_id')
      .eq('id', toolId)
      .single();

    if (fetchError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    if (tool.vendor_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this tool' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Map frontend fields to schema fields
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.short_description = body.description;
    if (body.longDescription !== undefined) updates.description = body.longDescription;
    if (body.toolExternalUrl !== undefined) updates.website_url = body.toolExternalUrl;
    if (body.logoUrl !== undefined) updates.icon_url = body.logoUrl;
    if (body.heroImageUrl !== undefined) updates.cover_image_url = body.heroImageUrl;
    if (body.category !== undefined) updates.category = body.category;
    if (body.status !== undefined) updates.status = body.status;

    // Update metadata
    if (
      body.emoji !== undefined ||
      body.tags !== undefined ||
      body.discountPercentage !== undefined ||
      body.customPricingEmail !== undefined ||
      body.longDescription !== undefined
    ) {
      updates.metadata = {
        ui: {
          emoji: body.emoji,
          tags: body.tags,
          discount_percentage: body.discountPercentage,
        },
        content: {
          long_description: body.longDescription,
        },
        custom_pricing_email: body.customPricingEmail,
      };
    }

    // Perform update
    const result = await updateTool(toolId, updates);

    if (!result.success) {
      console.error('Tool update failed:', result.error);
      return NextResponse.json(
        { error: `Failed to update tool: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tool: result.tool,
      message: 'Tool updated successfully',
    });
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
