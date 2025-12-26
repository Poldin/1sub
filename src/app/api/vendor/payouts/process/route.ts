/**
 * API Endpoint: POST /api/vendor/payouts/process
 * 
 * System/Admin endpoint to process scheduled payouts.
 * Should be called daily by a cron job to process payouts scheduled for today.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processVendorPayout } from '@/domains/payments';

// Initialize Supabase with service role
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is an admin/system request
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();

    // Get all scheduled payouts that are due today or earlier
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const { data: scheduledPayouts, error: payoutsError } = await supabase
      .from('vendor_payouts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_date', today.toISOString())
      .order('scheduled_date', { ascending: true });

    if (payoutsError) {
      console.error('Failed to get scheduled payouts:', payoutsError);
      return NextResponse.json(
        { error: 'Failed to get scheduled payouts' },
        { status: 500 }
      );
    }

    if (!scheduledPayouts || scheduledPayouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No payouts scheduled for processing',
        processed: 0,
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each payout
    for (const payout of scheduledPayouts) {
      try {
        const { success, error: processError } = await processVendorPayout(payout.id);

        if (!success) {
          console.error(`Failed to process payout ${payout.id}:`, processError);
          errorCount++;
          results.push({
            payout_id: payout.id,
            vendor_id: payout.vendor_id,
            success: false,
            error: processError,
          });
          continue;
        }

        successCount++;
        results.push({
          payout_id: payout.id,
          vendor_id: payout.vendor_id,
          success: true,
          amount: payout.euro_amount,
        });

        console.log(`Processed payout ${payout.id} for vendor ${payout.vendor_id}: €${payout.euro_amount}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing payout ${payout.id}:`, error);
        errorCount++;
        results.push({
          payout_id: payout.id,
          vendor_id: payout.vendor_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary to audit
    await supabase
      .from('audit_logs')
      .insert({
        action: 'vendor_payouts_processed',
        resource_type: 'vendor_payouts',
        metadata: {
          total_payouts: scheduledPayouts.length,
          successful: successCount,
          errors: errorCount,
          processed_date: new Date().toISOString(),
        },
      });

    return NextResponse.json({
      success: true,
      summary: {
        totalPayouts: scheduledPayouts.length,
        processed: successCount,
        errors: errorCount,
        processedDate: new Date().toISOString(),
      },
      results,
    });

  } catch (error) {
    console.error('Error in /api/vendor/payouts/process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


