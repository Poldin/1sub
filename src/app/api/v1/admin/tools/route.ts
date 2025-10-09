import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { auditToolOperation } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('is_active');

    // Build query
    let query = supabaseAdmin
      .from('tools')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tools:', error);
      return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
    }

    return NextResponse.json({
      tools: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in tools GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, url, credit_cost_per_use, is_active, metadata } = body;

    // Validate required fields
    if (!name || !url || credit_cost_per_use === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, url, credit_cost_per_use' 
      }, { status: 400 });
    }

    // Validate credit cost
    if (credit_cost_per_use < 0) {
      return NextResponse.json({ 
        error: 'Credit cost must be non-negative' 
      }, { status: 400 });
    }

    // Create tool
    const { data, error } = await supabaseAdmin
      .from('tools')
      .insert({
        name,
        description: description || '',
        url,
        credit_cost_per_use: parseFloat(credit_cost_per_use),
        is_active: is_active !== undefined ? is_active : true,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tool:', error);
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }

    // Log audit trail
    await auditToolOperation('CREATE', data.id, undefined, data, req);

    return NextResponse.json({ tool: data }, { status: 201 });
  } catch (error) {
    console.error('Error in tools POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
