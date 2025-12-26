/**
 * API Endpoint: POST /api/vendor/payouts/schedule
 * 
 * System/Admin endpoint to schedule monthly payouts for all eligible vendors.
 * Should be called by a cron job on the 1st of each month.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVendorCreditBalance, scheduleVendorPayout, getMinimumPayoutThreshold } from '@/domains/payments';

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
    const minimumThreshold = getMinimumPayoutThreshold();

    // Get all vendors with Stripe accounts that are active
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendor_stripe_accounts')
      .select('vendor_id, stripe_account_id')
      .eq('account_status', 'active')
      .eq('onboarding_completed', true);

    if (vendorsError) {
      console.error('Failed to get vendors:', vendorsError);
      return NextResponse.json(
        { error: 'Failed to get vendors' },
        { status: 500 }
      );
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active vendors found',
        scheduled: 0,
      });
    }

    const scheduledDate = new Date(); // Today (1st of the month)
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each vendor
    for (const vendor of vendors) {
      try {
        // Get vendor's available balance
        const { balance, error: balanceError } = await getVendorCreditBalance(vendor.vendor_id);

        if (balanceError) {
          console.error(`Failed to get balance for vendor ${vendor.vendor_id}:`, balanceError);
          errorCount++;
          results.push({
            vendor_id: vendor.vendor_id,
            success: false,
            error: balanceError,
          });
          continue;
        }

        // Skip if balance is below minimum threshold
        if (balance < minimumThreshold) {
          results.push({
            vendor_id: vendor.vendor_id,
            success: false,
            skipped: true,
            reason: 'Below minimum threshold',
            balance,
            threshold: minimumThreshold,
          });
          continue;
        }

        // Schedule payout for the entire available balance
        const { payoutId, error: scheduleError } = await scheduleVendorPayout(
          vendor.vendor_id,
          balance,
          scheduledDate
        );

        if (scheduleError || !payoutId) {
          console.error(`Failed to schedule payout for vendor ${vendor.vendor_id}:`, scheduleError);
          errorCount++;
          results.push({
            vendor_id: vendor.vendor_id,
            success: false,
            error: scheduleError,
          });
          continue;
        }

        successCount++;
        results.push({
          vendor_id: vendor.vendor_id,
          success: true,
          payout_id: payoutId,
          amount: balance,
        });

        console.log(`Scheduled payout for vendor ${vendor.vendor_id}: ${balance} credits`);

      } catch (error) {
        console.error(`Error processing vendor ${vendor.vendor_id}:`, error);
        errorCount++;
        results.push({
          vendor_id: vendor.vendor_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary to audit
    await supabase
      .from('audit_logs')
      .insert({
        action: 'vendor_payouts_scheduled',
        resource_type: 'vendor_payouts',
        metadata: {
          total_vendors: vendors.length,
          successful: successCount,
          errors: errorCount,
          scheduled_date: scheduledDate.toISOString(),
          minimum_threshold: minimumThreshold,
        },
      });

    return NextResponse.json({
      success: true,
      summary: {
        totalVendors: vendors.length,
        scheduled: successCount,
        errors: errorCount,
        scheduledDate: scheduledDate.toISOString(),
      },
      results,
    });

  } catch (error) {
    console.error('Error in /api/vendor/payouts/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


