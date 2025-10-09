import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    console.log('API: Starting tools fetch...');
    
    // Test basic connection first
    const { data: testData, error: testError } = await supabaseAdmin
      .from('tools')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('API: Database connection test failed:', testError);
      return NextResponse.json({ error: 'Database connection failed', details: testError.message }, { status: 500 });
    }
    
    console.log('API: Database connection OK, fetching tools...');
    
    const { data, error } = await supabaseAdmin
      .from('tools')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('API: Error fetching tools:', error);
      return NextResponse.json({ error: 'Failed to fetch tools', details: error.message }, { status: 500 });
    }

    console.log('API: Successfully fetched tools:', data?.length || 0);
    return NextResponse.json({ tools: data || [] });
  } catch (error) {
    console.error('API: Unexpected error in tools GET:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}