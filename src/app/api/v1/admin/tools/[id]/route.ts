import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { auditToolOperation } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('tools')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
      }
      console.error('Error fetching tool:', error);
      return NextResponse.json({ error: 'Failed to fetch tool' }, { status: 500 });
    }

    return NextResponse.json({ tool: data });
  } catch (error) {
    console.error('Error in tool GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, url, credit_cost_per_use, is_active, metadata } = body;

    // Validate credit cost if provided
    if (credit_cost_per_use !== undefined && credit_cost_per_use < 0) {
      return NextResponse.json({ 
        error: 'Credit cost must be non-negative' 
      }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (url !== undefined) updateData.url = url;
    if (credit_cost_per_use !== undefined) updateData.credit_cost_per_use = parseFloat(credit_cost_per_use);
    if (is_active !== undefined) updateData.is_active = is_active;
    if (metadata !== undefined) updateData.metadata = metadata;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('tools')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
      }
      console.error('Error updating tool:', error);
      return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
    }

    // Log audit trail
    await auditToolOperation('UPDATE', params.id, undefined, data, req);

    return NextResponse.json({ tool: data });
  } catch (error) {
    console.error('Error in tool PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabaseAdmin
      .from('tools')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
      }
      console.error('Error deleting tool:', error);
      return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
    }

    // Log audit trail
    await auditToolOperation('DELETE', params.id, undefined, data, req);

    return NextResponse.json({ message: 'Tool deactivated successfully', tool: data });
  } catch (error) {
    console.error('Error in tool DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
